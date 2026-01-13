namespace FileSmilesScanner.Api.Models;

public class ScanResponse
{
    public List<ScannedImage> Images { get; set; } = [];
    public string? Error { get; set; }
    public bool Success => string.IsNullOrEmpty(Error);
}

public class ScannedImage
{
    /// <summary>
    /// Base64-encoded image data
    /// </summary>
    public required string Data { get; set; }

    /// <summary>
    /// Image width in pixels
    /// </summary>
    public int Width { get; set; }

    /// <summary>
    /// Image height in pixels
    /// </summary>
    public int Height { get; set; }

    /// <summary>
    /// MIME type (image/png, image/jpeg, image/bmp)
    /// </summary>
    public string MimeType { get; set; } = "image/png";
}
