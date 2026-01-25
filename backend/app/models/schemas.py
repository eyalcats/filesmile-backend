"""
Pydantic models for API request/response schemas.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


# ============================================================================
# Authentication Models
# ============================================================================

# Multi-Tenant Authentication Schemas

class TenantResolveRequest(BaseModel):
    """Request model for resolving tenant from email."""
    email: str = Field(..., description="User email address")


class TenantInfo(BaseModel):
    """Basic tenant information."""
    tenant_id: int = Field(..., description="Tenant ID")
    tenant_name: str = Field(..., description="Tenant name")


class TenantResolveResponse(BaseModel):
    """Response model for tenant resolution."""
    tenant_id: Optional[int] = Field(None, description="Resolved tenant ID (if single tenant)")
    tenant_name: Optional[str] = Field(None, description="Tenant name (if single tenant)")
    tenants: Optional[List[TenantInfo]] = Field(None, description="List of tenants (if multiple)")
    requires_selection: bool = Field(default=False, description="True if user must select a tenant")


class UserRegisterRequest(BaseModel):
    """Request model for user registration (first-time ERP login)."""
    email: str = Field(..., description="User email address")
    erp_username: str = Field(..., description="User's ERP username")
    erp_password_or_token: str = Field(..., description="User's ERP password or token")
    tenant_id: Optional[int] = Field(None, description="Selected tenant ID (required if domain has multiple tenants)")


class SwitchTenantRequest(BaseModel):
    """Request model for switching to a different tenant using stored credentials."""
    email: str = Field(..., description="User email address")
    tenant_id: int = Field(..., description="Target tenant ID to switch to")


class UserLoginRequest(BaseModel):
    """Request model for login with email only (pre-configured users)."""
    email: str = Field(..., description="User email address")
    tenant_id: Optional[int] = Field(None, description="Tenant ID (required if domain has multiple tenants)")


class UserRegisterResponse(BaseModel):
    """Response model for user registration."""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    tenant_id: int = Field(..., description="User's tenant ID")
    user_id: int = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    expires_in: int = Field(..., description="Token expiration time in seconds")


class JWTPayload(BaseModel):
    """JWT token payload structure."""
    sub: int = Field(..., description="User ID (subject)")
    tenant_id: int = Field(..., description="Tenant ID")
    email: str = Field(..., description="User email")
    exp: int = Field(..., description="Expiration timestamp")
    iat: Optional[int] = Field(None, description="Issued at timestamp")


# Legacy API Key Authentication

class APIKeyCreate(BaseModel):
    """Request model for creating a new API key."""
    priority_username: str = Field(..., description="Priority ERP username")
    priority_password: str = Field(..., description="Priority ERP password")
    priority_company: str = Field(..., description="Priority company code")
    description: Optional[str] = Field(None, description="Optional description for the API key")


class APIKeyResponse(BaseModel):
    """Response model for API key creation."""
    api_key: str = Field(..., description="Generated API key")
    username: str = Field(..., description="Priority username")
    company: str = Field(..., description="Priority company")
    expires_at: datetime = Field(..., description="Expiration date")
    description: Optional[str] = None


# ============================================================================
# Document Models
# ============================================================================

class ExtFile(BaseModel):
    """External file attachment model."""
    EXTFILENUM: Optional[int] = Field(None, description="Attachment ID")
    EXTFILEDES: Optional[str] = Field(None, description="Attachment description")
    EXTFILENAME: Optional[str] = Field(None, description="Base64 data URL")
    CURDATE: Optional[str] = Field(None, description="Creation date")
    SUFFIX: Optional[str] = Field(None, description="File extension")
    FILESIZE: Optional[int] = Field(None, description="File size in bytes")


class Doc(BaseModel):
    """Document model representing a Priority document."""
    Form: str = Field(..., description="Priority form name (e.g., AINVOICES)")
    FormDesc: Optional[str] = Field(None, description="Form title/description")
    ExtFilesForm: str = Field(default="EXTFILES", description="Subform name for attachments")
    FormKey: str = Field(..., description="Document key (e.g., (IVNUM=123))")
    DocNo: Optional[str] = Field(None, description="Document number")
    DocDate: Optional[str] = Field(None, description="Document date")
    CustName: Optional[str] = Field(None, description="Customer/supplier name")
    Details: Optional[str] = Field(None, description="Additional details")
    ExtFileDesc: Optional[str] = Field(None, description="Attachment description")
    extFiles: Optional[List[ExtFile]] = Field(default_factory=list, description="List of attachments")


class AttachmentUploadRequest(BaseModel):
    """Request model for uploading an attachment."""
    form: str = Field(..., description="Priority form name")
    form_key: str = Field(..., description="Document key")
    ext_files_form: str = Field(default="EXTFILES", description="Attachments subform")
    file_description: str = Field(..., description="Attachment description")
    file_base64: str = Field(..., description="Base64-encoded file data")
    file_extension: str = Field(..., description="File extension (e.g., pdf, eml)")
    mime_type: Optional[str] = Field(None, description="MIME type (auto-detected if not provided)")


class AttachmentUploadResponse(BaseModel):
    """Response model for attachment upload."""
    success: bool = Field(..., description="Upload success status")
    message: str = Field(..., description="Status message")
    attachment_id: Optional[int] = Field(None, description="Created attachment ID")


# ============================================================================
# Search Models
# ============================================================================

class FormMetaField(BaseModel):
    """Form field metadata."""
    SOF_NAME: str = Field(..., description="Priority field name")
    NAME: str = Field(..., description="Display name")
    TYPE: Optional[str] = Field(None, description="Data type (REAL, INT, CHAR, etc.)")
    KNUM: Optional[int] = Field(None, description="Key position number")
    SEARCH_FLAG: Optional[str] = Field(None, description="Primary search field flag")
    SEARCH_FLAG_B: Optional[str] = Field(None, description="Secondary search field flag")
    DOC_FLAG: Optional[str] = Field(None, description="Document number field flag")
    CS_FLAG: Optional[str] = Field(None, description="Customer/supplier field flag")
    DET_FLAG: Optional[str] = Field(None, description="Details field flag")
    DATE_FLAG: Optional[str] = Field(None, description="Date field flag")


class FormMetaData(BaseModel):
    """Form metadata configuration."""
    ENAME: str = Field(..., description="Form entity name")
    TITLE: str = Field(..., description="Form title")
    SUBENAME: Optional[str] = Field(None, description="Subform name for attachments")
    PREFIX: Optional[str] = Field(None, description="Barcode prefix")
    KeyFields: Optional[str] = Field(None, description="Comma-separated key fields")
    DocNoField: Optional[str] = Field(None, description="Document number field name")
    SOF_FSCLMNS_SUBFORM: List[FormMetaField] = Field(default_factory=list, description="Field metadata")


class GroupForm(BaseModel):
    """Form in a search group."""
    ENAME: str = Field(..., description="Form entity name")
    TITLE: str = Field(..., description="Form title")


class SearchGroup(BaseModel):
    """Search group configuration."""
    FSGROUP: int = Field(..., description="Group ID")
    FSGROUPNAME: str = Field(..., description="Group name")
    GROUPFORMS: List[GroupForm] = Field(default_factory=list, description="Forms in group")


class FormPrefixInfo(BaseModel):
    """Lightweight form prefix info for barcode matching."""
    ENAME: str = Field(..., description="Form entity name")
    TITLE: str = Field(..., description="Form title")
    SUBENAME: Optional[str] = Field(None, description="Subform name for attachments")
    PREFIX: str = Field(..., description="Barcode prefix")


class SearchRequest(BaseModel):
    """Request model for document search."""
    group_id: int = Field(..., description="Search group ID")
    search_term: str = Field(..., description="Search term")
    form: Optional[str] = Field(None, description="Specific form to search in (optional)")


class SearchResponse(BaseModel):
    """Response model for document search."""
    documents: List[Doc] = Field(..., description="Found documents")
    errors: Dict[str, str] = Field(default_factory=dict, description="Errors by form name")


# ============================================================================
# Export Attachments Models
# ============================================================================

class ExportAttachment(BaseModel):
    """Export attachment staging model."""
    EXTFILENUM: Optional[int] = Field(None, description="File number")
    EXTFILENAME: Optional[str] = Field(None, description="Base64 data URL")
    SUFFIX: Optional[str] = Field(None, description="File extension")
    EXTFILEDES: Optional[str] = Field(None, description="Description")
    MAILFROM: Optional[str] = Field(None, description="Source identifier")
    CURDATE: Optional[str] = Field(None, description="Creation date")
    CUREDATE: Optional[str] = Field(None, description="Last modified date")


class ExportAttachmentRequest(BaseModel):
    """Request model for adding export attachment."""
    user_login: Optional[str] = Field(None, description="User login name (optional - will be extracted from credentials)")
    file_description: str = Field(..., description="File description")
    file_base64: str = Field(..., description="Base64-encoded file data")
    file_extension: str = Field(..., description="File extension")
    source_identifier: str = Field(default="FileSmile", description="Source identifier")
    mime_type: Optional[str] = Field(None, description="MIME type")


class MoveExportRequest(BaseModel):
    """Request model for moving export attachment to document (server-side)."""
    form: str = Field(..., description="Target Priority form name")
    form_key: str = Field(..., description="Target document key")
    ext_files_form: str = Field(default="EXTFILES", description="Target attachments subform")


# ============================================================================
# Company Models
# ============================================================================

class Company(BaseModel):
    """Priority company model."""
    DNAME: str = Field(..., description="Company code/database name")
    TITLE: str = Field(..., description="Company title/description")


# ============================================================================
# General Response Models
# ============================================================================

class ErrorResponse(BaseModel):
    """Error response model."""
    error: str = Field(..., description="Error message")
    detail: Optional[Any] = Field(None, description="Additional error details")


class SuccessResponse(BaseModel):
    """Generic success response model."""
    success: bool = Field(True, description="Success status")
    message: str = Field(..., description="Success message")
    data: Optional[Any] = Field(None, description="Optional response data")
