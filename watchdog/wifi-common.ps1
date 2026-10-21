# ============================================================
#  wifi-common.ps1  (ASCII-only, PowerShell 5+)
#  Gemeinsame netsh-Hilfsfunktionen fuer wifi-watchdog.ps1
#  und wifi-selector.ps1. Wird per Dot-Sourcing geladen.
# ============================================================

function Get-WlanInterfaceInfo {
    <#
      Liest den Zustand der ersten WLAN-Schnittstelle aus
      "netsh wlan show interfaces" (deutsch und englisch).
      Rueckgabe: .Name, .State, .Connected, .Ssid, .RadioOff
    #>
    $info = [PSCustomObject]@{
        Name      = $null
        State     = ''
        Connected = $false
        Ssid      = $null
        RadioOff  = $false
    }

    foreach ($line in (netsh wlan show interfaces 2>&1)) {
        $l = "$line"
        if ($l -match '^\s+Name\s*:\s*(.+)$') {
            if ($info.Name) { break }          # nur die erste Schnittstelle
            $info.Name = $Matches[1].Trim()
        }
        elseif ($l -match '^\s+(?:Status|State)\s*:\s*(.+)$') {
            $info.State     = $Matches[1].Trim()
            $info.Connected = ($info.State -match '^(verbunden|connected)$')
        }
        elseif ($l -match '^\s+SSID\s*:\s*(.+)$') {
            $info.Ssid = $Matches[1].Trim()
        }
        elseif ($l -match 'Software\s+(Aus|Off)') {
            $info.RadioOff = $true
        }
    }

    if (-not $info.Connected) { $info.Ssid = $null }
    return $info
}

function Get-SavedWifiProfiles {
    $names = @()
    foreach ($line in (netsh wlan show profiles 2>&1)) {
        # "f.r" statt "fuer", weil netsh je nach Codepage das u-Umlaut anders ausgibt
        if ("$line" -match '(?:Profil f.r alle Benutzer|All User Profile)\s*:\s*(.+)$') {
            $names += $Matches[1].Trim()
        }
    }
    return $names
}

function Test-WifiProfileExists {
    param([string]$Ssid)
    return (@(Get-SavedWifiProfiles) -contains $Ssid)
}
