# ============================================================
#  wifi-selector.ps1  (ASCII-only, PowerShell 5+)
#  GUI: WLAN-Netze scannen, Netz waehlen, Watchdog starten,
#  Countdown bis zum naechsten Scan anzeigen.
# ============================================================

Set-StrictMode -Off
$ErrorActionPreference = "Stop"

try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
} catch {
    Write-Error "WinForms konnte nicht geladen werden: $_"
    Read-Host "Druecke Enter zum Beenden"
    exit 1
}

if ([System.Threading.Thread]::CurrentThread.ApartmentState -ne 'STA') {
    Write-Error "STA-Modus erforderlich. Starte mit: powershell.exe -Sta -File wifi-selector.ps1"
    Read-Host "Druecke Enter zum Beenden"
    exit 1
}

$CommonPs1 = Join-Path $PSScriptRoot "wifi-common.ps1"
if (-not (Test-Path $CommonPs1)) {
    Write-Error "wifi-common.ps1 fehlt. Bitte in denselben Ordner legen: $PSScriptRoot"
    Read-Host "Druecke Enter zum Beenden"
    exit 1
}
. $CommonPs1

$ErrorActionPreference = "Continue"

# ---- Umlaute (Datei bleibt reines ASCII) -------------------
$ae = [char]0x00e4
$oe = [char]0x00f6
$ue = [char]0x00fc

# ---- Pfade & Konstanten ------------------------------------
$ScriptDir     = $PSScriptRoot
$WatchdogPs1   = Join-Path $ScriptDir "wifi-watchdog.ps1"
$LogDir        = Join-Path $ScriptDir "logs"
$StatusFile    = Join-Path $LogDir "watchdog-status.json"
$CheckInterval = 60
$BarWidth      = 572

# ---- Farben & Schriften ------------------------------------
$clrBg        = [System.Drawing.Color]::FromArgb(18,  18,  28)
$clrPanel     = [System.Drawing.Color]::FromArgb(30,  30,  46)
$clrCard      = [System.Drawing.Color]::FromArgb(40,  40,  60)
$clrAccent    = [System.Drawing.Color]::FromArgb(99, 102, 241)
$clrAccentHov = [System.Drawing.Color]::FromArgb(129, 140, 248)
$clrDanger    = [System.Drawing.Color]::FromArgb(239,  68,  68)
$clrSuccess   = [System.Drawing.Color]::FromArgb( 34, 197,  94)
$clrWarn      = [System.Drawing.Color]::FromArgb(234, 179,   8)
$clrText      = [System.Drawing.Color]::FromArgb(226, 232, 240)
$clrSubtext   = [System.Drawing.Color]::FromArgb(148, 163, 184)
$clrRowHov    = [System.Drawing.Color]::FromArgb(55,  55,  80)
$clrRowSel    = [System.Drawing.Color]::FromArgb(60,  60, 110)

$fontMain  = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)
$fontBold  = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$fontTitle = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$fontSmall = New-Object System.Drawing.Font("Segoe UI",  8, [System.Drawing.FontStyle]::Regular)
$fontMono  = New-Object System.Drawing.Font("Consolas",  9, [System.Drawing.FontStyle]::Regular)

# ---- Gemeinsamer Zustand -----------------------------------
$state = @{
    SelectedSsid  = $null
    SelectedRow   = $null
    ErrorShownFor = 0
}

