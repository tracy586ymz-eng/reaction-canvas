$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
foreach ($tool in @('node','npm','cargo')) { if(-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Missing $tool. See the developer build instructions." } }
& npm ci
if($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' }
& node scripts/generate-notices.mjs
if($LASTEXITCODE -ne 0) { throw 'License inventory failed' }
& npm test
if($LASTEXITCODE -ne 0) { throw 'Tests failed' }
& npm run tauri -- build --config src-tauri/tauri.windows.conf.json
if($LASTEXITCODE -ne 0) { throw 'Windows installer build failed' }
Write-Output 'Installer: src-tauri/target/release/bundle/nsis/'
