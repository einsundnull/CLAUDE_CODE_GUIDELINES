# ============================================================
#  autostart-watchdog.ps1  (ASCII-only, PowerShell 5+)
#  Startet wifi-watchdog.ps1 fuer das Netz aus
#  watchdog-target.txt. Wird von der geplanten Aufgabe
#  "WLAN-Watchdog" beim Login aufgerufen (register-autostart.bat).
#
#  Laeuft schon ein Watchdog, passiert nichts - ausser mit
#  -Restart: dann wird er beendet und fuer das Ziel-Netz neu
#  gestartet (z. B. nach einem Netzwechsel).
#
#  Der Handstart (start-watchdog.bat, open-selector.bat) bleibt
#  davon unberuehrt.
# ============================================================

param (
    [switch]$Restart,
    [string]$LogDir   = "$PSScriptRoot\logs",
    [string]$PingHost = "8.8.8.8",
    [int]   $Interval = 60
)

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

$WatchdogPs1 = Join-Path $PSScriptRoot "wifi-watchdog.ps1"
$TargetFile  = Join-Path $PSScriptRoot "watchdog-target.txt"
$StatusFile  = Join-Path $LogDir "watchdog-status.json"

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log {
    param([string]$Level, [string]$Message)
    $logFile = Join-Path $LogDir ("wifi-watchdog_{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
    $line    = "[{0}] [{1}] [autostart] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    try { Add-Content -Path $logFile -Value $line -Encoding UTF8 } catch { }
    Write-Host $line
}

# ---- Ziel-Netz lesen: erste Zeile, die kein Kommentar ist --
$ssid = ""
if (Test-Path $TargetFile) {
    $ssid = Get-Content -Path $TargetFile -Encoding UTF8 |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ -and -not $_.StartsWith('#') } |
        Select-Object -First 1
}
if (-not $ssid) {
    Write-Log "WARN" "Kein Netz in watchdog-target.txt - ueberwache alle gespeicherten Profile."
    $ssid = ""
}

# ---- Laeuft schon ein Watchdog? (gleiche Pruefung wie die GUI)
$running = $null
if (Test-Path $StatusFile) {
    try {
        $st = Get-Content -Path $StatusFile -Raw -Encoding UTF8 | ConvertFrom-Json
        $p  = Get-Process -Id ([int]$st.Pid) -ErrorAction SilentlyContinue
        if ($p -and $p.ProcessName -eq 'powershell') { $running = $st }
    } catch { }
}

if ($running) {
    if (-not $Restart) {
        Write-Log "INFO" "Watchdog laeuft bereits (PID $($running.Pid), Netz '$($running.Ssid)') - nichts zu tun."
        exit 0
    }
    Write-Log "INFO" "Beende laufenden Watchdog (PID $($running.Pid), Netz '$($running.Ssid)') fuer Neustart."
    Stop-Process -Id ([int]$running.Pid) -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# ---- Starten (gleiche Argumente wie wifi-selector.ps1) -----
$ssidArg = $ssid -replace '"', '\"'
$psArgs  = "-NoProfile -ExecutionPolicy Bypass -File `"$WatchdogPs1`" " +
           "-Ssid `"$ssidArg`" -LogDir `"$LogDir`" -PingHost `"$PingHost`" -Interval $Interval"

$proc = Start-Process powershell.exe -ArgumentList $psArgs -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 4
if ($proc.HasExited) {
    Write-Log "ERROR" "Watchdog wurde sofort beendet (Exit-Code $($proc.ExitCode))."
    exit 1
}
$shown = if ($ssid) { $ssid } else { "alle gespeicherten Profile" }
Write-Log "INFO" "Watchdog gestartet (PID $($proc.Id), Netz '$shown')."
