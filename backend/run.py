"""
Run the FileSmile backend server.

Usage: python run.py
"""
import uvicorn
from pathlib import Path

# Check for SSL certificates
backend_dir = Path(__file__).parent
ssl_keyfile = backend_dir / "key.pem"
ssl_certfile = backend_dir / "cert.pem"
use_ssl = ssl_keyfile.exists() and ssl_certfile.exists()

uvicorn_config = {
    "app": "app.main:app",
    "host": "0.0.0.0",
    "port": 8002,
    "reload": True,
    "reload_dirs": ["app"],
    "log_level": "info",
    "access_log": True,
    "proxy_headers": True,
    "forwarded_allow_ips": "*",
    "timeout_keep_alive": 5,
    "timeout_graceful_shutdown": 30,
}

if use_ssl:
    uvicorn_config["ssl_keyfile"] = str(ssl_keyfile)
    uvicorn_config["ssl_certfile"] = str(ssl_certfile)

if __name__ == "__main__":
    protocol = "https" if use_ssl else "http"
    print(f"Starting FileSmile API on {protocol}://0.0.0.0:8002")
    uvicorn.run(**uvicorn_config)
