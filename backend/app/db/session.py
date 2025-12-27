"""
Database session management and initialization.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from typing import Generator
from app.core.config import settings

# Create SQLAlchemy engine for SQLite
database_url = settings.database_url

engine = create_engine(
    database_url,
    connect_args={"check_same_thread": False},
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
