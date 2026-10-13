#requires -Version 5.1
<#
.SYNOPSIS
Primer despliegue de reservas en un cluster kind existente.
.DESCRIPTION
No instala Docker ni kind. No reemplaza credenciales ni una API existente.
Usar un tag local versionado. No ejecuta operaciones Git.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory=$true)] [string]$SecretsFile,
    [ValidatePattern('^[a-z][a-z0-9-]{0,29}$')]
    [string]$ClusterName = 'seminario',
    [ValidatePattern('^seminario-reservas:[A-Za-z0-9._-]+$')]
    [string]$Image = 'seminario-reservas:1.0.0',
    [string]$Kubeconfig = (Join-Path $env:LOCALAPPDATA 'SeminarioKubernetes\seminario\kubeconfig.yaml'),
    [string]$RuntimeDirectory = (Join-Path $env:LOCALAPPDATA 'SeminarioKubernetes\deploy-reservas'),
    [switch]$UseExistingSecret
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
foreach ($name in @('docker','kind','kubectl')) {
    if (-not (Get-Command $name -CommandType Application -ErrorAction SilentlyContinue)) {
        throw "Falta herramienta: $name"
    }
}
foreach ($file in @($Kubeconfig,$SecretsFile)) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Falta archivo requerido: $file" }
}
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$app = Join-Path $repo 'aplicacion'
$base = Join-Path $app 'kubernetes\base.yaml'
if (-not (Test-Path -LiteralPath $base)) { throw 'No existe la base YAML de DOC-04-01.' }
$runtime = [IO.Path]::GetFullPath($RuntimeDirectory)
$prefix = $repo.TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar
if ($runtime.Equals($repo,[StringComparison]::OrdinalIgnoreCase) -or $runtime.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)) {
    throw 'El directorio de ejecucion debe quedar fuera del repositorio.'
}
$argsKube = @('--kubeconfig',$Kubeconfig,'--context',"kind-$ClusterName")
$dockerOS = & docker info --format '{{.OSType}}'
if ($LASTEXITCODE -ne 0 -or "$dockerOS".Trim() -ne 'linux') { throw 'Docker Linux no accesible.' }
& kubectl @argsKube wait --for=condition=Ready nodes --all --timeout=60s
if ($LASTEXITCODE -ne 0) { throw 'Cluster kind no preparado.' }
$ns = & kubectl @argsKube get namespace seminario --ignore-not-found -o name
if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar Namespace.' }
if ($ns) {
    $existing = & kubectl @argsKube -n seminario get deployment reservas-api --ignore-not-found -o name
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo comprobar el despliegue existente.' }
    if ($existing) { throw 'La API ya existe; este script solo realiza el primer despliegue.' }
    $secret = & kubectl @argsKube -n seminario get secret reservas-config --ignore-not-found -o name
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar el Secret.' }
    if ($secret -and -not $UseExistingSecret) { throw 'Secret existente: revisar y usar UseExistingSecret para conservarlo.' }
} else { $secret = $null }
if ($PSCmdlet.ShouldProcess("kind-$ClusterName",'Construir imagen y realizar primer despliegue de reservas')) {
    & docker build -t $Image $app
    if ($LASTEXITCODE -ne 0) { throw 'Fallo la construccion.' }
    $providerBefore = $env:KIND_EXPERIMENTAL_PROVIDER
    try {
        $env:KIND_EXPERIMENTAL_PROVIDER = 'docker'
        & kind load docker-image $Image --name $ClusterName
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo cargar la imagen en kind.' }
    } finally {
        if ($null -eq $providerBefore) {
            Remove-Item Env:KIND_EXPERIMENTAL_PROVIDER -ErrorAction SilentlyContinue -WhatIf:$false -Confirm:$false
        } else { $env:KIND_EXPERIMENTAL_PROVIDER = $providerBefore }
    }
    if (-not $ns) {
        & kubectl @argsKube create namespace seminario
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear Namespace.' }
    }
    if (-not $secret) {
        & kubectl @argsKube -n seminario create secret generic reservas-config --from-env-file=$SecretsFile
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear Secret.' }
    }
    New-Item -ItemType Directory -Path $runtime -Force | Out-Null
    $resolved = Join-Path $runtime 'reservas-resolved.yaml'
    $text = (Get-Content -LiteralPath $base -Raw).Replace('seminario-reservas:1.0.0',$Image)
    Set-Content -LiteralPath $resolved -Value $text -Encoding UTF8
    & kubectl @argsKube apply --dry-run=server -f $resolved
    if ($LASTEXITCODE -ne 0) { throw 'El API server rechazo el manifiesto.' }
    & kubectl @argsKube apply -f $resolved
    if ($LASTEXITCODE -ne 0) { throw 'Fallo la aplicacion del manifiesto.' }
    & kubectl @argsKube -n seminario wait --for=condition=complete job/reservas-init --timeout=300s
    if ($LASTEXITCODE -ne 0) { throw 'No se completo inicializacion de datos.' }
    & kubectl @argsKube -n seminario rollout status deployment/reservas-api --timeout=180s
    if ($LASTEXITCODE -ne 0) { throw 'La API no completo su despliegue.' }
    & kubectl @argsKube -n seminario rollout status deployment/reservas-worker --timeout=180s
    if ($LASTEXITCODE -ne 0) { throw 'El procesador no completo su despliegue.' }
    $imageId = & docker image inspect $Image --format '{{.Id}}'
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo identificar la imagen construida.' }
    [pscustomobject]@{checkedAt=(Get-Date).ToUniversalTime().ToString('o');context="kind-$ClusterName";image=$Image;imageId="$imageId".Trim();scope='Primer despliegue; falta validar HTTP, integridad y carga'} |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtime 'deployment.json') -Encoding UTF8
    Write-Output 'Recursos preparados. Continuar con acceso HTTP y validacion de DOC-05-01.'
}
