# FileSmilesScanner Control Panel
# Simple GUI for managing the FileSmilesScanner Windows Service

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ServiceName = "FileSmilesScanner"
$ServicePort = 25319

# Helper Functions
function Get-ServiceStatus {
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        return $service.Status.ToString()
    }
    return "Not Installed"
}

function Test-ApiResponding {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$ServicePort/api/VintasoftTwainApi/Status" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        return ($response.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Update-StatusDisplay {
    $status = Get-ServiceStatus
    $apiOk = Test-ApiResponding

    # Update status label
    $script:lblServiceStatus.Text = $status
    $script:lblApiStatus.Text = if ($apiOk) { "Responding" } else { "Not Responding" }

    # Color coding
    switch ($status) {
        "Running" {
            $script:lblServiceStatus.ForeColor = [System.Drawing.Color]::Green
            $script:pnlStatus.BackColor = [System.Drawing.Color]::FromArgb(240, 255, 240)
        }
        "Stopped" {
            $script:lblServiceStatus.ForeColor = [System.Drawing.Color]::Red
            $script:pnlStatus.BackColor = [System.Drawing.Color]::FromArgb(255, 240, 240)
        }
        default {
            $script:lblServiceStatus.ForeColor = [System.Drawing.Color]::Orange
            $script:pnlStatus.BackColor = [System.Drawing.Color]::FromArgb(255, 250, 240)
        }
    }

    $script:lblApiStatus.ForeColor = if ($apiOk) { [System.Drawing.Color]::Green } else { [System.Drawing.Color]::Red }

    # Enable/disable buttons based on status
    $script:btnStart.Enabled = ($status -eq "Stopped")
    $script:btnStop.Enabled = ($status -eq "Running")
    $script:btnRestart.Enabled = ($status -eq "Running")
    $script:btnOpenWeb.Enabled = $apiOk
}

# Create Form
$form = New-Object System.Windows.Forms.Form
$form.Text = "FileSmilesScanner Control Panel"
$form.Size = New-Object System.Drawing.Size(420, 340)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9)

# Title Label
$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Location = New-Object System.Drawing.Point(20, 15)
$lblTitle.Size = New-Object System.Drawing.Size(360, 25)
$lblTitle.Text = "FileSmilesScanner Service Manager"
$lblTitle.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($lblTitle)

# Status Panel
$pnlStatus = New-Object System.Windows.Forms.Panel
$pnlStatus.Location = New-Object System.Drawing.Point(20, 50)
$pnlStatus.Size = New-Object System.Drawing.Size(360, 80)
$pnlStatus.BorderStyle = "FixedSingle"
$form.Controls.Add($pnlStatus)

# Service Status Row
$lblServiceLabel = New-Object System.Windows.Forms.Label
$lblServiceLabel.Location = New-Object System.Drawing.Point(15, 15)
$lblServiceLabel.Size = New-Object System.Drawing.Size(120, 20)
$lblServiceLabel.Text = "Service Status:"
$pnlStatus.Controls.Add($lblServiceLabel)

$lblServiceStatus = New-Object System.Windows.Forms.Label
$lblServiceStatus.Location = New-Object System.Drawing.Point(140, 15)
$lblServiceStatus.Size = New-Object System.Drawing.Size(200, 20)
$lblServiceStatus.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$pnlStatus.Controls.Add($lblServiceStatus)

# API Status Row
$lblApiLabel = New-Object System.Windows.Forms.Label
$lblApiLabel.Location = New-Object System.Drawing.Point(15, 40)
$lblApiLabel.Size = New-Object System.Drawing.Size(120, 20)
$lblApiLabel.Text = "API Status:"
$pnlStatus.Controls.Add($lblApiLabel)

$lblApiStatus = New-Object System.Windows.Forms.Label
$lblApiStatus.Location = New-Object System.Drawing.Point(140, 40)
$lblApiStatus.Size = New-Object System.Drawing.Size(200, 20)
$lblApiStatus.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$pnlStatus.Controls.Add($lblApiStatus)

# Port Info
$lblPort = New-Object System.Windows.Forms.Label
$lblPort.Location = New-Object System.Drawing.Point(15, 55)
$lblPort.Size = New-Object System.Drawing.Size(200, 20)
$lblPort.Text = "Port: $ServicePort"
$lblPort.ForeColor = [System.Drawing.Color]::Gray
$pnlStatus.Controls.Add($lblPort)

