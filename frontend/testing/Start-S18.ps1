$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$secretsDir = Join-Path $projectRoot '.runtime\s18'
$envPath = Join-Path $secretsDir 'compose.env'
git -C $projectRoot check-ignore -q -- $envPath
if ($LASTEXITCODE -ne 0) { throw 'Los secretos S18 deben estar excluidos de Git.' }
if (-not (Test-Path -LiteralPath $envPath)) {
    New-Item -ItemType Directory -Path $secretsDir -Force | Out-Null
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $databaseSecret = ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    $rng.GetBytes($bytes)
    $apiSecret = ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    $rng.Dispose()
    $keys = @{}
    $keys[$apiSecret] = '10000000-0000-0000-0000-000000000018'
    $keysJson = ConvertTo-Json -InputObject $keys -Compress
    Set-Content -LiteralPath $envPath -Encoding ASCII -Value "POSTGRES_PASSWORD=$databaseSecret`nCLIENT_KEYS_JSON='$keysJson'"
    $databaseSecret = $null; $apiSecret = $null; $keys = $null; $keysJson = $null
}
docker compose --env-file $envPath -f (Join-Path $PSScriptRoot 's18.compose.yaml') up -d --build --wait
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar S18.' }
Write-Output 'S18 exclusivo disponible en http://localhost:18083 (o FRONTEND_PORT). No usa las bases anteriores.'
