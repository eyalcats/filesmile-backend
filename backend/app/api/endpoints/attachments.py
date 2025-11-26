"""
Document attachment endpoints.
"""
from typing import List
from fastapi import APIRouter, HTTPException, Depends, status, Request
from app.models.schemas import (
    AttachmentUploadRequest,
    AttachmentUploadResponse,
    ExtFile,
    ExportAttachment,
    ExportAttachmentRequest
)
from app.core.auth import get_current_user, CurrentUser
from app.services.priority_client import PriorityClient
from app.services.attachment_service import AttachmentService
from app.services.auth_helper import AuthHelper


router = APIRouter(prefix="/attachments", tags=["Attachments"])


@router.post("/upload", response_model=AttachmentUploadResponse)
async def upload_attachment(
    request: AttachmentUploadRequest,
    http_request: Request,
    current_user: CurrentUser = Depends(get_current_user)
) -> AttachmentUploadResponse:
    """
    Upload an attachment to Priority.
    
    Uses authenticated user's ERP credentials from the database.
    """
    try:
        # Create Priority client using authenticated user's credentials
        client = AuthHelper.create_priority_client(current_user, http_request)
        
        attachment_service = AttachmentService(client)

        result = await attachment_service.add_attachment(
            form=request.form,
            form_key=request.form_key,
            ext_files_form=request.ext_files_form,
            file_description=request.file_description,
            file_base64=request.file_base64,
            file_extension=request.file_extension,
            mime_type=request.mime_type
        )

        await client.close()

        return AttachmentUploadResponse(
            success=True,
            message="Attachment uploaded successfully",
            attachment_id=result.get("EXTFILENUM")
        )

    except Exception as e:
        # Try to extract InterfaceErrors from Priority response
        error_message = str(e)
        
        # Check if this is an httpx.HTTPStatusError with Priority response
        if hasattr(e, 'response') and hasattr(e.response, 'content'):
            try:
                import json
                import xml.etree.ElementTree as ET
                
                # Try to parse as JSON first (Priority returns JSON with XML content)
                try:
                    response_data = json.loads(e.response.content.decode('utf-8'))
                    
                    # Look for FORM in the JSON response
                    if 'FORM' in response_data and 'InterfaceErrors' in response_data['FORM']:
                        interface_errors = response_data['FORM']['InterfaceErrors']
                        if 'text' in interface_errors:
                            error_message = interface_errors['text']
                except json.JSONDecodeError:
                    # If JSON parsing fails, try XML parsing
                    root = ET.fromstring(e.response.content)
                    
                    # Look for InterfaceErrors in the XML response
                    for interface_errors in root.findall(".//InterfaceErrors"):
                        error_text = interface_errors.find('text')
                        if error_text is not None:
                            error_message = error_text.text
                            break
            except:
                # If parsing fails, use the original error message
                pass
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Attachment upload failed: {error_message}"
        )


@router.get("/list", response_model=List[ExtFile])
async def get_document_attachments(
    form: str,
    form_key: str,
    ext_files_form: str = "EXTFILES",
    http_request: Request = None,
    current_user: CurrentUser = Depends(get_current_user)
) -> List[ExtFile]:
    """
    Get all attachments for a document.

    Uses authenticated user's ERP credentials from the database.

    Args:
        form: Priority form name
        form_key: Document key (e.g., "(IVNUM=123)")
        ext_files_form: Subform name for attachments
        http_request: FastAPI Request object for authentication
        current_user: Authenticated user with ERP credentials

    Returns:
        List of attachments

    Raises:
        HTTPException: If retrieval fails
    """
    try:
        # Create Priority client using admin credentials for GET operation
        client = AuthHelper.create_priority_client(current_user, http_request, use_admin_credentials=True)
        
        attachment_service = AttachmentService(client)
        attachments = await attachment_service.get_attachments(
            form=form,
            form_key=form_key,
            ext_files_form=ext_files_form
        )

        await client.close()

        return [ExtFile(**attachment) for attachment in attachments]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve attachments: {str(e)}"
        )


