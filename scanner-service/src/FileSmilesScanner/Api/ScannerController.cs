using FileSmilesScanner.Api.Models;
using FileSmilesScanner.Services;
using Microsoft.AspNetCore.Mvc;

namespace FileSmilesScanner.Api;

[ApiController]
[Route("api")]
public class ScannerController : ControllerBase
{
    private readonly ITwainService _twainService;
    private readonly ILogger<ScannerController> _logger;

    public ScannerController(ITwainService twainService, ILogger<ScannerController> logger)
    {
        _twainService = twainService;
        _logger = logger;
    }

    /// <summary>
    /// Health check endpoint (VintaSoft compatibility)
    /// </summary>
    [HttpGet("VintasoftTwainApi/Status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Status()
    {
        return Ok(new { status = "ok", twainAvailable = _twainService.IsAvailable });
    }

    /// <summary>
    /// Get list of available scanner devices
    /// </summary>
    [HttpGet("scanner/devices")]
    [ProducesResponseType(typeof(DevicesResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<DevicesResponse>> GetDevices()
    {
        _logger.LogInformation("Getting scanner devices");

        try
        {
            var devices = await _twainService.GetDevicesAsync();
            return Ok(new DevicesResponse { Devices = devices });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting devices");
            return Ok(new DevicesResponse { Devices = [] });
        }
    }

    /// <summary>
    /// Perform a scan operation
    /// </summary>
    [HttpPost("scanner/scan")]
    [ProducesResponseType(typeof(ScanResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ScanResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ScanResponse>> Scan([FromBody] ScanRequest request)
    {
        _logger.LogInformation(
            "Scan requested: Device={DeviceId}, Resolution={Resolution}, ColorMode={ColorMode}",
            request.DeviceId ?? "default",
            request.Settings.Resolution,
            request.Settings.ColorMode);

        try
        {
            _logger.LogInformation("Calling TwainService.ScanAsync...");
            var response = await _twainService.ScanAsync(
                request.DeviceId,
                request.Settings);

            if (!response.Success)
            {
                _logger.LogWarning("Scan failed: {Error}", response.Error);
                return BadRequest(response);
            }

            // Calculate total response size for logging
            var totalDataSizeKB = response.Images.Sum(img => img.Data.Length) / 1024;
            _logger.LogInformation("Scan completed: {Count} images, TotalSize={TotalSize}KB",
                response.Images.Count, totalDataSizeKB);

            _logger.LogInformation("Sending response to client...");
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during scan");
            return BadRequest(new ScanResponse { Error = ex.Message });
        }
    }
}
