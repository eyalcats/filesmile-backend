"""
FileSmile FastAPI Application.

This is the main application entry point that configures FastAPI,
registers routes, and sets up middleware.
"""
import sys
import os

# Add the parent directory to Python path to resolve app module imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
import httpx
from app.core.config import settings
from app.api.endpoints import search, attachments, auth, multitenant_auth, admin
from app.services.priority_client import PriorityClientFactory
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for startup and shutdown events.

    Yields:
        Control to the application during its lifetime

    Cleanup:
        Closes all Priority client connections
    """
    # Startup
    print(f"Starting {settings.api_title} v{settings.api_version}")
    print(f"Debug mode: {settings.debug}")

    # Initialize database (create tables if they don't exist)
    print("Initializing database...")
    init_db()
    print("Database initialized")

    yield

    # Shutdown
    print("Shutting down...")
    await PriorityClientFactory.close_all()
    print("All connections closed")


# Create FastAPI application
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="""
    FileSmile API for integrating Outlook and Gmail with Priority ERP.

    ## Features
    - Search Priority documents across configured forms
    - Attach emails and files to Priority documents
    - Export attachments staging for temporary file sharing
    - Simple API access (no authentication required for development)

    ## Workflow
    1. Get search groups and companies
    2. Search for documents
    3. Upload attachments to documents
    """,
    lifespan=lifespan,
    debug=settings.debug,
    openapi_components={"securitySchemes": {}}
)

# Configure CORS - allow all origins for admin panel access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Must be False when allow_origins is ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(search.router, prefix=settings.api_prefix, include_in_schema=False)
app.include_router(attachments.router, prefix=settings.api_prefix, include_in_schema=False)
app.include_router(auth.router, prefix=settings.api_prefix, include_in_schema=False)

# Multi-tenant authentication endpoints (new)
app.include_router(multitenant_auth.router, prefix=f"{settings.api_prefix}/auth", tags=["auth"], include_in_schema=False)

# Admin panel endpoints
app.include_router(admin.router, prefix=settings.api_prefix, tags=["admin"])

# Get paths relative to this file
import pathlib
backend_dir = pathlib.Path(__file__).parent.parent
# In Docker: /app/outlook-addin, locally: backend/../outlook-addin
outlook_addin_dir = backend_dir / "outlook-addin" if (backend_dir / "outlook-addin").exists() else backend_dir.parent / "outlook-addin"

# Mount assets from backend directory (for Render deployment)
import os
print(f"Current working directory: {os.getcwd()}")
print(f"Backend dir path: {backend_dir}")
print(f"Outlook addin dir path: {outlook_addin_dir}")
print(f"Outlook addin dir exists: {outlook_addin_dir.exists()}")

# Mount assets - prefer outlook-addin assets (has all icons)
if (outlook_addin_dir / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(outlook_addin_dir / "assets")), name="assets")
    print(f"✅ Mounted /assets from outlook-addin directory: {outlook_addin_dir / 'assets'}")
elif (backend_dir / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(backend_dir / "assets")), name="assets")
    print("✅ Mounted /assets from backend directory")
else:
    print("❌ WARNING: No assets directory found for mounting /assets")

if (outlook_addin_dir / "src").exists():
    app.mount("/src", StaticFiles(directory=str(outlook_addin_dir / "src")), name="src")


@app.get("/api/v1/test-simple")
async def test_simple():
    """Simple test endpoint."""
    return {"message": "Simple test works"}


@app.options("/api/v1/search/companies")
async def options_companies():
    """Handle OPTIONS requests for search/companies endpoint."""
    return {"message": "OK"}


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.api_title,
        "version": settings.api_version,
        "docs": "/docs",
        "openapi": "/openapi.json"
    }


@app.get("/test")
async def test_endpoint():
    """Test endpoint without authentication."""
    return {"message": "Test works"}


@app.get("/support")
async def support_endpoint():
    """Support endpoint for Outlook add-in."""
    return {
        "name": "FileSmile Priority Integration",
        "version": "1.0.0",
        "support": {
            "email": "support@yourorganization.com",
            "phone": "+1-555-123-4567",
            "documentation": "https://yourorganization.com/docs/filesmile",
            "help": "Contact IT support for assistance with Priority ERP integration"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.api_version
    }


@app.get("/test-debug")
async def test_debug():
    """Simple test endpoint to verify deployment."""
    return {"test": "works", "timestamp": "2025-11-25"}


@app.get("/debug/files")
async def debug_files():
    """Debug endpoint to check what files are actually deployed."""
    import os
    cwd = os.getcwd()
    return {
        "current_working_directory": cwd,
        "files_in_cwd": os.listdir('.'),
        "assets_exists": os.path.exists('assets'),
        "assets_files": os.listdir('assets') if os.path.exists('assets') else [],
        "app_files": os.listdir('app') if os.path.exists('app') else []
    }


# Serve Outlook add-in HTML files
from fastapi.responses import FileResponse

@app.get("/taskpane.html")
async def taskpane():
    """Serve the taskpane HTML file."""
    taskpane_path = outlook_addin_dir / "taskpane.html"
    print(f"Taskpane requested. Path: {taskpane_path}, exists: {taskpane_path.exists()}")
    if taskpane_path.exists():
        return FileResponse(str(taskpane_path))
    else:
        print(f"❌ Taskpane not found at {taskpane_path}")
        return {"error": f"Taskpane not available. Looked at: {taskpane_path}"}


@app.get("/commands.html")
async def commands():
    """Serve the commands HTML file."""
    if (outlook_addin_dir / "commands.html").exists():
        return FileResponse(str(outlook_addin_dir / "commands.html"))
    else:
        return {"error": "Commands not available in backend-only deployment"}


# Serve frontend admin panel
# In Docker: /app/frontend, locally: backend/../frontend
frontend_dir = backend_dir / "frontend" if (backend_dir / "frontend").exists() else backend_dir.parent / "frontend"

# Mount frontend static files FIRST (before route handlers)
if frontend_dir.exists():
    if (frontend_dir / "css").exists():
        app.mount("/admin/css", StaticFiles(directory=str(frontend_dir / "css")), name="admin-css")
    if (frontend_dir / "js").exists():
        app.mount("/admin/js", StaticFiles(directory=str(frontend_dir / "js")), name="admin-js")
    if (frontend_dir / "assets").exists():
        app.mount("/admin/assets", StaticFiles(directory=str(frontend_dir / "assets")), name="admin-assets")
    print("✅ Mounted /admin frontend panel static files")


@app.get("/admin")
@app.get("/admin/")
async def admin_panel():
    """Serve the admin panel index page."""
    if (frontend_dir / "index.html").exists():
        return FileResponse(str(frontend_dir / "index.html"))
    else:
        return {"error": "Admin panel not available"}


@app.get("/admin/dashboard")
@app.get("/admin/dashboard.html")
async def admin_dashboard():
    """Serve the admin dashboard page."""
    if (frontend_dir / "dashboard.html").exists():
        return FileResponse(str(frontend_dir / "dashboard.html"))
    else:
        return {"error": "Admin dashboard not available"}


# Scanner app reverse proxy - forwards requests to scanner-app container
SCANNER_APP_URL = os.getenv("SCANNER_APP_URL", "http://scanner-app:3001")

@app.api_route("/scanner/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
async def proxy_scanner(request: Request, path: str):
    """Reverse proxy for scanner app - accessible via /scanner/*"""
    async with httpx.AsyncClient() as client:
        # Build target URL
        target_url = f"{SCANNER_APP_URL}/{path}"
        if request.query_params:
            target_url += f"?{request.query_params}"

        # Forward the request
        try:
            response = await client.request(
                method=request.method,
                url=target_url,
                headers={k: v for k, v in request.headers.items() if k.lower() not in ["host", "content-length"]},
                content=await request.body() if request.method in ["POST", "PUT", "PATCH"] else None,
                timeout=30.0
            )

            # Return proxied response
            return StreamingResponse(
                iter([response.content]),
                status_code=response.status_code,
                headers={k: v for k, v in response.headers.items() if k.lower() not in ["content-encoding", "transfer-encoding", "content-length"]},
                media_type=response.headers.get("content-type")
            )
        except httpx.RequestError as e:
            return {"error": f"Scanner app unavailable: {str(e)}"}


@app.get("/scanner")
async def proxy_scanner_root(request: Request):
    """Redirect /scanner to /scanner/"""
    return await proxy_scanner(request, "")


if __name__ == "__main__":
    import uvicorn
    from pathlib import Path

    # Get the backend directory (parent of app directory)
    backend_dir = Path(__file__).parent.parent

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info",
        ssl_keyfile=str(backend_dir / "key.pem"),
        ssl_certfile=str(backend_dir / "cert.pem")
    )
