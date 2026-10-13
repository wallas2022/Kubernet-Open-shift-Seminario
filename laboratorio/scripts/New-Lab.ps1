#requires -Version 5.1
<#
.SYNOPSIS
Crea exclusivamente un cluster kind nuevo del seminario.
.DESCRIPTION
Requiere Docker Linux, kind v0.33.0 y kubectl 1.37.x ya instalados.
No instala software, no elimina clusters y no modifica Git.
Guarda kubeconfig fuera del repositorio y usa contexto explicito.
.EXAMPLE
.\New-Lab.ps1 -Profile 32gb -WhatIf
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateSet('16gb', '32gb')]
    [string]$Profile = '32gb',
    [ValidatePattern('^[a-z][a-z0-9-]{0,29}$')]
    [string]$ClusterName = 'seminario',
    [string]$RuntimeRoot = (Join-Path $env:LOCALAPPDATA 'SeminarioKubernetes')
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
foreach ($tool in @('docker', 'kind', 'kubectl')) {
    if (-not (Get-Command $tool -CommandType Application -ErrorAction SilentlyContinue)) {
        throw "Falta $tool. Completa el manual antes de crear el cluster."
    }
}
$kindVersion = & kind version
if ($LASTEXITCODE -ne 0 -or "$kindVersion" -notmatch '^kind v0\.33\.0(?:\s|$)') {
    throw 'Este perfil fue preparado para kind v0.33.0.'
}
$clientRaw = & kubectl version --client -o json
if ($LASTEXITCODE -ne 0) { throw 'No se pudo consultar kubectl.' }
$clientVersion = ($clientRaw | ConvertFrom-Json).clientVersion.gitVersion
if ($clientVersion -notmatch '^v1\.37\.') {
    throw 'Utiliza kubectl 1.37.x para la version del laboratorio.'
}
$dockerOS = & docker info --format '{{.OSType}}'
if ($LASTEXITCODE -ne 0 -or "$dockerOS".Trim() -ne 'linux') {
    throw 'Docker no esta disponible en modo contenedores Linux.'
}
$providerBefore = $env:KIND_EXPERIMENTAL_PROVIDER
try {
    $env:KIND_EXPERIMENTAL_PROVIDER = 'docker'
    $clusters = @(& kind get clusters)
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo listar clusters kind.' }
    if ($clusters -contains $ClusterName) {
        throw 'El cluster ya existe. Validalo; no se reemplazara.'
    }
    $repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
    $runtimePath = [IO.Path]::GetFullPath($RuntimeRoot)
    $repoPrefix = $repoRoot.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
    if ($runtimePath.Equals($repoRoot, [StringComparison]::OrdinalIgnoreCase) -or
        $runtimePath.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'RuntimeRoot debe quedar fuera del repositorio.'
    }
    $labPath = Join-Path $runtimePath $ClusterName
    $kubeconfig = Join-Path $labPath 'kubeconfig.yaml'
    if (Test-Path -LiteralPath $kubeconfig) {
        throw 'Ya existe un kubeconfig para este nombre. No se sobrescribira.'
    }
    $config = Join-Path $PSScriptRoot "..\configuracion\kind-$Profile.yaml"
    if (-not (Test-Path -LiteralPath $config -PathType Leaf)) {
        throw "No existe el perfil: $config"
    }
    $nodeImage = 'kindest/node:v1.37.0@sha256:a1ed56cfb0e7b93589bdf97c8cd566405a265939e3620fc4f5de89adff580ae5'
    if ($PSCmdlet.ShouldProcess($ClusterName, "Crear kind $Profile con kubeconfig en $labPath")) {
        New-Item -ItemType Directory -Path $labPath -Force | Out-Null
        & kind create cluster --name $ClusterName --config $config `
            --image $nodeImage --kubeconfig $kubeconfig --wait 5m
        if ($LASTEXITCODE -ne 0) {
            throw 'Fallo la creacion. Revisa el error; no se ha validado el cluster.'
        }
        & kubectl --kubeconfig $kubeconfig --context "kind-$ClusterName" `
            wait --for=condition=Ready nodes --all --timeout=180s
        if ($LASTEXITCODE -ne 0) { throw 'Hay nodos que no estan Ready.' }
        [pscustomobject]@{
            createdAt = (Get-Date).ToUniversalTime().ToString('o')
            profile = $Profile
            cluster = $ClusterName
            kind = "$kindVersion"
            kubectl = $clientVersion
            nodeImage = $nodeImage
        } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $labPath 'versions.json') -Encoding UTF8
        Write-Output "Cluster creado. Kubeconfig local: $kubeconfig"
        Write-Output 'Aun falta desplegar y comprobar la pagina HTTP.'
    }
}
finally {
    # Restaurar tambien con -WhatIf; solo revierte el valor temporal del proceso.
    if ($null -eq $providerBefore) {
        Remove-Item Env:KIND_EXPERIMENTAL_PROVIDER -ErrorAction SilentlyContinue -WhatIf:$false -Confirm:$false
    } else { $env:KIND_EXPERIMENTAL_PROVIDER = $providerBefore }
}
