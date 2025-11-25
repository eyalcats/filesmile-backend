"""
Application configuration loaded from environment variables.
"""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # FastAPI Configuration
    api_title: str = "FileSmile API"
    api_version: str = "2.0.0"
    api_prefix: str = "/api/v1"
    debug: bool = False
    allowed_origins: str = "*"

    # Priority ERP Configuration (DEPRECATED - now tenant-specific)
    # Only used for development/seeding scripts
    priority_base_url: Optional[str] = None
    priority_tabula_ini: Optional[str] = None
    priority_company: Optional[str] = None
    priority_language: Optional[str] = None

    # Priority API Headers
    priority_app_id: str = "APP044"
    priority_app_key: Optional[str] = None

    # Authentication
    secret_key: str
    api_key_expire_days: int = 365

    # Multi-tenant JWT Authentication
    jwt_secret_key: str  # Separate key for user JWT tokens
    jwt_expire_minutes: int = 1440  # 24 hours default
    encryption_key: str  # Key for encrypting sensitive credentials

    # Admin Priority Credentials (FOR INITIAL SETUP ONLY)
    # Optional - only required for tenant seeding scripts, not runtime
    priority_admin_user: Optional[str] = None
    priority_admin_password: Optional[str] = None

    # Database
    database_url: str = "sqlite:///./filesmile.db"

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        case_sensitive = False
        extra = "ignore"

    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    

# Global settings instance
settings = Settings()
