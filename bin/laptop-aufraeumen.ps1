# laptop-aufraeumen.ps1 - raeumt AppData\Local, Benutzerordner-Caches, Papierkorb und Autostart auf.
# Regeln: universal/AUFRAEUMEN_UNIVERSAL.md. Nur ASCII in dieser Datei (PowerShell 5.1 liest ohne BOM als ANSI).
#
# Ohne Schalter: Trockenlauf. Zeigt, was weg wuerde, loescht nichts.
#   -Loeschen      wirklich loeschen
#   -Android       zusaetzlich alte NDK-Versionen (neueste bleibt), ndk-bundle, Emulator-Abbilder
#   -PythonStore   zusaetzlich Python aus dem Microsoft Store (die Python-Installation in AppData\Local\Python bleibt)
#   -GitAltlast    zusaetzlich %USERPROFILE%\.git-entfernt-* (abgehaengte Git-Daten des Benutzerordners)
#   -Autostart     Skype deinstallieren, Autostart von Skype/Messenger/Edge aus, verwaiste Aufgaben (Programm fehlt) loeschen
# WSL (Linux in Windows) wird von diesem Skript nie angefasst.
#
# Aufruf:  powershell -ExecutionPolicy Bypass -File "C:\Users\pc\Documents\CLAUDE_CODE_GUIDELINES\bin\laptop-aufraeumen.ps1" -Loeschen -Android -PythonStore

param([switch]$Loeschen, [switch]$Android, [switch]$PythonStore, [switch]$GitAltlast, [switch]$Autostart)

$U     = $env:USERPROFILE
$L     = $env:LOCALAPPDATA
$cut   = (Get-Date).AddHours(-2)     # was in den letzten 2 Stunden geschrieben wurde, gilt als in Benutzung
$free0 = (Get-PSDrive C).Free
$sum   = 0

function Size($p) { $s = (Get-ChildItem -LiteralPath $p -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum; if ($s) { $s } else { 0 } }
function InUse($p) { [bool](Get-ChildItem -LiteralPath $p -Recurse -Force -File -ErrorAction SilentlyContinue | Where-Object LastWriteTime -gt $cut | Select-Object -First 1) }

function Wegraeumen($p) {
  if (-not (Test-Path -LiteralPath $p)) { return }
  $s = Size $p
  if (-not $Loeschen) { "{0,7:N2} GB  wuerde weg  {1}" -f ($s/1GB), $p; $script:sum += $s; return }
  Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue
  $rest = if (Test-Path -LiteralPath $p) { Size $p } else { 0 }
  $script:sum += ($s - $rest)
  "{0,7:N2} GB  weg  {1}{2}" -f (($s-$rest)/1GB), $p, $(if ($rest) { "   (Rest {0:N2} GB gesperrt, Programm offen?)" -f ($rest/1GB) } else { "" })
}

"=== " + $(if ($Loeschen) { "LOESCHEN" } else { "TROCKENLAUF - nichts wird geloescht" }) + " ==="

"--- Claude-Temp: Sitzungen ohne Schreibzugriff in den letzten 2 Stunden"
if (Test-Path "$L\Temp\claude") {
  Get-ChildItem -LiteralPath "$L\Temp\claude" -Directory -Force | ForEach-Object {
    Get-ChildItem -LiteralPath $_.FullName -Directory -Force | ForEach-Object {
      if (InUse $_.FullName) { "   in Benutzung, bleibt: $($_.FullName)" } else { Wegraeumen $_.FullName }
    }
  }
}

"--- Temp: Dateien und Ordner aelter als 7 Tage (ohne claude)"
Get-ChildItem -LiteralPath "$L\Temp" -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -ne 'claude' -and $_.LastWriteTime -lt (Get-Date).AddDays(-7) -and -not ($_.PSIsContainer -and (InUse $_.FullName)) } |
  ForEach-Object { Wegraeumen $_.FullName }

"--- Absturzberichte der Browser"
Wegraeumen "$L\Microsoft\Edge\User Data\Crashpad"
Wegraeumen "$L\Google\Chrome\User Data\Crashpad"

"--- Einstellungen alter Android-Studio-Versionen (die neueste bleibt)"
$as = Get-ChildItem -LiteralPath "$L\Google" -Directory -Filter "AndroidStudio*" -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match '^AndroidStudio\d+\.\d+(\.\d+)*$' } |
  Sort-Object { [version]($_.Name -replace '^AndroidStudio','') }
if ($as.Count -gt 1) { $as | Select-Object -SkipLast 1 | ForEach-Object { Wegraeumen $_.FullName }; "   bleibt: $($as[-1].Name)" }

