# ============================================================
#  wifi-watchdog.ps1  (ASCII-only, PowerShell 5+)
#  Ueberwacht die WLAN-Verbindung und stellt sie bei Abbruch
#  automatisch wieder her. Schreibt seinen Zustand nach
#  logs\watchdog-status.json, damit die GUI ihn anzeigen kann.
#
#  Ablauf pro Pruefung:
#   1. Ist das WLAN mit dem Ziel-Netz verbunden?
#      Nein -> sofort neu verbinden (bei Bedarf WLAN-Funk
#              einschalten und Adapter neu starten).
#   2. Ja, aber kein Internet (Ping) -> nach MaxFails
#      Fehlversuchen Adapter neu starten und neu verbinden.
# ============================================================

param (
    [string]$LogDir     = "$PSScriptRoot\logs",
    [string]$PingHost   = "8.8.8.8",
    [int]   $Interval   = 60,
    [string]$Ssid       = "",
    [int]   $MaxFails   = 3,
    [int]   $RetryDelay = 15     # Sekunden bis zum naechsten Versuch, wenn Reconnect scheitert
)

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$StatusFile = Join-Path $LogDir "watchdog-status.json"

$script:failCount      = 0
$script:reconnectCount = 0
$script:lastOnline     = $null
$script:lastCheckUnix  = 0
$script:lastMessage    = ""

# ---- Logging & Status --------------------------------------
function Get-UnixNow {
    return [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
}

function Write-Log {
    param([string]$Level, [string]$Message)
    $logFile = Join-Path $LogDir ("wifi-watchdog_{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
    $line    = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    try { Add-Content -Path $logFile -Value $line -Encoding UTF8 } catch { }
    Write-Host $line
    if ($Level -ne "DEBUG") { $script:lastMessage = "$(Get-Date -Format 'HH:mm:ss') $Message" }
}

function Write-Status {
    param(
        [string]$State,
        [int]   $NextInSeconds = $Interval,
        [string]$ErrorText     = ""
    )
    $now = Get-UnixNow
    $obj = [ordered]@{
        Pid           = $PID
        Ssid          = $Ssid
        State         = $State
        Interval      = $NextInSeconds
        LastCheckUnix = $script:lastCheckUnix
        NextCheckUnix = $now + $NextInSeconds
        LastOnline    = $script:lastOnline
        FailCount     = $script:failCount
        MaxFails      = $MaxFails
        Reconnects    = $script:reconnectCount
        LastMessage   = $script:lastMessage
        ErrorText     = $ErrorText
        UpdatedUnix   = $now
    }
    try {
        # Erst in Temp-Datei schreiben, dann ersetzen -> GUI liest nie eine halbe Datei
        $tmp = "$StatusFile.tmp"
        ($obj | ConvertTo-Json) | Set-Content -Path $tmp -Encoding UTF8
        Move-Item -Path $tmp -Destination $StatusFile -Force
    } catch {
        Write-Host "Statusdatei konnte nicht geschrieben werden: $($_.Exception.Message)"
    }
}

# ---- Gemeinsame Funktionen laden ---------------------------
$commonPs1 = Join-Path $PSScriptRoot "wifi-common.ps1"
if (-not (Test-Path $commonPs1)) {
    $msg = "wifi-common.ps1 fehlt. Erwartet in: $commonPs1"
    Write-Log "FATAL" $msg
    Write-Status -State "Error" -NextInSeconds 0 -ErrorText $msg
    exit 2
}
. $commonPs1

# ---- Hilfsfunktionen ---------------------------------------
function Get-WifiAdapter {
    Get-NetAdapter -ErrorAction SilentlyContinue |
        Where-Object { $_.PhysicalMediaType -match 'Native 802.11|Wireless' -and $_.Status -ne 'Not Present' } |
        Select-Object -First 1
}

function Test-InternetConnectivity {
    try {
        return [bool](Test-Connection -ComputerName $PingHost -Count 2 -Quiet -ErrorAction SilentlyContinue)
    } catch {
        return $false
    }
}

function Test-TargetConnected {
    param($Info)
    if (-not $Info.Connected) { return $false }
    if ($Ssid -eq "")         { return $true }
    return ($Info.Ssid -eq $Ssid)
}

function Enable-WifiRadio {
    <#
      Schaltet den WLAN-Funk ein, falls er in Windows ausgeschaltet wurde
      (Taskleiste / Flugmodus). Nutzt die Windows-Radio-API.
    #>
    try {
        Add-Type -AssemblyName System.Runtime.WindowsRuntime
        $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
            $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
            $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
        })[0]

        $await = {
            param($WinRtTask, $ResultType)
            $t = $asTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($WinRtTask))
            [void]$t.Wait(-1)
            $t.Result
        }

        [void][Windows.Devices.Radios.Radio, Windows.System.Devices, ContentType = WindowsRuntime]
        [void][Windows.Devices.Radios.RadioAccessStatus, Windows.System.Devices, ContentType = WindowsRuntime]
        [void][Windows.Devices.Radios.RadioState, Windows.System.Devices, ContentType = WindowsRuntime]

        [void](& $await ([Windows.Devices.Radios.Radio]::RequestAccessAsync()) ([Windows.Devices.Radios.RadioAccessStatus]))
        $radios = & $await ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) `
                           ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
        $wifiRadio = $radios | Where-Object { $_.Kind -eq 'WiFi' } | Select-Object -First 1
        if ($null -eq $wifiRadio) {
            Write-Log "WARN" "Kein WLAN-Funkmodul ueber die Windows-Radio-API gefunden."
            return $false
        }
        if ("$($wifiRadio.State)" -ne 'On') {
            Write-Log "INFO" "WLAN-Funk ist aus - schalte ihn ein ..."
            $res = & $await ($wifiRadio.SetStateAsync([Windows.Devices.Radios.RadioState]::On)) `
                            ([Windows.Devices.Radios.RadioAccessStatus])
            Write-Log "INFO" "Ergebnis WLAN-Funk einschalten: $res"
            Start-Sleep -Seconds 3
        }
        return $true
    } catch {
        Write-Log "ERROR" "WLAN-Funk konnte nicht eingeschaltet werden: $($_.Exception.Message)"
        return $false
    }
}

