$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$evidence = Join-Path $projectRoot 'evidencias/frontend-s18'
New-Item -ItemType Directory -Force $evidence | Out-Null
$checks = [System.Collections.Generic.List[object]]::new()
function Check([bool]$ok, [string]$name) {
    if (-not $ok) { throw "S18: $name" }
    $checks.Add(@{name=$name;passed=$true})
}
$frontend = (docker inspect seminario-s18-frontend-1 | ConvertFrom-Json)[0]
Check ($frontend.Config.User -eq '1000710000:0') 'arbitrary-uid-configured'
Check ($frontend.HostConfig.ReadonlyRootfs) 'read-only-root-filesystem'
Check ($frontend.HostConfig.CapDrop -contains 'ALL') 'all-capabilities-dropped'
Check (($frontend.HostConfig.SecurityOpt -join ',') -match 'no-new-privileges') 'no-privilege-escalation'
Check ($frontend.State.Health.Status -eq 'healthy') 'docker-healthcheck-healthy'
Check ($frontend.HostConfig.Tmpfs.'/tmp' -match 'noexec,nosuid') 'temporary-volume-noexec-nosuid'
$uid = docker exec seminario-s18-frontend-1 id -u
Check ($LASTEXITCODE -eq 0 -and $uid -eq '1000710000') 'actual-process-arbitrary-uid'
docker exec seminario-s18-frontend-1 sh -c 'test -w /tmp && test ! -w /etc/nginx && test ! -w /usr/share/nginx/html && test -f /tmp/frontend-nginx.pid'
Check ($LASTEXITCODE -eq 0) 'temporary-pid-and-immutable-configuration-assets'
docker exec seminario-s18-frontend-1 sh -c '! command -v node && ! test -d /build && ! test -d /usr/share/nginx/html/node_modules'
Check ($LASTEXITCODE -eq 0) 'runtime-without-node-source-dependencies'
docker run --rm --network seminario-s18_default --read-only --tmpfs /tmp:rw,noexec,nosuid,size=32m,mode=1777 --cap-drop ALL --security-opt no-new-privileges --entrypoint sh seminario-reservas-frontend:s18 -c '/usr/local/bin/start-frontend & server=$!; trap "kill $server" EXIT; for n in 1 2 3 4 5; do wget -q -O /dev/null http://127.0.0.1:8080/health/ready 2>/dev/null && exit 0; sleep 1; done; exit 1'
Check ($LASTEXITCODE -eq 0) 'image-default-nonroot-user-starts'
$ErrorActionPreference = 'Continue'
$invalid = docker run --rm --network seminario-s18_default --read-only --tmpfs /tmp --env 'API_UPSTREAM=http://api:8080/path' seminario-reservas-frontend:s18 2>&1
$invalidExitCode = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
Check ($invalidExitCode -ne 0) 'invalid-proxy-configuration-rejected'
try {
    docker stop seminario-s18-api-1 | Out-Null
    Check ($LASTEXITCODE -eq 0) 'exclusive-api-stopped-for-outage-test'
    $result = Invoke-WebRequest -UseBasicParsing http://localhost:18083/health/ready
    Check ($result.StatusCode -eq 200) 'frontend-probe-independent-from-api'
    $status = 0; $body = ''
    try { Invoke-WebRequest -UseBasicParsing http://localhost:18083/api/catalogo | Out-Null }
    catch {
        $status = [int]$_.Exception.Response.StatusCode
        $reader = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd(); $reader.Dispose()
        if (-not $body) { $body = $_.ErrorDetails.Message }
    }
    Check ($status -eq 502 -and $body -match 'api_unavailable' -and $body -notmatch 'id="root"') 'outage-generic-502-not-spa'
} finally {
    docker start seminario-s18-api-1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo restablecer la API exclusiva S18.' }
}
$recovered = $false
for ($attempt=0; $attempt -lt 30; $attempt++) {
    try {
        Invoke-WebRequest -UseBasicParsing http://localhost:18083/api/catalogo | Out-Null
    } catch {
        if ([int]$_.Exception.Response.StatusCode -eq 401) { $recovered = $true; break }
    }
    Start-Sleep -Seconds 1
}
Check $recovered 'proxy-recovers-after-api-restart'
$logs = (docker logs seminario-s18-frontend-1 2>&1) -join "`n"
$environmentText = [IO.File]::ReadAllText((Join-Path $projectRoot '.runtime/s18/compose.env'))
$keysLine = ($environmentText -split "`n" | Where-Object { $_ -like 'CLIENT_KEYS_JSON=*' })
$keys = ($keysLine.Substring('CLIENT_KEYS_JSON='.Length).Trim().Trim("'")) | ConvertFrom-Json
foreach ($key in $keys.PSObject.Properties.Name) { Check (-not $logs.Contains($key)) 'frontend-logs-without-test-credential' }
$report = @{sprint='S18';checks=$checks.ToArray();passed=$checks.Count;imageId=$frontend.Image;uid=$uid;clusterAdmission='pending-no-context';https='prepared-not-tested'}
$report | ConvertTo-Json -Depth 7 | Set-Content -Encoding UTF8 (Join-Path $evidence 'runtime.json')
Write-Output "S18 runtime: $($checks.Count) checks passed"