# Service Control Buttons
$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Location = New-Object System.Drawing.Point(20, 145)
$btnStart.Size = New-Object System.Drawing.Size(110, 35)
$btnStart.Text = "Start"
$btnStart.Add_Click({
    $btnStart.Enabled = $false
    $btnStart.Text = "Starting..."
    $form.Refresh()
    try {
        Start-Service -Name $ServiceName -ErrorAction Stop
        Start-Sleep -Seconds 2
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Failed to start service: $_", "Error", "OK", "Error")
    }
    $btnStart.Text = "Start"
    Update-StatusDisplay
})
$form.Controls.Add($btnStart)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Location = New-Object System.Drawing.Point(140, 145)
$btnStop.Size = New-Object System.Drawing.Size(110, 35)
$btnStop.Text = "Stop"
$btnStop.Add_Click({
    $btnStop.Enabled = $false
    $btnStop.Text = "Stopping..."
    $form.Refresh()
    try {
        Stop-Service -Name $ServiceName -Force -ErrorAction Stop
        Start-Sleep -Seconds 2
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Failed to stop service: $_", "Error", "OK", "Error")
    }
    $btnStop.Text = "Stop"
    Update-StatusDisplay
})
$form.Controls.Add($btnStop)

$btnRestart = New-Object System.Windows.Forms.Button
$btnRestart.Location = New-Object System.Drawing.Point(260, 145)
$btnRestart.Size = New-Object System.Drawing.Size(110, 35)
$btnRestart.Text = "Restart"
$btnRestart.Add_Click({
    $btnRestart.Enabled = $false
    $btnRestart.Text = "Restarting..."
    $form.Refresh()
    try {
        Restart-Service -Name $ServiceName -Force -ErrorAction Stop
        Start-Sleep -Seconds 3
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Failed to restart service: $_", "Error", "OK", "Error")
    }
    $btnRestart.Text = "Restart"
    Update-StatusDisplay
})
$form.Controls.Add($btnRestart)

# Web Interface Button
$btnOpenWeb = New-Object System.Windows.Forms.Button
$btnOpenWeb.Location = New-Object System.Drawing.Point(20, 195)
$btnOpenWeb.Size = New-Object System.Drawing.Size(170, 35)
$btnOpenWeb.Text = "Open Web Interface"
$btnOpenWeb.Add_Click({
    Start-Process "http://localhost:$ServicePort/swagger"
})
$form.Controls.Add($btnOpenWeb)

# Refresh Button
$btnRefresh = New-Object System.Windows.Forms.Button
$btnRefresh.Location = New-Object System.Drawing.Point(260, 195)
$btnRefresh.Size = New-Object System.Drawing.Size(110, 35)
$btnRefresh.Text = "Refresh"
$btnRefresh.Add_Click({ Update-StatusDisplay })
$form.Controls.Add($btnRefresh)

# Links Section
$lnkEventViewer = New-Object System.Windows.Forms.LinkLabel
$lnkEventViewer.Location = New-Object System.Drawing.Point(20, 250)
$lnkEventViewer.Size = New-Object System.Drawing.Size(150, 20)
$lnkEventViewer.Text = "View Event Log"
$lnkEventViewer.Add_LinkClicked({
    Start-Process "eventvwr.msc" -ArgumentList '/c:"Application"'
})
$form.Controls.Add($lnkEventViewer)

$lnkServices = New-Object System.Windows.Forms.LinkLabel
$lnkServices.Location = New-Object System.Drawing.Point(180, 250)
$lnkServices.Size = New-Object System.Drawing.Size(150, 20)
$lnkServices.Text = "Windows Services"
$lnkServices.Add_LinkClicked({
    Start-Process "services.msc"
})
$form.Controls.Add($lnkServices)

# Version Label
$lblVersion = New-Object System.Windows.Forms.Label
$lblVersion.Location = New-Object System.Drawing.Point(20, 275)
$lblVersion.Size = New-Object System.Drawing.Size(360, 20)
$lblVersion.Text = "FileSmilesScanner v1.0.0"
$lblVersion.ForeColor = [System.Drawing.Color]::Gray
$lblVersion.TextAlign = "MiddleCenter"
$form.Controls.Add($lblVersion)

# Initial status update
Update-StatusDisplay

# Show form
$form.ShowDialog() | Out-Null
