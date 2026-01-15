using FileSmilesScanner.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure Windows Service
builder.Services.AddWindowsService(options =>
{
    options.ServiceName = "FileSmilesScanner";
});

// Configure Kestrel
builder.WebHost.ConfigureKestrel(options =>
{
    // Allow large responses (scanned images can be several MB in base64)
    options.Limits.MaxResponseBufferSize = 100 * 1024 * 1024; // 100MB
    options.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(10);
    options.Limits.RequestHeadersTimeout = TimeSpan.FromMinutes(5);

    options.ListenLocalhost(25319); // HTTP only (HTTPS removed - no cert needed for local service)
});

// Add CORS for browser access (Next.js runs on localhost:3000)
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            {
                var uri = new Uri(origin);
                // Always allow localhost and 127.0.0.1 on any port (for Next.js dev)
                if (uri.Host == "localhost" || uri.Host == "127.0.0.1")
                    return true;
                // Check configured origins for production
                return allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase);
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Add services
builder.Services.AddSingleton<IScannerService, Naps2ScannerService>();
builder.Services.AddControllers();

// Add Swagger for development
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "FileSmilesScanner API",
        Version = "v1",
        Description = "TWAIN scanner service API - VintaSoft replacement"
    });
});

var app = builder.Build();

// Configure middleware
app.UseCors();

// Enable Swagger
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "FileSmilesScanner API v1");
});

app.MapControllers();

app.Run();
