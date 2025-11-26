"""
Attachment service for uploading files to Priority documents.
"""
import base64
from typing import Optional, Dict, Any, List
from app.services.priority_client import PriorityClient


class AttachmentService:
    """Service for managing Priority document attachments."""

    def __init__(self, priority_client: PriorityClient):
        """
        Initialize attachment service.

        Args:
            priority_client: Authenticated Priority client
        """
        self.client = priority_client

    async def add_attachment(
        self,
        form: str,
        form_key: str,
        ext_files_form: str,
        file_description: str,
        file_base64: str,
        file_extension: str,
        mime_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload an attachment to a Priority document.

        Args:
            form: Priority form name
            form_key: Document key (e.g., "(IVNUM=123)")
            ext_files_form: Subform name for attachments
            file_description: Attachment description
            file_base64: Base64-encoded file data
            file_extension: File extension (e.g., 'pdf', 'eml')
            mime_type: MIME type (auto-detected if not provided)

        Returns:
            Created attachment record

        Raises:
            httpx.HTTPStatusError: If upload fails
        """
        # Decode base64 to bytes
        file_bytes = base64.b64decode(file_base64)

        # Encode as data URL for Priority
        data_url = self.client.encode_file_as_data_url(
            file_bytes,
            mime_type=mime_type,
            extension=file_extension
        )

        # Prepare attachment data
        attachment_data = {
            "EXTFILEDES": file_description,
            "EXTFILENAME": data_url,
            "SUFFIX": f".{file_extension.lower()}"
        }

        # Upload to Priority
        result = await self.client.post(
            form=form,
            data=attachment_data,
            parent_key=form_key,
            subform=ext_files_form
        )

        return result

    async def get_attachments(
        self,
        form: str,
        form_key: str,
        ext_files_form: str = "EXTFILES"
    ) -> List[Dict[str, Any]]:
        """
        Get all attachments for a document.

        Args:
            form: Priority form name
            form_key: Document key
            ext_files_form: Subform name for attachments

        Returns:
            List of attachment records
        """
        doc = await self.client.get_by_key(
            form=form,
            key=form_key,
            expand=[f"{ext_files_form}_SUBFORM"]
        )

        return doc.get(f"{ext_files_form}_SUBFORM", [])

    async def get_attachment(
        self,
        form: str,
        form_key: str,
        attachment_id: int,
        ext_files_form: str = "EXTFILES"
    ) -> Optional[Dict[str, Any]]:
        """
        Get a specific attachment by ID.

        Args:
            form: Priority form name
            form_key: Document key
            attachment_id: Attachment ID (EXTFILENUM)
            ext_files_form: Subform name for attachments

        Returns:
            Attachment record or None if not found
        """
        attachments = await self.get_attachments(form, form_key, ext_files_form)

        for attachment in attachments:
            if attachment.get("EXTFILENUM") == attachment_id:
                return attachment

        return None

    async def delete_attachment(
        self,
        form: str,
        form_key: str,
        attachment_id: int,
        ext_files_form: str = "EXTFILES"
    ):
        """
        Delete an attachment from a document.

        Args:
            form: Priority form name
            form_key: Document key
            attachment_id: Attachment ID (EXTFILENUM)
            ext_files_form: Subform name for attachments

        Raises:
            httpx.HTTPStatusError: If deletion fails
        """
        attachment_key = self.client.format_key(f"(EXTFILENUM={attachment_id})")
        subform_path = f"{form}{self.client.format_key(form_key)}/{ext_files_form}_SUBFORM"

        await self.client.delete(
            form=subform_path,
            key=attachment_key
        )

    # ========================================================================
    # Export Attachments (Staging)
    # ========================================================================

    async def add_export_attachment(
        self,
        user_login: str,
        file_description: str,
        file_base64: str,
        file_extension: str,
        source_identifier: str = "FileSmile",
        mime_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Add an attachment to the export staging area.

        This allows temporary file sharing between users via EXTFILESFILESMILE.

        Args:
            user_login: User login name
            file_description: File description
            file_base64: Base64-encoded file data
            file_extension: File extension
            source_identifier: Source identifier (default: "FileSmile")
            mime_type: MIME type (auto-detected if not provided)

        Returns:
            Created export attachment record

        Raises:
            httpx.HTTPStatusError: If upload fails
        """
        # Decode base64 to bytes
        file_bytes = base64.b64decode(file_base64)

        # Encode as data URL for Priority
        data_url = self.client.encode_file_as_data_url(
            file_bytes,
            mime_type=mime_type,
            extension=file_extension
        )
        
        # Debug the data URL
        print(f"DEBUG: Generated data URL: {data_url[:100]}...")  # First 100 chars

        # Prepare export attachment data
        export_data = {
            "EXTFILEDES": file_description,
            "EXTFILENAME": data_url,
            "SUFFIX": file_extension.lower(),
            "MAILFROM": source_identifier,
            "USERLOGIN": user_login
        }
        
        # Debug the final data
        print(f"DEBUG: Export data being sent:")
        for key, value in export_data.items():
            if key == "EXTFILENAME":
                print(f"  {key}: {value[:100]}...")  # First 100 chars
            else:
                print(f"  {key}: {value}")

        # Upload to export staging
        result = await self.client.post(
            form="EXTFILESFILESMILE",
            data=export_data
        )

        return result

    async def get_export_attachments(
        self,
        user_login: str
    ) -> List[Dict[str, Any]]:
        """
        Get export attachments for a user.

        Args:
            user_login: User login name

        Returns:
            List of export attachment records
        """
        return await self.client.get(
            form="EXTFILESFILESMILE",
            filter_expr=f"USERLOGIN eq '{user_login}'"
        )

    async def delete_export_attachment(self, attachment_id: int):
        """
        Delete an export attachment.

        Args:
            attachment_id: Export attachment ID (EXTFILENUM)

        Raises:
            httpx.HTTPStatusError: If deletion fails
        """
        attachment_key = self.client.format_key(f"(EXTFILENUM={attachment_id})")
        await self.client.delete(
            form="EXTFILESFILESMILE",
            key=attachment_key
        )
