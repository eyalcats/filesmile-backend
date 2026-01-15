using System.Drawing;
using System.Drawing.Imaging;
using FileSmilesScanner.Api.Models;
using NAPS2.Images;
using NAPS2.Images.Gdi;
using NAPS2.Scan;

namespace FileSmilesScanner.Services;

/// <summary>
/// Scanner service implementation using NAPS2.Sdk.
/// Supports TWAIN scanning with NoUI mode via 32-bit worker process.
/// </summary>
public class Naps2ScannerService : IScannerService
{
    private readonly ILogger<Naps2ScannerService> _logger;
    private readonly ScanningContext _scanningContext;
    private readonly ScanController _controller;
    private readonly object _scanLock = new();
    private bool _disposed;
    private bool _initialized;

    // Device cache to avoid re-enumeration on every scan
    private List<ScanDevice>? _cachedDevices;
    private DateTime _devicesCacheTime = DateTime.MinValue;
    private static readonly TimeSpan DeviceCacheDuration = TimeSpan.FromMinutes(5);

    // JPEG encoder for faster image encoding
    private static readonly ImageCodecInfo JpegEncoder = GetEncoder(ImageFormat.Jpeg);
    private static readonly EncoderParameters JpegParams = CreateJpegParams(85);

    public Naps2ScannerService(ILogger<Naps2ScannerService> logger)
    {
        _logger = logger;

        try
        {
            // Initialize NAPS2 scanning context with GDI image handling
            _scanningContext = new ScanningContext(new GdiImageContext());

            // Set up 32-bit worker for TWAIN compatibility from 64-bit process
            _scanningContext.SetUpWin32Worker();

            _controller = new ScanController(_scanningContext);
            _initialized = true;

            _logger.LogInformation("NAPS2 scanning context initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize NAPS2 scanning context");
            _initialized = false;
            _scanningContext = null!;
            _controller = null!;
        }
    }

    public bool IsAvailable => _initialized && !_disposed;

    public async Task<List<DeviceInfo>> GetDevicesAsync()
    {
        if (!IsAvailable)
        {
            _logger.LogWarning("Scanner service not available");
            return new List<DeviceInfo>();
        }

        try
        {
            var deviceList = await GetCachedDevicesAsync();

            return deviceList.Select((d, index) => new DeviceInfo
            {
                Id = d.ID,
                Name = d.Name,
                Type = d.Driver.ToString().ToLower(),
                IsDefault = index == 0
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enumerating TWAIN devices");
            return new List<DeviceInfo>();
        }
    }

    private async Task<List<ScanDevice>> GetCachedDevicesAsync(bool forceRefresh = false)
    {
        if (!forceRefresh && _cachedDevices != null && DateTime.Now - _devicesCacheTime < DeviceCacheDuration)
        {
            _logger.LogDebug("Using cached device list ({Count} devices)", _cachedDevices.Count);
            return _cachedDevices;
        }

        _logger.LogInformation("Enumerating scanner devices...");

        var allDevices = new List<ScanDevice>();

        // Get TWAIN devices
        try
        {
            var twainDevices = await _controller.GetDeviceList(Driver.Twain);
            allDevices.AddRange(twainDevices);
            _logger.LogInformation("Found {Count} TWAIN devices", twainDevices.Count());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error enumerating TWAIN devices");
        }

        // Get WIA devices (Samsung and many modern scanners use WIA)
        try
        {
            var wiaDevices = await _controller.GetDeviceList(Driver.Wia);
            allDevices.AddRange(wiaDevices);
            _logger.LogInformation("Found {Count} WIA devices", wiaDevices.Count());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error enumerating WIA devices");
        }

        _cachedDevices = allDevices;
        _devicesCacheTime = DateTime.Now;
        _logger.LogInformation("Total devices found: {Count}", _cachedDevices.Count);

        return _cachedDevices;
    }

    public async Task<ScanResponse> ScanAsync(
        string? deviceId,
        ScanSettings settings,
        IProgress<int>? progress = null)
    {
        if (!IsAvailable)
        {
            return new ScanResponse { Error = "Scanner service not available" };
        }

        try
        {
            _logger.LogInformation(
                "Starting scan: Device={DeviceId}, Resolution={Resolution}, ColorMode={ColorMode}",
                deviceId ?? "default", settings.Resolution, settings.ColorMode);

            // Get device from cache (fast)
            var deviceList = await GetCachedDevicesAsync();

            ScanDevice? device = null;
            if (!string.IsNullOrEmpty(deviceId))
            {
                device = deviceList.FirstOrDefault(d => d.ID == deviceId);
            }
            device ??= deviceList.FirstOrDefault();

            if (device == null)
            {
                return new ScanResponse { Error = "No scanner device found" };
            }

            _logger.LogInformation("Using device: {DeviceName} ({DeviceId})", device.Name, device.ID);

            // Configure scan options
            var options = new ScanOptions
            {
                Device = device,
                UseNativeUI = false,
                Dpi = settings.Resolution,
                BitDepth = MapColorModeToBitDepth(settings.ColorMode),
                PaperSource = MapPaperSource(settings.Duplex, settings.AutoFeeder)
            };

            // Scan and collect images
            var scannedImages = new List<ScannedImage>();
            int pageCount = 0;

            await foreach (var image in _controller.Scan(options))
            {
                pageCount++;
                progress?.Report(pageCount * 10);

                using (image)
                {
                    // Convert NAPS2 image to bitmap and then to base64
                    using var bitmap = image.RenderToBitmap();
                    var scannedImage = ConvertBitmapToScannedImage(bitmap);
                    scannedImages.Add(scannedImage);

                    _logger.LogInformation(
                        "Captured page {PageNum}: {Width}x{Height}",
                        pageCount, scannedImage.Width, scannedImage.Height);
                }
            }

            progress?.Report(100);

            _logger.LogInformation("Scan completed: {Count} images", scannedImages.Count);

            return new ScanResponse { Images = scannedImages };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during scan operation");
            return new ScanResponse { Error = ex.Message };
        }
    }

    private static BitDepth MapColorModeToBitDepth(string colorMode)
    {
        return colorMode.ToLowerInvariant() switch
        {
            "bw" => BitDepth.BlackAndWhite,
            "gray" => BitDepth.Grayscale,
            "rgb" or "color" => BitDepth.Color,
            _ => BitDepth.Grayscale
        };
    }

    private static PaperSource MapPaperSource(bool duplex, bool autoFeeder)
    {
        if (duplex)
            return PaperSource.Duplex;
        if (autoFeeder)
            return PaperSource.Feeder;
        return PaperSource.Flatbed;
    }

    private static ScannedImage ConvertBitmapToScannedImage(Bitmap bitmap)
    {
        using var ms = new MemoryStream();
        // Use JPEG for much faster encoding (PNG is ~10x slower)
        bitmap.Save(ms, JpegEncoder, JpegParams);
        return new ScannedImage
        {
            Data = Convert.ToBase64String(ms.ToArray()),
            Width = bitmap.Width,
            Height = bitmap.Height,
            MimeType = "image/jpeg"
        };
    }

    private static ImageCodecInfo GetEncoder(ImageFormat format)
    {
        return ImageCodecInfo.GetImageEncoders()
            .First(c => c.FormatID == format.Guid);
    }

    private static EncoderParameters CreateJpegParams(long quality)
    {
        var encoderParams = new EncoderParameters(1);
        encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, quality);
        return encoderParams;
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        try
        {
            _scanningContext?.Dispose();
            _logger.LogInformation("NAPS2 scanning context disposed");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error disposing scanning context");
        }

        GC.SuppressFinalize(this);
    }
}
