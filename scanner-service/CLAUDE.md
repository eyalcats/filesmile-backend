# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FileSmilesScanner is a Windows service that provides a REST API for TWAIN/WIA scanner access. It uses NAPS2.Sdk for reliable NoUI (no popup dialog) scanning, exposing scanner functionality via HTTP on port 25319.

## Build and Run Commands

```bash
# Build
dotnet build src/FileSmilesScanner/FileSmilesScanner.csproj

# Run in development
dotnet run --project src/FileSmilesScanner/FileSmilesScanner.csproj

# Publish for production
dotnet publish src/FileSmilesScanner/FileSmilesScanner.csproj -c Release -r win-x64 --self-contained false -o publish

# Install as Windows Service (Admin PowerShell)
cd "C:\Program Files\FileSmilesScanner"
.\Install-Service.ps1
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scanner/devices` | GET | List available TWAIN/WIA scanners |
| `/api/scanner/scan` | POST | Perform scan operation |
| `/api/VintasoftTwainApi/Status` | GET | Health check |
| `/swagger` | GET | API documentation |

## Architecture

### Core Components

**Naps2ScannerService** (`Services/Naps2ScannerService.cs`):
- Uses NAPS2.Sdk with Win32 worker process for TWAIN/WIA scanning
- Supports NoUI mode (scanning without dialogs)
- Caches device list for 5 minutes
- Outputs JPEG images (base64 encoded)

**ScannerController** (`Api/ScannerController.cs`):
- REST API endpoints for device enumeration and scanning

### Key Technical Details

1. **NAPS2.Sdk Worker Process**: Uses `SetUpWin32Worker()` for TWAIN compatibility from 64-bit process
2. **NoUI Mode**: `UseNativeUI = false` in ScanOptions
3. **Prerequisites**: .NET 8 ASP.NET Core Runtime

### API Models

- **ScanRequest**: `{ deviceId?, settings: { resolution, colorMode, duplex, autoFeeder, showUI } }`
- **ScanResponse**: `{ images: [{ data, width, height, mimeType }], error?, success }`
- **DeviceInfo**: `{ id, name, type, isDefault }`
