# laptop-messen.ps1 - misst bekannte Muell-Orte (nur lesen, loescht nichts). Regeln: universal/AUFRAEUMEN_UNIVERSAL.md.
# Aufruf: powershell -ExecutionPolicy Bypass -File "C:\Users\pc\Documents\CLAUDE_CODE_GUIDELINES\bin\laptop-messen.ps1"   (dauert einige Minuten)
# Nur ASCII in dieser Datei (PowerShell 5.1 liest ohne BOM als ANSI).
$ErrorActionPreference = 'SilentlyContinue'
function Size($p) {
  if (-not (Test-Path -LiteralPath $p)) { return -1 }
  $s = 0
  try { foreach ($f in [IO.Directory]::EnumerateFiles($p, '*', [IO.SearchOption]::AllDirectories)) { try { $s += ([IO.FileInfo]$f).Length } catch {} } } catch {
    $s = (Get-ChildItem -LiteralPath $p -Recurse -Force -File | Measure-Object Length -Sum).Sum }
  return $s
}
$H = $env:USERPROFILE; $L = $env:LOCALAPPDATA; $R = $env:APPDATA
$fixed = @(
 "$L\CrashDumps", "$L\Microsoft\Windows\WER", "C:\ProgramData\Microsoft\Windows\WER",
 "$L\Microsoft\Windows\Explorer", "$L\Microsoft\Windows\INetCache", "$L\D3DSCache", "$L\NVIDIA\DXCache", "$L\AMD\DxCache",
 "C:\Windows\SoftwareDistribution\Download", "C:\Windows\Temp", "C:\Windows.old", "C:\ProgramData\Package Cache",
 "C:\Windows\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization",
 "$R\Code\Cache", "$R\Code\CachedData", "$R\Code\CachedExtensionVSIXs", "$R\Code\logs", "$H\.vscode\extensions",
 "$R\Cursor", "$H\.cursor", "$R\discord\Cache", "$R\Microsoft\Teams", "$R\Zoom", "$L\Spotify\Data",
 "$R\Claude", "$L\AnthropicClaude", "$H\.claude\projects", "$H\.claude\file-history", "$H\.claude\shell-snapshots", "$H\.claude\todos", "$H\.claude\debug", "$H\.claude\plugins",
 "$H\.nuget\packages", "$H\.cargo", "$H\.rustup", "$H\.conda", "$H\anaconda3", "$H\miniconda3", "$H\.cache", "$H\.cache\huggingface", "$H\.ollama", "$H\.lmstudio", "$H\.android", "$H\.android\avd",
 "$H\.gradle\caches", "$H\.m2", "$H\.npm", "$L\npm-cache", "$R\npm", "$L\pnpm", "$L\Yarn", "$H\.bun", "$L\pip", "$L\Programs\Python", "$H\.ipython", "$H\.vscode-server", "$L\Docker", "$L\JetBrains", "$R\JetBrains", "$L\Google\AndroidStudio2026.1",
 "$L\Temp", "$L\Temp\claude", "$H\Downloads", "$H\Videos", "$H\OneDrive", "C:\`$Recycle.Bin", "$H\AppData\LocalLow"
)
"== feste Orte (GB) =="
foreach ($p in $fixed) { $s = Size $p; if ($s -ge 50MB) { "{0,7:N2}  {1}" -f ($s/1GB), $p } }
"== Roaming > 0.3 GB =="
Get-ChildItem $R -Directory -Force | % { $s = Size $_.FullName; if ($s -ge 300MB) { "{0,7:N2}  {1}" -f ($s/1GB), $_.FullName } }
"== LocalAppData > 0.3 GB =="
Get-ChildItem $L -Directory -Force | % { $s = Size $_.FullName; if ($s -ge 300MB) { "{0,7:N2}  {1}" -f ($s/1GB), $_.FullName } }
"== Benutzerordner-Kinder > 0.3 GB =="
Get-ChildItem $H -Directory -Force | ? { $_.Name -ne 'AppData' } | % { $s = Size $_.FullName; if ($s -ge 300MB) { "{0,7:N2}  {1}" -f ($s/1GB), $_.FullName } }
"== Projekt-Muell (node_modules, .venv, __pycache__, build, graphify-out, Kopien) =="
$roots = "$H\Documents", "$H\Desktop", "$H\eclipse-workspace", "$H\AndroidStudioProjects", "$H\IdeaProjects"
$names = 'node_modules','.venv','venv','__pycache__','graphify-out','build','dist','.next','.vercel','target','.parcel-cache','coverage','test-results','playwright-report'
foreach ($r in $roots) {
  Get-ChildItem $r -Directory -Recurse -Force -Depth 5 | ? { ($names -contains $_.Name -and $_.FullName -notmatch '\\node_modules\\.+') -or $_.Name -match ' - Kopie|Kopie \(\d+\)|\(\d+\)$|_backup|_alt$|\.git-entfernt' } | % {
    $s = Size $_.FullName; if ($s -ge 30MB) { "{0,7:N2}  {1}  (geaendert {2:yyyy-MM-dd})" -f ($s/1GB), $_.FullName, $_.LastWriteTime } }
}
"== grosse Einzeldateien > 300 MB unter Benutzerordner (ohne AppData) =="
Get-ChildItem $H -File -Recurse -Force -Depth 8 | ? { $_.FullName -notmatch '\\AppData\\' -and $_.Length -gt 300MB } | % { "{0,7:N2}  {1}  ({2:yyyy-MM-dd})" -f ($_.Length/1GB), $_.FullName, $_.LastWriteTime }
"== C: Wurzel =="
Get-ChildItem C:\ -Force -File | ? Length -gt 300MB | % { "{0,7:N2}  {1}" -f ($_.Length/1GB), $_.FullName }
"Frei C: {0:N2} GB" -f ((Get-PSDrive C).Free/1GB)
