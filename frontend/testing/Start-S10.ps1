$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$secretsDir = Join-Path $projectRoot '.runtime\s10'
$envPath = Join-Path $secretsDir 'compose.env'
git -C $projectRoot check-ignore -q -- $envPath
if ($LASTEXITCODE -ne 0) { throw 'Los secretos de S10 deben estar excluidos de Git.' }
if (-not (Test-Path -LiteralPath $envPath)) {
    New-Item -ItemType Directory -Path $secretsDir -Force | Out-Null
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $databaseSecret = ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    $rng.GetBytes($bytes)
    $apiSecret = ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    $rng.GetBytes($bytes)
    $secondApiSecret = ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
    $rng.Dispose()
    $keys = @{}
    $keys[$apiSecret] = '10000000-0000-0000-0000-000000000010'
    $keys[$secondApiSecret] = '20000000-0000-0000-0000-000000000010'
    $keysJson = ConvertTo-Json -InputObject $keys -Compress
    Set-Content -LiteralPath $envPath -Encoding ASCII -Value "POSTGRES_PASSWORD=$databaseSecret`nCLIENT_KEYS_JSON='$keysJson'"
    $secondApiSecret = $null; $databaseSecret = $null; $apiSecret = $null; $keys = $null; $keysJson = $null
}
docker compose --project-name seminario-s10 --env-file $envPath -f (Join-Path $PSScriptRoot 's10.compose.yaml') up -d --wait
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar el entorno aislado de S10.' }
Write-Output 'S10 aislado disponible en http://localhost:5183. No se modifico la base habitual.'