function Restart-WifiAdapter {
    $adapter = Get-WifiAdapter
    if ($null -eq $adapter) {
        Write-Log "ERROR" "Kein WLAN-Adapter gefunden - Neustart nicht moeglich."
        return
    }
    Write-Log "INFO" "Starte WLAN-Adapter '$($adapter.Name)' neu ..."
    Disable-NetAdapter -Name $adapter.Name -Confirm:$false -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    Enable-NetAdapter -Name $adapter.Name -Confirm:$false -ErrorAction SilentlyContinue

    # Warten, bis der Adapter wieder bereit ist (max. 15 s)
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        $a = Get-NetAdapter -Name $adapter.Name -ErrorAction SilentlyContinue
        if ($a -and $a.Status -ne 'Disabled') { break }
    }
    Start-Sleep -Seconds 2
}

function Connect-WifiProfile {
    <#
      Verbindet mit dem Ziel-Profil (oder nacheinander mit allen
      gespeicherten Profilen) und wartet bis zu 20 s auf die Verbindung.
    #>
    $info = Get-WlanInterfaceInfo

    if ($Ssid -ne "") {
        if (-not (Test-WifiProfileExists -Ssid $Ssid)) {
            Write-Log "ERROR" "Kein gespeichertes WLAN-Profil fuer '$Ssid'. Bitte einmal in Windows mit Passwort verbinden."
            return $false
        }
        $profileNames = @($Ssid)
    } else {
        $profileNames = @(Get-SavedWifiProfiles)
    }

    foreach ($p in $profileNames) {
        $ifArg = if ($info.Name) { " interface=`"$($info.Name)`"" } else { "" }
        Write-Log "INFO" "Verbinde mit '$p' ..."
        $out = cmd /c "netsh wlan connect name=`"$p`"$ifArg" 2>&1
        Write-Log "DEBUG" "netsh: $out"

        for ($i = 0; $i -lt 20; $i++) {
            Start-Sleep -Seconds 1
            $now = Get-WlanInterfaceInfo
            if ($now.Connected -and ($Ssid -eq "" -or $now.Ssid -eq $Ssid)) {
                Write-Log "INFO" "Verbunden mit '$($now.Ssid)' nach $($i + 1) s."
                return $true
            }
        }
        Write-Log "WARN" "Keine Verbindung mit '$p' nach 20 s (netsh: $out)."
    }
    return $false
}

function Invoke-WifiReconnect {
    param([switch]$RestartAdapter)

    $script:reconnectCount++
    Write-Status -State "Reconnecting" -NextInSeconds 0

    $info = Get-WlanInterfaceInfo
    if ($info.RadioOff) { [void](Enable-WifiRadio) }

    if (-not $RestartAdapter) {
        if (Connect-WifiProfile) { return $true }
        Write-Log "WARN" "Direktes Verbinden fehlgeschlagen - starte Adapter neu."
    }

    Restart-WifiAdapter
    $info = Get-WlanInterfaceInfo
    if ($info.RadioOff) { [void](Enable-WifiRadio) }
    if (Connect-WifiProfile) { return $true }

    Write-Log "ERROR" "Reconnect #$($script:reconnectCount) fehlgeschlagen. Neuer Versuch in ${RetryDelay}s."
    return $false
}

# ---- Hauptschleife -----------------------------------------
$ssidInfo = if ($Ssid -ne "") { $Ssid } else { "alle gespeicherten Profile" }
Write-Log "INFO" "====== WLAN-Watchdog gestartet (PID $PID, Intervall ${Interval}s, Ping-Ziel $PingHost, Netz: $ssidInfo) ======"
if ($Ssid -ne "" -and -not (Test-WifiProfileExists -Ssid $Ssid)) {
    Write-Log "WARN" "Fuer '$Ssid' ist kein WLAN-Profil gespeichert - Reconnect wird scheitern."
}
Write-Status -State "Starting" -NextInSeconds 0

try {
    while ($true) {
        $script:lastCheckUnix = Get-UnixNow
        $next = $Interval
        $info = Get-WlanInterfaceInfo

        if (-not (Test-TargetConnected -Info $info)) {
            # Fall 1: WLAN nicht (mit dem Ziel-Netz) verbunden -> sofort handeln
            $current = if ($info.Ssid) { "verbunden mit '$($info.Ssid)'" } else { "Status '$($info.State)'" }
            Write-Log "WARN" "WLAN nicht mit '$ssidInfo' verbunden ($current)."
            $script:failCount  = 0
            $ok                = Invoke-WifiReconnect
            $script:lastOnline = $ok -and (Test-InternetConnectivity)
            if (-not $ok) { $next = $RetryDelay }
        }
        elseif (Test-InternetConnectivity) {
            # Fall 2: verbunden und Internet erreichbar
            if ($script:failCount -gt 0) {
                Write-Log "INFO" "Internet wieder erreichbar (vorher $($script:failCount) Fehlversuch(e))."
            }
            $script:failCount  = 0
            $script:lastOnline = $true
            Write-Log "INFO" "Online ueber '$($info.Ssid)'. Naechste Pruefung in ${Interval}s."
        }
        else {
            # Fall 3: WLAN verbunden, aber kein Internet
            $script:failCount++
            $script:lastOnline = $false
            Write-Log "WARN" "WLAN verbunden, aber kein Internet (Fehlversuch $($script:failCount) / $MaxFails)."
            if ($script:failCount -ge $MaxFails) {
                $script:failCount  = 0
                $ok                = Invoke-WifiReconnect -RestartAdapter
                $script:lastOnline = $ok -and (Test-InternetConnectivity)
            }
            $next = $RetryDelay
        }

        $stateName = if ($script:lastOnline) { "Online" } else { "Offline" }
        Write-Status -State $stateName -NextInSeconds $next
        Start-Sleep -Seconds $next
    }
}
catch {
    $errText = "{0}`r`n{1}" -f $_.Exception.Message, $_.ScriptStackTrace
    Write-Log "FATAL" $errText
    Write-Status -State "Error" -NextInSeconds 0 -ErrorText $errText
    exit 1
}
