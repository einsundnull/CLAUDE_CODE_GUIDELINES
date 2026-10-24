# ============================================================
#  scan-networks.ps1  (ASCII-only, PowerShell 5+)
#  Scannt die sichtbaren WLAN-Netze, markiert die mit
#  gespeichertem Windows-Profil und schreibt das Ergebnis nach
#  logs\networks.json. Gibt die Liste als a), b), c) ... aus.
#
#  Braucht KEINE Adminrechte. Aendert nichts am Watchdog.
#  Aufruf:  powershell -ExecutionPolicy Bypass -File scan-networks.ps1
# ============================================================

param (
    [string]$LogDir = "$PSScriptRoot\logs"
)

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

$commonPs1 = Join-Path $PSScriptRoot "wifi-common.ps1"
if (-not (Test-Path $commonPs1)) {
    Write-Error "wifi-common.ps1 fehlt. Erwartet in: $commonPs1"
    exit 2
}
. $commonPs1

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$OutFile = Join-Path $LogDir "networks.json"

# ---- Scan (gleicher Parser wie in wifi-selector.ps1) -------
$visible = @()
$current = $null
foreach ($line in (netsh wlan show networks mode=bssid 2>&1)) {
    $l = "$line"
    if ($l -match '^SSID\s+\d+\s*:\s*(.*)$') {
        if ($null -ne $current) { $visible += $current }
        $current = [PSCustomObject]@{ Ssid = $Matches[1].Trim(); Signal = 0; Auth = '' }
    }
    elseif ($null -ne $current) {
        if ($l -match 'Signal\s*:\s*(\d+)\s*%' -and $current.Signal -eq 0) { $current.Signal = [int]$Matches[1] }
        if ($l -match '(?:Authentifizierung|Authentication)\s*:\s*(.+)')  { $current.Auth   = $Matches[1].Trim() }
    }
}
if ($null -ne $current) { $visible += $current }
$visible = @($visible | Where-Object { $_.Ssid })   # versteckte Netze ohne Namen sind nicht waehlbar

$profiles  = @(Get-SavedWifiProfiles)
$connected = (Get-WlanInterfaceInfo).Ssid

# ---- Liste bauen: sichtbare Netze, danach gespeicherte ausser Reichweite
$list = @()
foreach ($n in ($visible | Sort-Object Signal -Descending)) {
    if ($list.Ssid -contains $n.Ssid) { continue }
    $list += [PSCustomObject]@{
        Ssid       = $n.Ssid
        Signal     = $n.Signal
        Auth       = $n.Auth
        InRange    = $true
        HasProfile = ($profiles -contains $n.Ssid)
        Connected  = ($n.Ssid -eq $connected)
    }
}
foreach ($p in $profiles) {
    if ($list.Ssid -contains $p) { continue }
    $list += [PSCustomObject]@{
        Ssid = $p; Signal = 0; Auth = ''; InRange = $false; HasProfile = $true; Connected = $false
    }
}

$letters = 'abcdefghijklmnopqrstuvwxyz'
for ($i = 0; $i -lt $list.Count; $i++) {
    $key = if ($i -lt 26) { [string]$letters[$i] } else { "z$($i - 25)" }
    $list[$i] | Add-Member -NotePropertyName Key -NotePropertyValue $key
}

# ---- Speichern (Temp-Datei, dann ersetzen) -----------------
$obj = [ordered]@{
    ScannedAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    Connected = $connected
    Networks  = @($list | Select-Object Key, Ssid, Signal, Auth, InRange, HasProfile, Connected)
}
$tmp = "$OutFile.tmp"
($obj | ConvertTo-Json -Depth 4) | Set-Content -Path $tmp -Encoding UTF8
Move-Item -Path $tmp -Destination $OutFile -Force

# ---- Ausgabe -----------------------------------------------
Write-Host "WLAN-Netze ($($obj.ScannedAt)), gespeichert in $OutFile"
foreach ($n in $list) {
    $flags = @()
    if ($n.Connected)       { $flags += "verbunden" }
    if (-not $n.HasProfile) { $flags += "KEIN Profil - Watchdog kann nicht verbinden" }
    if (-not $n.InRange)    { $flags += "nicht in Reichweite" }
    $sig  = if ($n.InRange) { "$($n.Signal)%" } else { "-" }
    $tail = if ($flags) { "  [" + ($flags -join ", ") + "]" } else { "" }
    Write-Host ("{0}) {1}  ({2}){3}" -f $n.Key, $n.Ssid, $sig, $tail)
}
