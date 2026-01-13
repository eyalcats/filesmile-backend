namespace FileSmilesScanner.Api.Models;

public class DeviceInfo
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public string Type { get; set; } = "twain";
    public bool IsDefault { get; set; }
}

public class DevicesResponse
{
    public List<DeviceInfo> Devices { get; set; } = [];
}
