using System.Drawing;
using System.Drawing.Imaging;
using FileSmilesScanner.Api.Models;
using NTwain;
using NTwain.Data;

namespace FileSmilesScanner.Services;

/// <summary>
/// TWAIN scanner service implementation using NTwain.
/// Uses a dedicated STA thread with Windows Forms for TWAIN message handling.
/// Thread-safe implementation with proper synchronization.
/// </summary>
public class TwainService : ITwainService, IDisposable
{
    private readonly ILogger<TwainService> _logger;
    private readonly object _scanLock = new();
    private readonly object _stateLock = new();

    private Thread? _twainThread;
    private TwainSession? _session;
    private Form? _hiddenForm;
    private volatile bool _disposed;
    private volatile bool _initialized;
    private volatile bool _threadAlive;
    private readonly ManualResetEventSlim _initEvent = new(false);

    // Scan state - protected by _scanLock
    private TaskCompletionSource<ScanResponse>? _scanTcs;
    private List<ScannedImage> _scannedImages = new();
    private DataSource? _currentSource;
    private bool _scanInProgress;

    public TwainService(ILogger<TwainService> logger)
    {
        _logger = logger;
        StartTwainThread();
    }

    public bool IsAvailable
    {
        get
        {
            try
            {
                return PlatformInfo.Current.IsSupported && _initialized && _threadAlive;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error checking TWAIN availability");
                return false;
            }
        }
    }

    private void StartTwainThread()
    {
        _twainThread = new Thread(TwainThreadProc)
        {
            Name = "TwainThread",
            IsBackground = true
        };
        _twainThread.SetApartmentState(ApartmentState.STA);
        _twainThread.Start();

        // Wait for initialization
        if (!_initEvent.Wait(TimeSpan.FromSeconds(10)))
        {
            _logger.LogWarning("TWAIN thread initialization timeout");
        }
    }

    private void TwainThreadProc()
    {
        _threadAlive = true;
        try
        {
            _logger.LogInformation("TWAIN thread starting...");

            // Create hidden form for TWAIN message handling
            _hiddenForm = new Form
            {
                Text = "FileSmilesScanner TWAIN",
                ShowInTaskbar = false,
                WindowState = FormWindowState.Minimized,
                FormBorderStyle = FormBorderStyle.None,
                Size = new Size(1, 1),
                StartPosition = FormStartPosition.Manual,
                Location = new Point(-32000, -32000)
            };

            _hiddenForm.HandleCreated += (s, e) =>
            {
                _logger.LogInformation("Hidden form handle created: {Handle}", _hiddenForm.Handle);
            };

            _hiddenForm.Load += (s, e) =>
            {
                _hiddenForm.Visible = false;
                InitializeTwainSession();
            };

            _hiddenForm.FormClosed += (s, e) =>
            {
                _logger.LogWarning("Hidden form was closed - TWAIN thread will exit");
                _threadAlive = false;
            };

            // Run Windows Forms message loop
            _logger.LogInformation("Starting Windows Forms message loop");
            Application.Run(_hiddenForm);
            _logger.LogInformation("Windows Forms message loop exited");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in TWAIN thread");
        }
        finally
        {
            _threadAlive = false;
            _initEvent.Set();
            _logger.LogInformation("TWAIN thread exiting");
        }
    }

