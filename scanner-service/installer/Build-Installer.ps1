<#
.SYNOPSIS
    Builds the FileSmilesScanner installer package
.DESCRIPTION
    This script publishes the application and creates an installer using Inno Setup.
    If Inno Setup is not installed, it creates a ZIP package instead.
#>

param(
    [string]$Configuration = "Release",
    [switch]$SkipPublish
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $PSCommandPath
$projectRoot = Split-Path -Parent $scriptDir
$projectFile = Join-Path $projectRoot "src\FileSmilesScanner\FileSmilesScanner.csproj"
$publishDir = Join-Path $projectRoot "publish"
$outputDir = Join-Path $scriptDir "output"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FileSmilesScanner Installer Builder  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Publish the application
if (-not $SkipPublish) {
    Write-Host "Step 1: Publishing application..." -ForegroundColor Yellow

    # Clean previous publish
    if (Test-Path $publishDir) {
        Remove-Item -Path $publishDir -Recurse -Force
    }

    # Publish framework-dependent for Windows x64 (requires .NET 8 pre-installed)
    # This reduces size from ~150MB to ~5MB
    dotnet publish $projectFile `
        -c $Configuration `
        -r win-x64 `
        --self-contained false `
        -p:PublishSingleFile=false `
        -o $publishDir

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: dotnet publish failed!" -ForegroundColor Red
        exit 1
    }

    Write-Host "Published to: $publishDir" -ForegroundColor Green
} else {
    Write-Host "Step 1: Skipping publish (using existing files)" -ForegroundColor Yellow
}

Write-Host ""

# Step 2: Create output directory
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Step 3: Try to build with Inno Setup
Write-Host "Step 2: Building installer..." -ForegroundColor Yellow

$innoSetupPath = $null
$innoSetupLocations = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe",
    "${env:LOCALAPPDATA}\Programs\Inno Setup 6\ISCC.exe"
)

foreach ($path in $innoSetupLocations) {
    if (Test-Path $path) {
        $innoSetupPath = $path
        break
    }
}

if ($innoSetupPath) {
    Write-Host "Found Inno Setup at: $innoSetupPath" -ForegroundColor Gray
    $issFile = Join-Path $scriptDir "FileSmilesScanner.iss"

    & $innoSetupPath $issFile

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "SUCCESS! Installer created." -ForegroundColor Green
        Write-Host "Output: $outputDir\FileSmilesScanner-Setup-1.0.0.exe" -ForegroundColor Cyan
    } else {
        Write-Host "ERROR: Inno Setup compilation failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Inno Setup not found. Creating ZIP package instead..." -ForegroundColor Yellow
    Write-Host "Download Inno Setup from: https://jrsoftware.org/isdl.php" -ForegroundColor Gray

    # Create ZIP package
    $zipPath = Join-Path $outputDir "FileSmilesScanner-1.0.0.zip"

    # Copy install scripts and control panel to publish folder
    Copy-Item -Path (Join-Path $scriptDir "Install-Service.ps1") -Destination $publishDir
    Copy-Item -Path (Join-Path $scriptDir "Uninstall-Service.ps1") -Destination $publishDir
    Copy-Item -Path (Join-Path $scriptDir "ServiceControlPanel.ps1") -Destination $publishDir

    # Create ZIP
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }

    Compress-Archive -Path "$publishDir\*" -DestinationPath $zipPath -CompressionLevel Optimal

    Write-Host ""
    Write-Host "SUCCESS! ZIP package created." -ForegroundColor Green
    Write-Host "Output: $zipPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To install manually:" -ForegroundColor Yellow
    Write-Host "  1. Extract the ZIP to a folder (e.g., C:\Program Files\FileSmilesScanner)"
    Write-Host "  2. Run Install-Service.ps1 as Administrator"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build Complete!                      " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
