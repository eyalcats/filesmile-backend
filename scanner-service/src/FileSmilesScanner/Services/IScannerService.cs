using FileSmilesScanner.Api.Models;

namespace FileSmilesScanner.Services;

public interface IScannerService : IDisposable
{
    /// <summary>
    /// Get list of available scanner devices
    /// </summary>
    Task<List<DeviceInfo>> GetDevicesAsync();

    /// <summary>
    /// Perform a scan operation
    /// </summary>
    /// <param name="deviceId">Device ID to use, or null for default device</param>
    /// <param name="settings">Scan settings</param>
    /// <param name="progress">Optional progress callback (0-100)</param>
    /// <returns>Scan result with images</returns>
    Task<ScanResponse> ScanAsync(string? deviceId, ScanSettings settings, IProgress<int>? progress = null);

    /// <summary>
    /// Check if scanning is available on this system
    /// </summary>
    bool IsAvailable { get; }
}
