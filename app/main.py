"""
FileSmile FastAPI Application.

This is the main application entry point that configures FastAPI,
registers routes, and sets up middleware.
"""
import sys
import os

# Add the parent directory to Python path to resolve app module imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.endpoints import search, attachments, auth, multitenant_auth
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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(search.router, prefix=settings.api_prefix, include_in_schema=False)
app.include_router(attachments.router, prefix=settings.api_prefix, include_in_schema=False)
app.include_router(auth.router, prefix=settings.api_prefix, include_in_schema=False)

# Multi-tenant authentication endpoints (new)
app.include_router(multitenant_auth.router, prefix=f"{settings.api_prefix}/auth", tags=["auth"], include_in_schema=False)

# Get paths relative to this file
import pathlib
backend_dir = pathlib.Path(__file__).parent.parent
outlook_addin_dir = backend_dir.parent / "outlook-addin"

# Mount Outlook add-in static files
app.mount("/assets", StaticFiles(directory=str(outlook_addin_dir / "assets")), name="assets")
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


# Serve Outlook add-in HTML files
from fastapi.responses import FileResponse

@app.get("/taskpane.html")
async def taskpane():
    """Serve the taskpane HTML file."""
    return FileResponse(str(outlook_addin_dir / "taskpane.html"))


@app.get("/commands.html")
async def commands():
    """Serve the commands HTML file."""
    return FileResponse(str(outlook_addin_dir / "commands.html"))


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
