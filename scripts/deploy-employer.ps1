# Builds the employer page and publishes it into the folder the public entry (docs\apache-employer-vhost.conf) serves.
# Only the employer page is published: none of the staff app or kiosk code. The page talks to the API on its own
# address (/epeso_backend/api), so it works through the Cloudflare tunnel.
#
#   powershell -ExecutionPolicy Bypass -File scripts\deploy-employer.ps1
#   (optional)  -Target C:\xampp\htdocs\epeso_employer_public
param([string]$Target = 'C:\xampp\htdocs\epeso_employer_public')

$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Push-Location $root
try {
  $env:VITE_API_BASE = '/epeso_backend/api'
  npm run build:employer
  if ($LASTEXITCODE -ne 0) { Write-Error 'The build failed.'; exit 1 }

  if (-not (Test-Path $Target)) { New-Item -ItemType Directory -Force $Target | Out-Null }
  # replace the previous version (only inside the target folder)
  Get-ChildItem -LiteralPath $Target -Force | Remove-Item -Recurse -Force
  Copy-Item -Path (Join-Path $root 'dist-employer\*') -Destination $Target -Recurse -Force
  Write-Host "Published the employer page to $Target"
  Write-Host 'Open http://localhost:8081/employer/ (after the Apache virtual host is installed).'
} finally { Pop-Location }