@router.delete("/{form}/{form_key}/{attachment_id}")
async def delete_attachment(
    form: str,
    form_key: str,
    attachment_id: int,
    ext_files_form: str = "EXTFILES",
    http_request: Request = None,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Delete an attachment from a document.

    Uses authenticated user's ERP credentials from the database.

    Args:
        form: Priority form name
        form_key: Document key
        attachment_id: Attachment ID to delete
        ext_files_form: Subform name for attachments
        http_request: FastAPI Request object for authentication
        current_user: Authenticated user with ERP credentials

    Returns:
        Success message

    Raises:
        HTTPException: If deletion fails
    """
    try:
        # Create Priority client using authenticated user's credentials
        client = AuthHelper.create_priority_client(current_user, http_request)
        
        attachment_service = AttachmentService(client)
        await attachment_service.delete_attachment(
            form=form,
            form_key=form_key,
            attachment_id=attachment_id,
            ext_files_form=ext_files_form
        )

        await client.close()

        return {"message": "Attachment deleted successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete attachment: {str(e)}"
        )


# ============================================================================
# Export Attachments (Staging)
# ============================================================================

@router.post("/export", response_model=AttachmentUploadResponse)
async def add_export_attachment(
    request: ExportAttachmentRequest,
    http_request: Request,
    current_user: CurrentUser = Depends(get_current_user)
) -> AttachmentUploadResponse:
    """
    Add an attachment to the export staging area.

    This endpoint allows temporary file sharing via EXTFILESFILESMILE.
    Uses authenticated user's ERP credentials from the database.

    Args:
        request: Export attachment request
        http_request: FastAPI Request object for authentication
        current_user: Authenticated user with ERP credentials

    Returns:
        Upload result with attachment ID

    Raises:
        HTTPException: If upload fails
    """
    try:
        # Debug logging
        print(f"DEBUG: Export attachment request received")
        print(f"DEBUG: User: {current_user.user.email}")
        print(f"DEBUG: File description: {request.file_description}")
        print(f"DEBUG: File extension: {request.file_extension}")
        print(f"DEBUG: Source identifier: {request.source_identifier}")
        print(f"DEBUG: MIME type: {request.mime_type}")
        print(f"DEBUG: Base64 data length: {len(request.file_base64) if request.file_base64 else 0}")
        
        # Create Priority client using authenticated user's credentials
        print("DEBUG: Creating Priority client...")
        client = AuthHelper.create_priority_client(current_user, http_request)
        print(f"DEBUG: Priority client created with username: {client.username}")
        
        attachment_service = AttachmentService(client)
        print("DEBUG: Calling AttachmentService.add_export_attachment...")

        result = await attachment_service.add_export_attachment(
            user_login=client.username,
            file_description=request.file_description,
            file_base64=request.file_base64,
            file_extension=request.file_extension,
            source_identifier=request.source_identifier,
            mime_type=request.mime_type
        )
        
        print(f"DEBUG: Export attachment successful: {result}")

        await client.close()

        return AttachmentUploadResponse(
            success=True,
            message="File exported to staging area successfully",
            attachment_id=result.get("EXTFILENUM")
        )

    except Exception as e:
        # Detailed error logging
        import traceback
        print(f"DEBUG: Export attachment failed with error: {type(e).__name__}: {str(e)}")
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export attachment upload failed: {type(e).__name__}: {str(e)}"
        )


@router.get("/export/{user_login}", response_model=List[ExportAttachment])
async def get_export_attachments(
    user_login: str,
    current_user: CurrentUser = Depends(get_current_user),
    http_request: Request = None
):
    """
    Get export attachments for a user.

    Args:
        user_login: User login name
        current_user: Authenticated user with JWT token
        http_request: FastAPI Request object

    Returns:
        List of export attachments

    Raises:
        HTTPException: If retrieval fails
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="JWT authentication required"
        )
    
    try:
        # Create Priority client using admin credentials for GET operation
        client = AuthHelper.create_priority_client(current_user, http_request, use_admin_credentials=True)

        attachment_service = AttachmentService(client)
        attachments = await attachment_service.get_export_attachments(user_login)

        await client.close()

        return [ExportAttachment(**attachment) for attachment in attachments]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve export attachments: {str(e)}"
        )


@router.delete("/export/{attachment_id}")
async def delete_export_attachment(
    attachment_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    http_request: Request = None
):
    """
    Delete an export attachment.

    Args:
        attachment_id: Export attachment ID
        current_user: Authenticated user with JWT token
        http_request: FastAPI Request object

    Returns:
        Success message

    Raises:
        HTTPException: If deletion fails
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="JWT authentication required"
        )
    
    try:
        # Create Priority client using user credentials for DELETE operation
        client = AuthHelper.create_priority_client(current_user, http_request, use_admin_credentials=False)

        attachment_service = AttachmentService(client)
        await attachment_service.delete_export_attachment(attachment_id)

        await client.close()

        return {"message": "Export attachment deleted successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete export attachment: {str(e)}"
        )
