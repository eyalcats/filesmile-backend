"""
Authentication endpoints for multi-tenant JWT authentication.

This module handles JWT token-based authentication only.
Legacy API key authentication has been removed.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Note: Legacy API key endpoints have been removed.
# All authentication now uses JWT tokens through the multi-tenant system.
# See multitenant_auth.py for user registration and login endpoints.