"--- Reste von Installern und Updatern"
Get-ChildItem -LiteralPath $L -Directory -Filter "*-updater" -Force -ErrorAction SilentlyContinue | ForEach-Object { Wegraeumen $_.FullName }
Wegraeumen "$L\SquirrelTemp"

"--- Zwischenspeicher, die bei Bedarf neu geladen werden"
Wegraeumen "$L\ms-playwright"
Wegraeumen "$L\pip\cache"
if (Test-Path "$L\npm-cache") {
  if ($Loeschen) { $s = Size "$L\npm-cache"; npm cache clean --force 2>$null | Out-Null; $d = $s - (Size "$L\npm-cache"); $sum += $d; "{0,7:N2} GB  weg  npm-cache (npm cache clean)" -f ($d/1GB) }
  else { $s = Size "$L\npm-cache"; $sum += $s; "{0,7:N2} GB  wuerde weg  npm-cache" -f ($s/1GB) }
}

"--- Gradle: Versionen, die kein Projekt nutzt (gradle-wrapper.properties), und Protokolle"
$roots = "$U\AndroidStudioProjects", "$U\eclipse-workspace", "$U\Documents", "$U\IdeaProjects" | Where-Object { Test-Path $_ }
$used = Get-ChildItem $roots -Recurse -Depth 6 -Filter gradle-wrapper.properties -ErrorAction SilentlyContinue |
  Select-String -Pattern 'gradle-([^/]+)\.zip' | ForEach-Object { "gradle-" + $_.Matches[0].Groups[1].Value } | Sort-Object -Unique
if (-not $used -or ($used | Where-Object { $_ -notmatch '^gradle-\d+\.\d+.*-(bin|all)$' })) { "   Erkennung unsicher ($($used -join ', ')) - Gradle-Versionen bleiben" }
elseif (-not $used) { "   kein Projekt gefunden - Gradle-Versionen bleiben" }
else {
  "   benutzt, bleibt: " + ($used -join ', ')
  Get-ChildItem -LiteralPath "$U\.gradle\wrapper\dists" -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -notin $used } | ForEach-Object { Wegraeumen $_.FullName }
}
Wegraeumen "$U\.gradle\daemon"

"--- Weitere Zwischenspeicher im Benutzerordner"
Wegraeumen "$U\.cache\puppeteer"

"--- Speicherabzuege nach Abstuerzen (*.hprof, Java/Android Studio) im Benutzerordner"
Get-ChildItem -LiteralPath $U -File -Force -Filter "*.hprof" -ErrorAction SilentlyContinue | ForEach-Object { Wegraeumen $_.FullName }
Wegraeumen "$L\CrashDumps"

"--- Alte Claude-Programmversionen (die neueste bleibt; gesperrte = laufende Sitzung, bleiben)"
$cv = Get-ChildItem -LiteralPath "$U\.local\share\claude\versions" -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match '^\d+\.\d+\.\d+$' } | Sort-Object { [version]$_.Name }
if ($cv.Count -gt 1) { $cv | Select-Object -SkipLast 1 | ForEach-Object { Wegraeumen $_.FullName }; "   bleibt: $($cv[-1].Name)" }
Get-ChildItem -LiteralPath "$U\.local\bin" -File -Filter "claude.exe.old.*" -ErrorAction SilentlyContinue | ForEach-Object { Wegraeumen $_.FullName }

"--- Papierkorb"
# Nur der eigene Papierkorb (Ordner der eigenen SID). Clear-RecycleBin und SHEmptyRecycleBin
# scheitern ohne Desktop-Sitzung still (2026-11-11 gemessen), deshalb direkt loeschen.
$rbDir  = 'C:\$Recycle.Bin\' + [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$rbSize = Size $rbDir
if ($rbSize) {
  if ($Loeschen) {
    Get-ChildItem -LiteralPath $rbDir -Force | Where-Object Name -ne 'desktop.ini' | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    $d = $rbSize - (Size $rbDir); $sum += $d; "{0,7:N2} GB  weg  Papierkorb" -f ($d/1GB)
  }
  else { $sum += $rbSize; "{0,7:N2} GB  wuerde weg  Papierkorb" -f ($rbSize/1GB) }
}

if ($GitAltlast) {
  "--- Abgehaengte Git-Daten im Benutzerordner"
  Get-ChildItem -LiteralPath $U -Directory -Force -Filter ".git-entfernt-*" | ForEach-Object { Wegraeumen $_.FullName }
}

