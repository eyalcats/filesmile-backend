namespace FileSmilesScanner.Api.Models;

public class ScanRequest
{
    public string? DeviceId { get; set; }
    public ScanSettings Settings { get; set; } = new();
}

public class ScanSettings
{
    /// <summary>
    /// Scan resolution in DPI (100, 150, 200, 300, 600)
    /// </summary>
    public int Resolution { get; set; } = 300;

    /// <summary>
    /// Color mode: "bw" (black/white), "gray" (grayscale), "rgb" (color)
    /// </summary>
    public string ColorMode { get; set; } = "gray";

    /// <summary>
    /// Enable duplex (two-sided) scanning
    /// </summary>
    public bool Duplex { get; set; }

    /// <summary>
    /// Enable automatic document feeder
    /// </summary>
    public bool AutoFeeder { get; set; }

    /// <summary>
    /// Show scanner UI dialog. Default is true (ShowUI mode).
    /// Set to false for NoUI mode (may not work with all scanners).
    /// </summary>
    public bool ShowUI { get; set; } = true;
}
