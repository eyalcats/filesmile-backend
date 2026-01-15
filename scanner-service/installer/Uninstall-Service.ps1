#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Uninstalls FileSmilesScanner Windows Service
.DESCRIPTION
    This script stops and removes the FileSmilesScanner Windows Service
    and optionally removes the installation files.
#>

param(
    [string]$InstallPath = "$env:ProgramFiles\FileSmilesScanner",
    [string]$ServiceName = "FileSmilesScanner",
    [switch]$KeepFiles
)

$ErrorActionPreference = "Stop"

Write-Host "Uninstalling FileSmilesScanner Service..." -ForegroundColor Cyan

# Check if service exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Stopping service..." -ForegroundColor Gray
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    Write-Host "Removing service..." -ForegroundColor Gray
    sc.exe delete $ServiceName
    Start-Sleep -Seconds 2

    Write-Host "Service removed." -ForegroundColor Green
} else {
    Write-Host "Service not found." -ForegroundColor Yellow
}

# Remove files unless -KeepFiles is specified
if (-not $KeepFiles) {
    if (Test-Path $InstallPath) {
        Write-Host "Removing installation files from $InstallPath..." -ForegroundColor Gray
        Remove-Item -Path $InstallPath -Recurse -Force
        Write-Host "Files removed." -ForegroundColor Green
    }
} else {
    Write-Host "Keeping installation files at $InstallPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "FileSmilesScanner has been uninstalled." -ForegroundColor Green
