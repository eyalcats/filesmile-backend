"""
Database session management and initialization.
"""
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from typing import Generator
from app.core.config import settings

# Create SQLAlchemy engine for SQLite
database_url = settings.database_url

# Ensure database directory exists for SQLite
if database_url.startswith("sqlite"):
    # Extract path from sqlite:////path/to/db or sqlite:///./path/to/db
    if ":///" in database_url:
        db_path = database_url.split("///")[-1]
        # Handle absolute paths (4 slashes become ///)
        if db_path.startswith("/"):
            db_path = "/" + db_path.lstrip("/")
        db_dir = os.path.dirname(db_path)
        if db_dir and not os.path.exists(db_dir):
            print(f"Creating database directory: {db_dir}")
            os.makedirs(db_dir, exist_ok=True)

connect_args = {}
if database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    database_url,
    connect_args=connect_args,
    echo=settings.debug
)

# Create SessionLocal class for database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all database models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency to get database session.

    Yields:
        Database session that automatically closes after use.

    Example:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database by creating all tables.
    Should be called on application startup.
    """
    from app.models.database import Tenant, TenantDomain, User  # Import models
    Base.metadata.create_all(bind=engine)