# ============================================================
#  Fehler-Dialog mit Copy-Button
# ============================================================
function Show-ErrorDialog {
    param([string]$Title = "Fehler", [string]$Message = "")

    $dlg = New-Object System.Windows.Forms.Form
    $dlg.Text            = $Title
    $dlg.Size            = New-Object System.Drawing.Size(560, 340)
    $dlg.StartPosition   = "CenterParent"
    $dlg.BackColor       = $clrPanel
    $dlg.ForeColor       = $clrText
    $dlg.Font            = $fontMain
    $dlg.FormBorderStyle = "FixedDialog"
    $dlg.MaximizeBox     = $false
    $dlg.MinimizeBox     = $false

    $lblHead = New-Object System.Windows.Forms.Label
    $lblHead.Text      = "! $Title"
    $lblHead.Font      = $fontBold
    $lblHead.ForeColor = $clrDanger
    $lblHead.AutoSize  = $true
    $lblHead.Location  = New-Object System.Drawing.Point(12, 12)

    $txt = New-Object System.Windows.Forms.TextBox
    $txt.Multiline   = $true
    $txt.ReadOnly    = $true
    $txt.ScrollBars  = "Vertical"
    $txt.Text        = $Message
    $txt.Font        = $fontMono
    $txt.BackColor   = $clrBg
    $txt.ForeColor   = $clrText
    $txt.BorderStyle = "None"
    $txt.Location    = New-Object System.Drawing.Point(12, 40)
    $txt.Size        = New-Object System.Drawing.Size(520, 200)

    $btnCopy = New-Object System.Windows.Forms.Button
    $btnCopy.Text      = "Fehlermeldung kopieren"
    $btnCopy.Font      = $fontBold
    $btnCopy.ForeColor = $clrText
    $btnCopy.BackColor = $clrAccent
    $btnCopy.FlatStyle = "Flat"
    $btnCopy.FlatAppearance.BorderSize = 0
    $btnCopy.Size      = New-Object System.Drawing.Size(200, 34)
    $btnCopy.Location  = New-Object System.Drawing.Point(12, 255)
    $btnCopy.Cursor    = "Hand"
    $btnCopy.Tag       = $txt
    $btnCopy.Add_Click({
        param($sender, $e)
        $t = $sender.Tag.Text
        if ($t) { [System.Windows.Forms.Clipboard]::SetText($t) }
        $sender.Text      = "Kopiert!"
        $sender.BackColor = $clrSuccess
    })

    $btnClose = New-Object System.Windows.Forms.Button
    $btnClose.Text         = "Schliessen"
    $btnClose.Font         = $fontBold
    $btnClose.ForeColor    = $clrText
    $btnClose.BackColor    = $clrRowHov
    $btnClose.FlatStyle    = "Flat"
    $btnClose.FlatAppearance.BorderSize = 0
    $btnClose.Size         = New-Object System.Drawing.Size(120, 34)
    $btnClose.Location     = New-Object System.Drawing.Point(222, 255)
    $btnClose.Cursor       = "Hand"
    $btnClose.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $dlg.AcceptButton      = $btnClose

    $dlg.Controls.AddRange(@($lblHead, $txt, $btnCopy, $btnClose))
    [void]$dlg.ShowDialog()
    $dlg.Dispose()
}

# ============================================================
#  Netzwerk-Scan
# ============================================================
function Get-AvailableNetworks {
    $results = @()
    $current = $null

    foreach ($line in (netsh wlan show networks mode=bssid 2>&1)) {
        $l = "$line"
        if ($l -match '^SSID\s+\d+\s*:\s*(.*)$') {
            if ($null -ne $current) { $results += $current }
            $name = $Matches[1].Trim()
            if (-not $name) { $name = "(verstecktes Netz)" }
            $current = [PSCustomObject]@{ Ssid = $name; Signal = 0; Auth = ''; Connected = $false }
        }
        elseif ($null -ne $current) {
            if ($l -match 'Signal\s*:\s*(\d+)\s*%' -and $current.Signal -eq 0) { $current.Signal = [int]$Matches[1] }
            if ($l -match '(?:Authentifizierung|Authentication)\s*:\s*(.+)')  { $current.Auth   = $Matches[1].Trim() }
        }
    }
    if ($null -ne $current) { $results += $current }

    $connectedSsid = (Get-WlanInterfaceInfo).Ssid
    foreach ($n in $results) { if ($connectedSsid -and $n.Ssid -eq $connectedSsid) { $n.Connected = $true } }

    return @($results | Sort-Object @{ Expression = { [int]$_.Connected }; Descending = $true },
                                    @{ Expression = 'Signal'; Descending = $true })
}