    private void InitializeTwainSession()
    {
        try
        {
            _logger.LogInformation("Initializing TWAIN session...");

            var appId = TWIdentity.CreateFromAssembly(DataGroups.Image, typeof(TwainService).Assembly);
            _session = new TwainSession(appId);

            // Hook up events with exception protection
            _session.TransferReady += SafeTransferReady;
            _session.DataTransferred += SafeDataTransferred;
            _session.TransferError += SafeTransferError;
            _session.SourceDisabled += SafeSourceDisabled;

            // Open session
            var rc = _session.Open();
            _logger.LogInformation("TWAIN session opened: {ReturnCode}, State: {State}", rc, _session.State);

            _initialized = rc == ReturnCode.Success;

            if (_initialized)
            {
                _logger.LogInformation("TWAIN initialized successfully");
            }
            else
            {
                _logger.LogError("TWAIN initialization failed with code: {ReturnCode}", rc);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing TWAIN session");
            _initialized = false;
        }
        finally
        {
            _initEvent.Set();
        }
    }

    // Safe event wrappers to prevent exceptions from crashing the message loop
    private void SafeTransferReady(object? sender, TransferReadyEventArgs e)
    {
        try { Session_TransferReady(sender, e); }
        catch (Exception ex) { _logger.LogError(ex, "Exception in TransferReady handler"); }
    }

    private void SafeDataTransferred(object? sender, DataTransferredEventArgs e)
    {
        try { Session_DataTransferred(sender, e); }
        catch (Exception ex) { _logger.LogError(ex, "Exception in DataTransferred handler"); }
    }

    private void SafeTransferError(object? sender, TransferErrorEventArgs e)
    {
        try { Session_TransferError(sender, e); }
        catch (Exception ex) { _logger.LogError(ex, "Exception in TransferError handler"); }
    }

    private void SafeSourceDisabled(object? sender, EventArgs e)
    {
        try { Session_SourceDisabled(sender, e); }
        catch (Exception ex) { _logger.LogError(ex, "Exception in SourceDisabled handler"); }
    }

    public Task<List<DeviceInfo>> GetDevicesAsync()
    {
        var tcs = new TaskCompletionSource<List<DeviceInfo>>();

        if (!_initialized || _hiddenForm == null || _session == null || !_threadAlive)
        {
            _logger.LogWarning("TWAIN not available: initialized={Initialized}, threadAlive={ThreadAlive}",
                _initialized, _threadAlive);
            tcs.SetResult(new List<DeviceInfo>());
            return tcs.Task;
        }

        try
        {
            _hiddenForm.BeginInvoke(() =>
            {
                var devices = new List<DeviceInfo>();
                try
                {
                    var sources = _session.GetSources().ToList();
                    _logger.LogInformation("Found {Count} TWAIN sources", sources.Count);

                    var defaultSource = _session.DefaultSource;

                    foreach (var source in sources)
                    {
                        devices.Add(new DeviceInfo
                        {
                            Id = source.Name,
                            Name = source.Name,
                            Type = "twain",
                            IsDefault = defaultSource != null && source.Name == defaultSource.Name
                        });
                    }

                    if (devices.Count > 0 && !devices.Any(d => d.IsDefault))
                    {
                        devices[0].IsDefault = true;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error enumerating TWAIN devices");
                }
                tcs.TrySetResult(devices);
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error invoking on TWAIN thread");
            tcs.TrySetResult(new List<DeviceInfo>());
        }

        return tcs.Task;
    }

    public Task<ScanResponse> ScanAsync(string? deviceId, ScanSettings settings, IProgress<int>? progress = null)
    {
        TaskCompletionSource<ScanResponse> tcs;

        lock (_scanLock)
        {
            // Check if scan is already in progress
            if (_scanInProgress)
            {
                return Task.FromResult(new ScanResponse { Error = "A scan is already in progress" });
            }

            if (!_initialized || _hiddenForm == null || _session == null || !_threadAlive)
            {
                _logger.LogWarning("TWAIN not available for scanning");
                return Task.FromResult(new ScanResponse { Error = "TWAIN not initialized or thread not running" });
            }

            _scanInProgress = true;
            tcs = new TaskCompletionSource<ScanResponse>();
            _scanTcs = tcs;
            _scannedImages.Clear();
        }

        try
        {
            _hiddenForm.BeginInvoke(() => ExecuteScan(deviceId, settings));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error invoking scan on TWAIN thread");
            CompleteScan(new ScanResponse { Error = ex.Message });
        }

        // Add timeout - 60 seconds should be enough for most scans
        var timeoutCts = new CancellationTokenSource();
        Task.Delay(TimeSpan.FromSeconds(60), timeoutCts.Token).ContinueWith(t =>
        {
            if (!t.IsCanceled)
            {
                _logger.LogWarning("Scan timeout reached");
                CompleteScan(new ScanResponse { Error = "Scan timeout - operation took too long" });

                // Try to close source on TWAIN thread
                try { _hiddenForm?.BeginInvoke(CloseCurrentSource); }
                catch { /* ignore */ }
            }
        });

        // Cancel timeout when scan completes
        tcs.Task.ContinueWith(_ => timeoutCts.Cancel(), TaskContinuationOptions.ExecuteSynchronously);

        return tcs.Task;
    }

    private void ExecuteScan(string? deviceId, ScanSettings settings)
    {
        try
        {
            // Close any previously open source
            CloseCurrentSource();

            // Find source
            DataSource? source = null;
            if (!string.IsNullOrEmpty(deviceId))
            {
                source = _session!.GetSources().FirstOrDefault(s => s.Name == deviceId);
            }
            source ??= _session!.DefaultSource;

            if (source == null)
            {
                CompleteScan(new ScanResponse { Error = "No scanner source found" });
                return;
            }

            _logger.LogInformation("Opening source: {SourceName}", source.Name);

            var openRc = source.Open();
            _logger.LogInformation("Source.Open returned: {ReturnCode}", openRc);

            if (openRc != ReturnCode.Success)
            {
                CompleteScan(new ScanResponse { Error = $"Failed to open scanner: {openRc}" });
                return;
            }

            lock (_stateLock)
            {
                _currentSource = source;
            }

            ConfigureSource(source, settings);

            _logger.LogInformation("Starting scan with ShowUI: {ShowUI}", settings.ShowUI);

            // Enable source - always use ShowUI mode because NoUI causes crashes with many drivers
            // NoUI mode (SourceEnableMode.NoUI) causes native access violations (0xC0000005)
            // with virtual scanners and some physical scanner drivers.
            // VintaSoft and other commercial solutions work around this by using different
            // TWAIN API paths or by always using ShowUI mode.
            var enableMode = SourceEnableMode.ShowUI;

            if (!settings.ShowUI)
            {
                _logger.LogWarning("NoUI mode requested but is disabled due to driver compatibility issues. Using ShowUI mode instead.");
            }

            var enableRc = source.Enable(enableMode, false, _hiddenForm!.Handle);
            _logger.LogInformation("Source.Enable returned: {ReturnCode}", enableRc);

            if (enableRc != ReturnCode.Success)
            {
                CloseCurrentSource();
                CompleteScan(new ScanResponse { Error = $"Failed to start scan: {enableRc}" });
            }
            // If success, events will handle the rest
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during scan execution");
            CloseCurrentSource();
            CompleteScan(new ScanResponse { Error = ex.Message });
        }
    }

    private void CompleteScan(ScanResponse response)
    {
        TaskCompletionSource<ScanResponse>? tcs;

        lock (_scanLock)
        {
            tcs = _scanTcs;
            _scanTcs = null;
            _scanInProgress = false;
        }

        if (tcs != null)
        {
            if (tcs.TrySetResult(response))
            {
                _logger.LogInformation("Scan completed: Success={Success}, Images={Count}, Error={Error}",
                    response.Success, response.Images.Count, response.Error ?? "none");
            }
            else
            {
                _logger.LogWarning("Could not set scan result - already completed");
            }
        }
    }

    private void CloseCurrentSource()
    {
        DataSource? source;
        lock (_stateLock)
        {
            source = _currentSource;
            _currentSource = null;
        }

        if (source != null)
        {
            try
            {
                if (source.IsOpen)
                {
                    _logger.LogInformation("Closing source: {SourceName}", source.Name);
                    source.Close();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error closing source");
            }
        }
    }

    private void ConfigureSource(DataSource source, ScanSettings settings)
    {
        try
        {
            var xRes = source.Capabilities.ICapXResolution;
            if (xRes.IsSupported)
                xRes.SetValue((TWFix32)settings.Resolution);

            var yRes = source.Capabilities.ICapYResolution;
            if (yRes.IsSupported)
                yRes.SetValue((TWFix32)settings.Resolution);

            var pixelType = source.Capabilities.ICapPixelType;
            if (pixelType.IsSupported)
            {
                var pt = settings.ColorMode switch
                {
                    "bw" => PixelType.BlackWhite,
                    "gray" => PixelType.Gray,
                    "rgb" => PixelType.RGB,
                    _ => PixelType.Gray
                };
                pixelType.SetValue(pt);
            }

            if (settings.Duplex)
            {
                var duplex = source.Capabilities.CapDuplexEnabled;
                if (duplex.IsSupported)
                    duplex.SetValue(BoolType.True);
            }

            if (settings.AutoFeeder)
            {
                var feeder = source.Capabilities.CapFeederEnabled;
                if (feeder.IsSupported)
                {
                    feeder.SetValue(BoolType.True);
                    var autoFeed = source.Capabilities.CapAutoFeed;
                    if (autoFeed.IsSupported)
                        autoFeed.SetValue(BoolType.True);
                }
            }

            _logger.LogInformation(
                "Configured: Resolution={Resolution}, ColorMode={ColorMode}, Duplex={Duplex}, AutoFeeder={AutoFeeder}",
                settings.Resolution, settings.ColorMode, settings.Duplex, settings.AutoFeeder);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error configuring scanner capabilities");
        }
    }

    private void Session_TransferReady(object? sender, TransferReadyEventArgs e)
    {
        _logger.LogDebug("Transfer ready");
    }

    private void Session_DataTransferred(object? sender, DataTransferredEventArgs e)
    {
        _logger.LogInformation("Data transferred, processing image...");

        try
        {
            ScannedImage? image = null;

            if (e.NativeData != IntPtr.Zero)
            {
                using var stream = e.GetNativeImageStream();
                if (stream != null)
                {
                    using var bmp = new Bitmap(stream);
                    image = ConvertBitmapToScannedImage(bmp);
                }
            }

            if (image == null && !string.IsNullOrEmpty(e.FileDataPath) && File.Exists(e.FileDataPath))
            {
                using var bmp = new Bitmap(e.FileDataPath);
                image = ConvertBitmapToScannedImage(bmp);
            }

            if (image != null)
            {
                lock (_scanLock)
                {
                    _scannedImages.Add(image);
                }
                _logger.LogInformation("Image captured: {Width}x{Height}, DataSize={DataSize}KB",
                    image.Width, image.Height, image.Data.Length / 1024);
            }
            else
            {
                _logger.LogWarning("No image data received in DataTransferred event");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing transferred image");
            // Don't fail the whole scan, just skip this image
        }
    }

    private void Session_TransferError(object? sender, TransferErrorEventArgs e)
    {
        _logger.LogError("Transfer error: {Message}", e.Exception?.Message ?? "Unknown");
        CloseCurrentSource();
        CompleteScan(new ScanResponse { Error = e.Exception?.Message ?? "Transfer error" });
    }

    private void Session_SourceDisabled(object? sender, EventArgs e)
    {
        _logger.LogInformation("Source disabled event fired");

        List<ScannedImage> images;
        lock (_scanLock)
        {
            images = new List<ScannedImage>(_scannedImages);
        }

        CloseCurrentSource();

        var response = new ScanResponse { Images = images };
        _logger.LogInformation("Returning scan response with {Count} images", response.Images.Count);

        CompleteScan(response);
    }

    private ScannedImage ConvertBitmapToScannedImage(Bitmap bitmap)
    {
        using var ms = new MemoryStream();
        bitmap.Save(ms, ImageFormat.Png);
        return new ScannedImage
        {
            Data = Convert.ToBase64String(ms.ToArray()),
            Width = bitmap.Width,
            Height = bitmap.Height,
            MimeType = "image/png"
        };
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        _logger.LogInformation("Disposing TwainService...");

        try
        {
            if (_hiddenForm != null && _threadAlive)
            {
                _hiddenForm.BeginInvoke(() =>
                {
                    try
                    {
                        CloseCurrentSource();
                        if (_session?.State >= 3)
                            _session.Close();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Error closing TWAIN session");
                    }

                    _hiddenForm?.Close();
                    Application.ExitThread();
                });

                _twainThread?.Join(TimeSpan.FromSeconds(5));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error during disposal");
        }

        _initEvent.Dispose();
        GC.SuppressFinalize(this);

        _logger.LogInformation("TwainService disposed");
    }
}
