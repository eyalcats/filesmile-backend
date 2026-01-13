using FileSmilesScanner.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure Windows Service
builder.Services.AddWindowsService(options =>
{
    options.ServiceName = "FileSmilesScanner";
});

// Configure Kestrel to listen on the same ports as VintaSoft
builder.WebHost.ConfigureKestrel(options =>
{
    // Allow large responses (scanned images can be several MB in base64)
    options.Limits.MaxResponseBufferSize = 100 * 1024 * 1024; // 100MB
    options.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(10);
    options.Limits.RequestHeadersTimeout = TimeSpan.FromMinutes(5);

    options.ListenLocalhost(25319); // HTTP
    options.ListenLocalhost(25329, listenOptions =>
    {
        // HTTPS - use development certificate
        listenOptions.UseHttps();
    });
});

// Add CORS for browser access
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            {
                // Allow localhost and 127.0.0.1 on any port
                var uri = new Uri(origin);
                return uri.Host == "localhost" || uri.Host == "127.0.0.1";
            })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Add services
builder.Services.AddSingleton<ITwainService, TwainService>();
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

// Enable Swagger in development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "FileSmilesScanner API v1");
    });
}

app.MapControllers();

// Add a simple root endpoint
app.MapGet("/", () => Results.Ok(new
{
    service = "FileSmilesScanner",
    version = "1.0.0",
    status = "running"
}));

app.Run();