function Get-SignalBar {
    param([int]$Signal)
    if ($Signal -ge 80) { return "[||||]" }
    if ($Signal -ge 60) { return "[||| ]" }
    if ($Signal -ge 40) { return "[||  ]" }
    if ($Signal -ge 20) { return "[|   ]" }
    return "[    ]"
}

function Get-SignalColor {
    param([int]$Signal)
    if ($Signal -ge 70) { return $clrSuccess }
    if ($Signal -ge 40) { return $clrWarn }
    return $clrDanger
}

# ============================================================
#  Watchdog-Prozess
# ============================================================
function Get-WatchdogStatus {
    if (-not (Test-Path $StatusFile)) { return $null }
    try   { return (Get-Content -Path $StatusFile -Raw -Encoding UTF8 | ConvertFrom-Json) }
    catch { return $null }
}

function Test-WatchdogRunning {
    param($Status)
    if ($null -eq $Status -or -not $Status.Pid) { return $false }
    $p = Get-Process -Id ([int]$Status.Pid) -ErrorAction SilentlyContinue
    return ($null -ne $p -and $p.ProcessName -eq 'powershell')
}

function Stop-Watchdog {
    $st = Get-WatchdogStatus
    if ($st -and (Test-WatchdogRunning -Status $st)) {
        Stop-Process -Id ([int]$st.Pid) -Force -ErrorAction SilentlyContinue
    }
    # Zusaetzlich alte Instanzen ohne Statusdatei beenden
    Get-WmiObject Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like '*wifi-watchdog*' } |
        ForEach-Object { $_.Terminate() | Out-Null }
    Remove-Item -Path $StatusFile -Force -ErrorAction SilentlyContinue
}

function Get-SyntaxErrors {
    param([string]$Path)
    $tokens = $null
    $errs   = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$tokens, [ref]$errs)
    if ($errs -and $errs.Count -gt 0) {
        return (($errs | ForEach-Object { "Zeile $($_.Extent.StartLineNumber): $($_.Message)" }) -join "`r`n")
    }
    return ""
}

