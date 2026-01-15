#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Installs FileSmilesScanner as a Windows Service
.DESCRIPTION
    This script installs the FileSmilesScanner application as a Windows Service
    that starts automatically with Windows.
#>

param(
    [string]$ServiceName = "FileSmilesScanner",
    [string]$DisplayName = "FileSmilesScanner - Document Scanning Service",
    [string]$Description = "Provides TWAIN/WIA scanner access via REST API for web applications"
)

$ErrorActionPreference = "Stop"

Write-Host "Installing FileSmilesScanner Service..." -ForegroundColor Cyan

# Use current directory as install path
$InstallPath = $PSScriptRoot
$exePath = Join-Path $InstallPath "FileSmilesScanner.exe"

# Verify exe exists
if (-not (Test-Path $exePath)) {
    Write-Host "ERROR: FileSmilesScanner.exe not found in $InstallPath" -ForegroundColor Red
    exit 1
}

# Check if service already exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Service already exists. Stopping and removing..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    sc.exe delete $ServiceName
    Start-Sleep -Seconds 2
}

# Create the Windows Service
Write-Host "Creating Windows Service..." -ForegroundColor Gray
sc.exe create $ServiceName binPath= "`"$exePath`"" start= auto DisplayName= "$DisplayName"
sc.exe description $ServiceName "$Description"
sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/10000/restart/30000

# Start the service
Write-Host "Starting service..." -ForegroundColor Gray
Start-Service -Name $ServiceName

# Verify service is running
Start-Sleep -Seconds 2
$service = Get-Service -Name $ServiceName
if ($service.Status -eq "Running") {
    Write-Host ""
    Write-Host "SUCCESS! FileSmilesScanner service installed and running." -ForegroundColor Green
    Write-Host ""
    Write-Host "Service Details:" -ForegroundColor Cyan
    Write-Host "  Name:         $ServiceName"
    Write-Host "  Status:       $($service.Status)"
    Write-Host "  Install Path: $InstallPath"
    Write-Host ""
    Write-Host "API Endpoints:" -ForegroundColor Cyan
    Write-Host "  HTTP:   http://localhost:25319"
    Write-Host "  HTTPS:  https://localhost:25329"
    Write-Host "  Web UI: http://localhost:25319/"
    Write-Host "  Swagger: http://localhost:25319/swagger"
    Write-Host ""
} else {
    Write-Host "WARNING: Service installed but not running. Status: $($service.Status)" -ForegroundColor Yellow
}
