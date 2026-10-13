#requires -Version 5.1
<#
.SYNOPSIS
Valida nodos, Deployment, destinos del Service y HTTP local.
.DESCRIPTION
Solo consulta el cluster y la URL local. No despliega ni repara recursos.
Requiere port-forward activo y deployment comprobacion ya aplicado.
#>
[CmdletBinding()]
param(
    [ValidatePattern('^[a-z][a-z0-9-]{0,29}$')]
    [string]$ClusterName = 'seminario',
    [string]$RuntimeRoot = (Join-Path $env:LOCALAPPDATA 'SeminarioKubernetes'),
    [ValidateRange(1024,65535)]
    [int]$Port = 8080
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$kubeconfig = Join-Path (Join-Path $RuntimeRoot $ClusterName) 'kubeconfig.yaml'
if (-not (Test-Path -LiteralPath $kubeconfig -PathType Leaf)) {
    throw 'No se encuentra el kubeconfig del laboratorio.'
}
if (-not (Get-Command kubectl -CommandType Application -ErrorAction SilentlyContinue)) {
    throw 'No se encuentra kubectl.'
}
$kubeArgs = @('--kubeconfig', $kubeconfig, '--context', "kind-$ClusterName")
function Get-KubeJson {
    param([string[]]$Arguments)
    $raw = & kubectl @kubeArgs @Arguments -o json
    if ($LASTEXITCODE -ne 0) { throw "Fallo kubectl: $($Arguments -join ' ')" }
    return ($raw | ConvertFrom-Json)
}
$nodes = Get-KubeJson -Arguments @('get','nodes')
if (@($nodes.items).Count -lt 1) { throw 'El cluster no tiene nodos.' }
foreach ($node in $nodes.items) {
    $ready = @($node.status.conditions | Where-Object { $_.type -eq 'Ready' -and $_.status -eq 'True' })
    if ($ready.Count -eq 0) { throw "Nodo no preparado: $($node.metadata.name)" }
}
$rolloutOutput = & kubectl @kubeArgs -n seminario rollout status deployment/comprobacion --timeout=120s
if ($LASTEXITCODE -ne 0) { throw 'El Deployment no completo su rollout.' }
$deployment = Get-KubeJson -Arguments @('-n','seminario','get','deployment','comprobacion')
$slices = Get-KubeJson -Arguments @('-n','seminario','get','endpointslices','-l','kubernetes.io/service-name=comprobacion')
$readyEndpoints = 0
foreach ($slice in $slices.items) {
    foreach ($endpoint in $slice.endpoints) {
        if ($endpoint.conditions.ready -eq $true) { $readyEndpoints++ }
    }
}
if ($readyEndpoints -lt 1) { throw 'Service sin destinos preparados.' }
$response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port" -UseBasicParsing -TimeoutSec 10
if ($response.StatusCode -ne 200 -or $response.Content -notmatch 'SEMINARIO-OK') {
    throw 'La respuesta HTTP no corresponde a la pagina esperada.'
}
[pscustomobject]@{
    checkedAt = (Get-Date).ToUniversalTime().ToString('o')
    cluster = $ClusterName
    nodesReady = @($nodes.items).Count
    replicasRequested = $deployment.spec.replicas
    replicasAvailable = $deployment.status.availableReplicas
    readyEndpoints = $readyEndpoints
    httpStatus = $response.StatusCode
    markerFound = $true
    scope = 'Comprobacion basica; no mide capacidad ni HA fisica.'
} | ConvertTo-Json