function Get-LogTail {
    $f = Join-Path $LogDir ("wifi-watchdog_{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
    if (Test-Path $f) { return ((Get-Content -Path $f -Tail 20) -join "`r`n") }
    return "(kein Log vorhanden)"
}

function Format-UnixTime {
    param([long]$Seconds)
    return [DateTimeOffset]::FromUnixTimeSeconds($Seconds).LocalDateTime.ToString("HH:mm:ss")
}

# ============================================================
#  Hauptformular
# ============================================================
$form = New-Object System.Windows.Forms.Form
$form.Text            = "WLAN-Watchdog - Netzwerk ausw${ae}hlen"
$form.ClientSize      = New-Object System.Drawing.Size(604, 640)
$form.StartPosition   = "CenterScreen"
$form.BackColor       = $clrBg
$form.ForeColor       = $clrText
$form.Font            = $fontMain
$form.FormBorderStyle = "FixedSingle"
$form.MaximizeBox     = $false
$form.Icon            = [System.Drawing.SystemIcons]::Shield

# Header (0..70)
$pnlHeader = New-Object System.Windows.Forms.Panel
$pnlHeader.Location  = New-Object System.Drawing.Point(0, 0)
$pnlHeader.Size      = New-Object System.Drawing.Size(604, 70)
$pnlHeader.BackColor = $clrPanel

$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text      = "[WLAN]  WLAN-Watchdog"
$lblTitle.Font      = $fontTitle
$lblTitle.ForeColor = $clrText
$lblTitle.Location  = New-Object System.Drawing.Point(20, 10)
$lblTitle.AutoSize  = $true

$lblSubtitle = New-Object System.Windows.Forms.Label
$lblSubtitle.Text      = "W${ae}hle ein Netzwerk aus, das ${ue}berwacht werden soll."
$lblSubtitle.Font      = $fontSmall
$lblSubtitle.ForeColor = $clrSubtext
$lblSubtitle.Location  = New-Object System.Drawing.Point(22, 42)
$lblSubtitle.AutoSize  = $true
$pnlHeader.Controls.AddRange(@($lblTitle, $lblSubtitle))

# Trennlinie (70..72)
$divider = New-Object System.Windows.Forms.Panel
$divider.Location  = New-Object System.Drawing.Point(0, 70)
$divider.Size      = New-Object System.Drawing.Size(604, 2)
$divider.BackColor = $clrAccent

# Toolbar (72..122)
$pnlToolbar = New-Object System.Windows.Forms.Panel
$pnlToolbar.Location  = New-Object System.Drawing.Point(0, 72)
$pnlToolbar.Size      = New-Object System.Drawing.Size(604, 50)
$pnlToolbar.BackColor = $clrBg

$btnScan = New-Object System.Windows.Forms.Button
$btnScan.Text      = ">> Jetzt scannen"
$btnScan.Font      = $fontBold
$btnScan.ForeColor = $clrText
$btnScan.BackColor = $clrAccent
$btnScan.FlatStyle = "Flat"
$btnScan.FlatAppearance.BorderSize = 0
$btnScan.Size      = New-Object System.Drawing.Size(155, 34)
$btnScan.Location  = New-Object System.Drawing.Point(15, 8)
$btnScan.Cursor    = "Hand"

$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text      = "Bitte scannen ..."
$lblStatus.Font      = $fontSmall
$lblStatus.ForeColor = $clrSubtext
$lblStatus.Location  = New-Object System.Drawing.Point(185, 16)
$lblStatus.AutoSize  = $true
$pnlToolbar.Controls.AddRange(@($btnScan, $lblStatus))

# Netzwerkliste (122..484)
$pnlList = New-Object System.Windows.Forms.Panel
$pnlList.Location   = New-Object System.Drawing.Point(0, 122)
$pnlList.Size       = New-Object System.Drawing.Size(604, 362)
$pnlList.BackColor  = $clrBg
$pnlList.AutoScroll = $true

# Countdown-Bereich (484..576)
$pnlCountdown = New-Object System.Windows.Forms.Panel
$pnlCountdown.Location  = New-Object System.Drawing.Point(0, 484)
$pnlCountdown.Size      = New-Object System.Drawing.Size(604, 92)
$pnlCountdown.BackColor = $clrPanel

$lblCountdown = New-Object System.Windows.Forms.Label
$lblCountdown.Text      = "Watchdog inaktiv - kein Countdown"
$lblCountdown.Font      = $fontBold
$lblCountdown.ForeColor = $clrSubtext
$lblCountdown.Location  = New-Object System.Drawing.Point(16, 8)
$lblCountdown.AutoSize  = $true

$lblLastCheck = New-Object System.Windows.Forms.Label
$lblLastCheck.Text      = ""
$lblLastCheck.Font      = $fontSmall
$lblLastCheck.ForeColor = $clrSubtext
$lblLastCheck.AutoSize  = $false
$lblLastCheck.TextAlign = "MiddleRight"
$lblLastCheck.Location  = New-Object System.Drawing.Point(300, 8)
$lblLastCheck.Size      = New-Object System.Drawing.Size(288, 18)

$pnlBarBg = New-Object System.Windows.Forms.Panel
$pnlBarBg.Location  = New-Object System.Drawing.Point(16, 32)
$pnlBarBg.Size      = New-Object System.Drawing.Size($BarWidth, 10)
$pnlBarBg.BackColor = $clrCard

$pnlBarFill = New-Object System.Windows.Forms.Panel
$pnlBarFill.Location  = New-Object System.Drawing.Point(0, 0)
$pnlBarFill.Size      = New-Object System.Drawing.Size(0, 10)
$pnlBarFill.BackColor = $clrAccent
$pnlBarBg.Controls.Add($pnlBarFill)

$lblInfo = New-Object System.Windows.Forms.Label
$lblInfo.Text      = ""
$lblInfo.Font      = $fontSmall
$lblInfo.ForeColor = $clrSubtext
$lblInfo.Location  = New-Object System.Drawing.Point(16, 50)
$lblInfo.AutoSize  = $true

$lblAction = New-Object System.Windows.Forms.Label
$lblAction.Text         = ""
$lblAction.Font         = $fontSmall
$lblAction.ForeColor    = $clrAccentHov
$lblAction.AutoSize     = $false
$lblAction.AutoEllipsis = $true
$lblAction.Location     = New-Object System.Drawing.Point(16, 68)
$lblAction.Size         = New-Object System.Drawing.Size($BarWidth, 18)

$pnlCountdown.Controls.AddRange(@($lblCountdown, $lblLastCheck, $pnlBarBg, $lblInfo, $lblAction))

# Footer (576..640)
$pnlFooter = New-Object System.Windows.Forms.Panel
$pnlFooter.Location  = New-Object System.Drawing.Point(0, 576)
$pnlFooter.Size      = New-Object System.Drawing.Size(604, 64)
$pnlFooter.BackColor = $clrPanel

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text      = "> Watchdog starten"
$btnStart.Font      = $fontBold
$btnStart.ForeColor = $clrText
$btnStart.BackColor = $clrAccent
$btnStart.FlatStyle = "Flat"
$btnStart.FlatAppearance.BorderSize = 0
$btnStart.Size      = New-Object System.Drawing.Size(190, 38)
$btnStart.Location  = New-Object System.Drawing.Point(20, 13)
$btnStart.Cursor    = "Hand"
$btnStart.Enabled   = $false

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Text      = "X Watchdog stoppen"
$btnStop.Font      = $fontBold
$btnStop.ForeColor = $clrText
$btnStop.BackColor = $clrDanger
$btnStop.FlatStyle = "Flat"
$btnStop.FlatAppearance.BorderSize = 0
$btnStop.Size      = New-Object System.Drawing.Size(190, 38)
$btnStop.Location  = New-Object System.Drawing.Point(220, 13)
$btnStop.Cursor    = "Hand"
$btnStop.Enabled   = $false

$lblWdStatus = New-Object System.Windows.Forms.Label
$lblWdStatus.Text      = "Watchdog: [inaktiv]"
$lblWdStatus.Font      = $fontSmall
$lblWdStatus.ForeColor = $clrSubtext
$lblWdStatus.Location  = New-Object System.Drawing.Point(425, 25)
$lblWdStatus.AutoSize  = $true
$pnlFooter.Controls.AddRange(@($btnStart, $btnStop, $lblWdStatus))

$form.Controls.AddRange(@($pnlHeader, $divider, $pnlToolbar, $pnlList, $pnlCountdown, $pnlFooter))

# ============================================================
#  Zeilen-Auswahl
#  Kein GetNewClosure: Die Daten stecken im Tag der Zeile,
#  Kind-Labels verweisen per Tag auf ihre Zeile.
# ============================================================
function Get-RowPanel {
    param($Control)
    if ($Control.Tag -is [System.Windows.Forms.Panel]) { return $Control.Tag }
    return $Control
}

function Select-NetworkRow {
    param($Row)
    if ($null -eq $Row -or $null -eq $Row.Tag) { return }
    if ($null -ne $state.SelectedRow) { $state.SelectedRow.BackColor = $clrCard }

    $state.SelectedRow   = $Row
    $state.SelectedSsid  = [string]$Row.Tag.Ssid
    $Row.BackColor       = $clrRowSel

    $lblStatus.Text      = "Ausgew${ae}hlt: $($Row.Tag.Ssid)  ($($Row.Tag.Signal) %)"
    $lblStatus.ForeColor = $clrAccentHov
    $btnStart.Enabled    = $true
}

$onRowClick = {
    param($sender, $e)
    Select-NetworkRow -Row (Get-RowPanel $sender)
}
$onRowEnter = {
    param($sender, $e)
    $r = Get-RowPanel $sender
    if (-not [object]::ReferenceEquals($r, $state.SelectedRow)) { $r.BackColor = $clrRowHov }
}
$onRowLeave = {
    param($sender, $e)
    $r = Get-RowPanel $sender
    if (-not [object]::ReferenceEquals($r, $state.SelectedRow)) { $r.BackColor = $clrCard }
}

function New-RowLabel {
    param([string]$Text, $Font, $Color, [int]$X, [int]$Y)
    $l = New-Object System.Windows.Forms.Label
    $l.Text      = $Text
    $l.Font      = $Font
    $l.ForeColor = $Color
    $l.AutoSize  = $true
    $l.Location  = New-Object System.Drawing.Point($X, $Y)
    return $l
}

function Build-NetworkRows {
    param($Networks)

    $state.SelectedRow  = $null
    $state.SelectedSsid = $null
    $pnlList.Controls.Clear()

    if (@($Networks).Count -eq 0) {
        $pnlList.Controls.Add((New-RowLabel "Keine Netzwerke gefunden." $fontMain $clrSubtext 20 20))
        return
    }

    $yPos = 8
    foreach ($net in @($Networks)) {
        $row = New-Object System.Windows.Forms.Panel
        $row.Size      = New-Object System.Drawing.Size(570, 62)
        $row.Location  = New-Object System.Drawing.Point(14, $yPos)
        $row.BackColor = $clrCard
        $row.Cursor    = "Hand"
        $row.Tag       = [PSCustomObject]@{ Ssid = $net.Ssid; Signal = $net.Signal }

        $authText = if ($net.Auth) { $net.Auth } else { "?" }
        $labels = @(
            (New-RowLabel (Get-SignalBar -Signal $net.Signal) $fontMono  (Get-SignalColor -Signal $net.Signal) 12  10),
            (New-RowLabel $net.Ssid                           $fontBold  $clrText                              12  34),
            (New-RowLabel "$($net.Signal) %"                  $fontSmall (Get-SignalColor -Signal $net.Signal) 90  10),
            (New-RowLabel $authText                           $fontSmall $clrSubtext                           150 10)
        )
        if ($net.Connected) {
            $labels += (New-RowLabel "* Verbunden" $fontSmall $clrSuccess 460 22)
        }

        foreach ($lbl in $labels) {
            $lbl.Tag    = $row
            $lbl.Cursor = "Hand"
            $lbl.Add_Click($onRowClick)
            $lbl.Add_MouseEnter($onRowEnter)
            $lbl.Add_MouseLeave($onRowLeave)
            $row.Controls.Add($lbl)
        }
        $row.Add_Click($onRowClick)
        $row.Add_MouseEnter($onRowEnter)
        $row.Add_MouseLeave($onRowLeave)

        $pnlList.Controls.Add($row)
        $yPos += 68
    }
}

# ============================================================
#  Scan
# ============================================================
function Invoke-Scan {
    $btnScan.Enabled     = $false
    $btnStart.Enabled    = $false
    $lblStatus.Text      = "Scanne Netzwerke ..."
    $lblStatus.ForeColor = $clrWarn
    $form.Refresh()

    try {
        $nets = Get-AvailableNetworks
        Build-NetworkRows -Networks $nets
        $lblStatus.Text      = "$(@($nets).Count) Netzwerk(e) gefunden. Bitte eins anklicken."
        $lblStatus.ForeColor = $clrSubtext
    } catch {
        $lblStatus.Text      = "Fehler beim Scannen - Details im Dialog."
        $lblStatus.ForeColor = $clrDanger
        Show-ErrorDialog -Title "Scan-Fehler" -Message ("{0}`r`n`r`n{1}" -f $_.Exception.Message, $_.ScriptStackTrace)
    }
    $btnScan.Enabled = $true
}

# ============================================================
#  Countdown & Watchdog-Status (jede Sekunde)
# ============================================================
function Update-WatchdogStatus {
    $st      = Get-WatchdogStatus
    $running = Test-WatchdogRunning -Status $st
    $btnStop.Enabled = $running

    if (-not $running) {
        $lblWdStatus.Text       = "Watchdog: [inaktiv]"
        $lblWdStatus.ForeColor  = $clrSubtext
        $lblCountdown.Text      = "Watchdog inaktiv - kein Countdown"
        $lblCountdown.ForeColor = $clrSubtext
        $lblLastCheck.Text      = ""
        $lblInfo.Text           = "W${ae}hle ein Netzwerk und starte den Watchdog."
        $lblAction.Text         = ""
        $pnlBarFill.Width       = 0

        # Abgestuerzter Watchdog: Fehler genau einmal anzeigen
        if ($st -and $st.State -eq 'Error' -and [long]$st.UpdatedUnix -ne $state.ErrorShownFor) {
            $state.ErrorShownFor = [long]$st.UpdatedUnix
            Show-ErrorDialog -Title "Watchdog abgest${ue}rzt" `
                -Message ("{0}`r`n`r`nLetzte Log-Eintraege:`r`n{1}" -f $st.ErrorText, (Get-LogTail))
        }
        return
    }

    $lblWdStatus.Text      = "Watchdog: [aktiv]"
    $lblWdStatus.ForeColor = $clrSuccess

    $now      = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $interval = [int]$st.Interval
    if ($interval -le 0) { $interval = $CheckInterval }
    $remaining = [long]$st.NextCheckUnix - $now
    if ($remaining -lt 0)         { $remaining = 0 }
    if ($remaining -gt $interval) { $remaining = $interval }

    switch ($st.State) {
        'Starting' {
            $lblCountdown.Text      = "Watchdog startet, erster Scan l${ae}uft ..."
            $lblCountdown.ForeColor = $clrWarn
            $pnlBarFill.BackColor   = $clrWarn
            $pnlBarFill.Width       = $BarWidth
        }
        'Reconnecting' {
            $target = if ($st.Ssid) { $st.Ssid } else { "WLAN" }
            $lblCountdown.Text      = "Verbinde neu mit $target ..."
            $lblCountdown.ForeColor = $clrWarn
            $pnlBarFill.BackColor   = $clrWarn
            $pnlBarFill.Width       = $BarWidth
        }
        default {
            if ($remaining -le 0) {
                $lblCountdown.Text = "Scan l${ae}uft ..."
            } else {
                $lblCountdown.Text = "Sekunden bis zum n${ae}chsten Scan: $remaining"
            }
            $barColor = if ($st.LastOnline) { $clrAccent } else { $clrDanger }
            $lblCountdown.ForeColor = $clrText
            $pnlBarFill.BackColor   = $barColor
            $pnlBarFill.Width       = [int]($BarWidth * $remaining / $interval)
        }
    }

    # Keine Rueckmeldung ueber das Intervall hinaus -> Warnung
    if ($st.State -ne 'Reconnecting' -and ($now - [long]$st.UpdatedUnix) -gt ($interval + 60)) {
        $lblCountdown.Text      = "Keine R${ue}ckmeldung vom Watchdog seit $(Format-UnixTime ([long]$st.UpdatedUnix))"
        $lblCountdown.ForeColor = $clrWarn
    }

    if ([long]$st.LastCheckUnix -gt 0) {
        $res = if ($st.LastOnline) { "Online" } else { "Offline" }
        $lblLastCheck.Text      = "Letzte Pr${ue}fung: $(Format-UnixTime ([long]$st.LastCheckUnix)) - $res"
        $lblLastCheck.ForeColor = if ($st.LastOnline) { $clrSuccess } else { $clrDanger }
    }

    $netName = if ($st.Ssid) { $st.Ssid } else { "alle gespeicherten" }
    $lblInfo.Text = "Netz: $netName   |   Fehlversuche: $($st.FailCount)/$($st.MaxFails)   |   Reconnects: $($st.Reconnects)"
    $lblAction.Text = if ($st.LastMessage) { "Letzte Aktion: $($st.LastMessage)" } else { "" }
}

# ============================================================
#  Buttons
# ============================================================
$btnScan.Add_Click({ Invoke-Scan })
$btnScan.Add_MouseEnter({ $btnScan.BackColor = $clrAccentHov })
$btnScan.Add_MouseLeave({ $btnScan.BackColor = $clrAccent })
$btnStart.Add_MouseEnter({ if ($btnStart.Enabled) { $btnStart.BackColor = $clrAccentHov } })
$btnStart.Add_MouseLeave({ $btnStart.BackColor = $clrAccent })

$btnStart.Add_Click({
    if (-not $state.SelectedSsid) {
        Show-ErrorDialog -Title "Kein Netzwerk" -Message "Bitte zuerst ein Netzwerk in der Liste anklicken."
        return
    }
    if (-not (Test-Path $WatchdogPs1)) {
        Show-ErrorDialog -Title "Datei fehlt" -Message "wifi-watchdog.ps1 nicht gefunden in:`r`n$WatchdogPs1"
        return
    }

    # Vorab-Pruefung: Syntaxfehler sofort sichtbar machen
    foreach ($file in @($WatchdogPs1, $CommonPs1)) {
        $syntax = Get-SyntaxErrors -Path $file
        if ($syntax) {
            Show-ErrorDialog -Title "Syntaxfehler in $(Split-Path $file -Leaf)" -Message $syntax
            return
        }
    }

    # Ohne gespeichertes Profil (Passwort) kann nicht automatisch verbunden werden
    if (-not (Test-WifiProfileExists -Ssid $state.SelectedSsid)) {
        $profiles = (@(Get-SavedWifiProfiles) | ForEach-Object { "  - $_" }) -join "`r`n"
        if (-not $profiles) { $profiles = "  (keine)" }
        Show-ErrorDialog -Title "Kein gespeichertes WLAN-Profil" -Message (
            "F${ue}r '$($state.SelectedSsid)' ist in Windows kein WLAN-Profil gespeichert.`r`n" +
            "Ohne Profil (Passwort) kann der Watchdog nicht automatisch verbinden.`r`n`r`n" +
            "L${oe}sung: Einmal in Windows ${ue}ber das WLAN-Symbol mit dem Netz verbinden " +
            "und 'Automatisch verbinden' anhaken. Danach den Watchdog erneut starten.`r`n`r`n" +
            "Gespeicherte Profile:`r`n$profiles")
        return
    }

    Stop-Watchdog
    if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

    $ssidArg = $state.SelectedSsid -replace '"', '\"'
    $psArgs  = "-NoProfile -ExecutionPolicy Bypass -File `"$WatchdogPs1`" " +
               "-Ssid `"$ssidArg`" -LogDir `"$LogDir`" -PingHost `"8.8.8.8`" -Interval $CheckInterval"

    try {
        $proc = Start-Process powershell.exe -ArgumentList $psArgs -WindowStyle Hidden -PassThru
    } catch {
        Show-ErrorDialog -Title "Start fehlgeschlagen" -Message $_.Exception.Message
        return
    }

    $lblStatus.Text      = "Watchdog wird gestartet ..."
    $lblStatus.ForeColor = $clrWarn

    # 4 Sekunden pruefen, ob der Prozess ueberlebt (UI bleibt bedienbar)
    for ($i = 0; $i -lt 40 -and -not $proc.HasExited; $i++) {
        Start-Sleep -Milliseconds 100
        [System.Windows.Forms.Application]::DoEvents()
    }

    if ($proc.HasExited) {
        $lblStatus.Text      = "Watchdog konnte nicht starten - Details im Dialog."
        $lblStatus.ForeColor = $clrDanger
        Show-ErrorDialog -Title "Watchdog-Start fehlgeschlagen" `
            -Message ("Der Prozess wurde sofort beendet (Exit-Code {0}).`r`n`r`nLetzte Log-Eintraege:`r`n{1}" -f $proc.ExitCode, (Get-LogTail))
        return
    }

    $lblStatus.Text      = "Watchdog l${ae}uft f${ue}r: $($state.SelectedSsid)"
    $lblStatus.ForeColor = $clrSuccess
    Update-WatchdogStatus
})

$btnStop.Add_Click({
    Stop-Watchdog
    $lblStatus.Text      = "Watchdog gestoppt."
    $lblStatus.ForeColor = $clrSubtext
    Update-WatchdogStatus
})

# ============================================================
#  Timer (1 s) & Start
# ============================================================
$timer          = New-Object System.Windows.Forms.Timer
$timer.Interval = 1000
$timer.Add_Tick({ Update-WatchdogStatus })

$form.Add_Shown({
    Update-WatchdogStatus
    $timer.Start()
    Invoke-Scan
})
$form.Add_FormClosed({ $timer.Stop(); $timer.Dispose() })

[void]$form.ShowDialog()