if ($Autostart) {
  "--- Autostart"
  $run = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
  (Get-Item $run).Property | Where-Object { $_ -match '^(Skype for Desktop|com\.messenger|MicrosoftEdgeAutoLaunch_.*)$' } | ForEach-Object {
    if ($Loeschen) { Remove-ItemProperty -Path $run -Name $_; "   aus: $_" } else { "   wuerde aus: $_" }
  }
  Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskPath -notlike '\Microsoft\*' } | ForEach-Object {
    $raw = [string](($_.Actions | Select-Object -First 1).Execute)
    $exe = [Environment]::ExpandEnvironmentVariables(($raw -replace '"', ''))
    if ($exe -and [IO.Path]::IsPathRooted($exe) -and -not (Test-Path -LiteralPath $exe)) {
      $tn = $_.TaskName; $tp = $_.TaskPath   # in catch ist $_ der Fehler, nicht mehr die Aufgabe
      if ($Loeschen) {
        try { Unregister-ScheduledTask -TaskName $tn -TaskPath $tp -Confirm:$false -ErrorAction Stop; "   Aufgabe geloescht: $tn (fehlt: $exe)" }
        catch { "   NICHT geloescht: $tn - braucht Administrator (PowerShell als Administrator starten)" }
      } else { "   wuerde Aufgabe loeschen: $tn (fehlt: $exe)" }
    }
  }
  "--- Skype (Dienst seit Mai 2025 eingestellt)"
  $sk = Get-ItemProperty 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'Skype*' }
  foreach ($s in $sk) {
    $cmd = if ($s.QuietUninstallString) { $s.QuietUninstallString } else { $s.UninstallString + ' /VERYSILENT /SUPPRESSMSGBOXES /NORESTART' }
    if ($Loeschen) { Start-Process cmd.exe -ArgumentList "/c `"$cmd`"" -Wait; "   deinstalliert (gestartet): $($s.DisplayName)" } else { "   wuerde deinstallieren: $($s.DisplayName)" }
  }
  Get-AppxPackage Microsoft.SkypeApp -ErrorAction SilentlyContinue | ForEach-Object {
    $pf = $_.PackageFullName
    if ($Loeschen) { try { Remove-AppxPackage -Package $pf -ErrorAction Stop } catch {}
      if (Get-AppxPackage Microsoft.SkypeApp) { Start-Sleep 5; try { Remove-AppxPackage -Package $pf -ErrorAction Stop } catch {} }   # 1. Versuch scheitert, solange der klassische Uninstaller laeuft
      if (Get-AppxPackage Microsoft.SkypeApp) { "   NICHT deinstalliert: Skype (Store) - ueber Einstellungen > Apps" } else { "   deinstalliert: Skype (Store)" } }
    else { "   wuerde deinstallieren: Skype (Store)" }
  }
}

if ($Android) {
  "--- Android: alte NDK-Versionen, ndk-bundle, Emulator-Abbilder"
  $ndk = Get-ChildItem -LiteralPath "$L\Android\Sdk\ndk" -Directory -ErrorAction SilentlyContinue | Sort-Object { [version]$_.Name }
  if ($ndk.Count -gt 1) { $ndk | Select-Object -SkipLast 1 | ForEach-Object { Wegraeumen $_.FullName }; "   bleibt: ndk\$($ndk[-1].Name)" }
  Wegraeumen "$L\Android\Sdk\ndk-bundle"
  Get-ChildItem -LiteralPath "$L\Android\Sdk\system-images" -Directory -ErrorAction SilentlyContinue | ForEach-Object { Wegraeumen $_.FullName }
}

if ($PythonStore) {
  "--- Python aus dem Microsoft Store"
  Get-AppxPackage "PythonSoftwareFoundation.Python.*" | ForEach-Object {
    $p = "$L\Packages\$($_.PackageFamilyName)"; $s = Size $p
    if ($Loeschen) {
      $full = $_.PackageFullName; $name = $_.Name
      try { Remove-AppxPackage -Package $full -ErrorAction Stop } catch { "   FEHLER: $($_.Exception.Message.Split([Environment]::NewLine)[0])" }
      if (Get-AppxPackage $name) { "   NICHT deinstalliert: $name - bitte ueber Einstellungen > Apps > Installierte Apps entfernen" }
      else { $sum += $s; "{0,7:N2} GB  deinstalliert  {1}" -f ($s/1GB), $name }
    }
    else { $sum += $s; "{0,7:N2} GB  wuerde deinstalliert  {1}" -f ($s/1GB), $_.Name }
  }
}

""
"Summe: {0:N2} GB" -f ($sum/1GB)
"Frei auf C: vorher {0:N2} GB, jetzt {1:N2} GB" -f ($free0/1GB), ((Get-PSDrive C).Free/1GB)

# Fenster bleibt offen (Prompt_Handling: EIN SKRIPT SCHLIESST SICH NICHT SELBST); nicht bei umgeleiteter Eingabe.
if (-not [Console]::IsInputRedirected) { Write-Host "Fertig. Enter oder ESC zum Schliessen."; [void][Console]::ReadKey($true) }
