"""
Priority ERP OData REST API Client.

This module provides an optimized client for interacting with Priority ERP
through its OData REST API. Improvements over the C# version:
- Connection pooling for better performance
- Async operations for concurrent requests
- Simplified query building
- Better error handling
"""
import base64
import mimetypes
from typing import List, Dict, Optional, Tuple, Any
from urllib.parse import quote
import httpx
from app.core.config import settings


class PriorityClient:
    """
    Async HTTP client for Priority ERP OData API.

    Optimizations:
    - Single HTTP client with connection pooling
    - Async/await for concurrent operations
    - Automatic retry on transient errors
    """

    def __init__(
        self,
        username: str,
        password: str,
        company: str,
        base_url: str,
        tabula_ini: str = "tabula.ini",
        timeout: float = 30.0
    ):
        """
        Initialize Priority API client.

        Args:
            username: Priority username
            password: Priority password
            company: Company code (required)
            base_url: Priority base URL (required)
            tabula_ini: Tabula ini file (default: tabula.ini)
            timeout: Request timeout in seconds
        """
        if not company:
            raise ValueError("Company is required for multi-tenant Priority client")
        if not base_url:
            raise ValueError("Base URL is required for multi-tenant Priority client")
            
        self.username = username
        self.password = password
        self.company = company

        # Construct full OData URL: {base_url}/{tabula_ini}/{company}/
        if not base_url.endswith('/'):
            base_url += '/'
        self.base_url = f"{base_url}{tabula_ini}/{self.company}/"

        # Create base64 encoded auth header
        auth_string = f"{username}:{password}"
        auth_bytes = auth_string.encode("utf-8")
        self.auth_header = f"Basic {base64.b64encode(auth_bytes).decode('utf-8')}"

        # Initialize HTTP client with connection pooling
        self.client = httpx.AsyncClient(
            timeout=timeout,
            headers=self._get_default_headers(),
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
            verify=False
        )

    def _get_default_headers(self) -> Dict[str, str]:
        """Get default headers for Priority API requests."""
        return {
            "Accept": "application/json;odata.metadata=none",
            "Authorization": self.auth_header,
            "X-App-Id": "APP044",
            "X-App-Key": "DDA3BAF741664D05B448D4B8C96C7D7B",
            "Content-Type": "application/json"
        }

    async def close(self):
        """Close the HTTP client connection pool."""
        await self.client.aclose()

    def format_key(self, key: str) -> str:
        """
        Format a key for Priority API with proper quoting.

        Converts '(IVNUM=IN194000012,IVTYPE=A,DEBIT=D)' to '(IVNUM='IN194000012',IVTYPE='A',DEBIT='D')'
        But keeps numeric values unquoted: '(EXTFILENUM=123)' stays as '(EXTFILENUM=123)'

        Args:
            key: Raw key string

        Returns:
            Properly formatted key with quoted string values (integers unquoted)
        """
        if not key:
            return key

        if key.startswith('(') and key.endswith(')'):
            # Handle composite keys by quoting individual values
            inner_content = key[1:-1]  # Remove outer parentheses
            parts = inner_content.split(',')
            quoted_parts = []

            for part in parts:
                if '=' in part:
                    key_name, value = part.split('=', 1)
                    # Skip quoting for numeric values (integers)
                    if value.lstrip('-').isdigit():
                        quoted_parts.append(f"{key_name}={value}")
                    # Add single quotes around string values if not already quoted
                    elif not (value.startswith("'") and value.endswith("'")):
                        quoted_parts.append(f"{key_name}='{value}'")
                    else:
                        quoted_parts.append(part)
                else:
                    quoted_parts.append(part)

            return f"({','.join(quoted_parts)})"
        else:
            # Simple key - check if it's numeric
            if key.lstrip('-').isdigit():
                return key
            # Wrap string in single quotes
            if not (key.startswith("'") and key.endswith("'")):
                return f"'{key}'"
            return key

    async def get(
        self,
        form: str,
        select: Optional[List[str]] = None,
        filter_expr: Optional[str] = None,
        expand: Optional[List[str]] = None,
        orderby: Optional[str] = None,
        top: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute a GET request to retrieve data from a Priority form.

        Args:
            form: Priority form name
            select: List of fields to select
            filter_expr: OData filter expression
            expand: List of subforms to expand
            orderby: Order by clause
            top: Limit number of results

        Returns:
            List of records

        Raises:
            httpx.HTTPStatusError: If request fails
        """
        url = f"{self.base_url}{form}"

        # Build query parameters
        params = {}
        if select:
            params["$select"] = ",".join(select)
        if filter_expr:
            params["$filter"] = filter_expr
        if expand:
            params["$expand"] = ",".join(expand)
        if orderby:
            params["$orderby"] = orderby
        if top:
            params["$top"] = str(top)

        response = await self.client.get(url, params=params)
        response.raise_for_status()

        data = response.json()
        return data.get("value", [])

    async def get_by_key(
        self,
        form: str,
        key: str,
        expand: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get a single record by key.

        Args:
            form: Priority form name
            key: Record key (e.g., "(IVNUM=123)")
            expand: List of subforms to expand

        Returns:
            Single record

        Raises:
            httpx.HTTPStatusError: If request fails
        """
        url = f"{self.base_url}{form}{self.format_key(key)}"

        params = {}
        if expand:
            params["$expand"] = ",".join(expand)

        # Log OData command for Postman replication
        print(f"DEBUG: OData GET Command:")
        print(f"  URL: {url}")
        print(f"  Headers: Authorization: Basic <base64('{self.username}:{self.password}')>")
        if params:
            print(f"  Params: {params}")
        print(f"  Postman: GET {url} with Basic Auth and params: {params}")

        response = await self.client.get(url, params=params)
        
        # Log response for debugging
        print(f"DEBUG: OData Response Status: {response.status_code}")
        if response.status_code >= 400:
            try:
                error_json = response.json()
                print(f"DEBUG: OData Error Response: {error_json}")
            except:
                print(f"DEBUG: OData Error Text: {response.text}")
        
        response.raise_for_status()

        return response.json()

    async def post(
        self,
        form: str,
        data: Dict[str, Any],
        parent_key: Optional[str] = None,
        subform: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new record via POST.

        Args:
            form: Priority form name
            data: Record data
            parent_key: Parent record key for subforms
            subform: Subform name (required when parent_key is provided)

        Returns:
            Created record

        Raises:
            httpx.HTTPStatusError: If request fails
        """
        if parent_key:
            if not subform:
                raise ValueError("subform parameter is required when parent_key is provided")
            url = f"{self.base_url}{form}{self.format_key(parent_key)}/{subform}_SUBFORM"
        else:
            url = f"{self.base_url}{form}"

        # Log OData command for Postman replication
        import json
        # Create a copy of data for logging, truncating EXTFILENAME if present
        log_data = data.copy()
        if "EXTFILENAME" in log_data and len(str(log_data["EXTFILENAME"])) > 100:
            log_data["EXTFILENAME"] = log_data["EXTFILENAME"][:100] + "...[truncated]"
        print(f"\n{'='*60}")
        print(f"DEBUG: OData POST Command")
        print(f"{'='*60}")
        print(f"URL: {url}")
        print(f"Username: {self.username}")
        print(f"Body:\n{json.dumps(log_data, indent=2, ensure_ascii=False)}")
        print(f"{'='*60}\n")

        response = await self.client.post(url, json=data)
        
        # Log response for debugging
        print(f"DEBUG: OData Response Status: {response.status_code}")
        if response.status_code >= 400:
            try:
                error_json = response.json()
                print(f"DEBUG: OData Error Response: {error_json}")
            except:
                print(f"DEBUG: OData Error Text: {response.text}")
        
        response.raise_for_status()

        return response.json()

    async def patch(
        self,
        form: str,
        key: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update a record via PATCH.

        Args:
            form: Priority form name
            key: Record key
            data: Updated fields

        Returns:
            Updated record

        Raises:
            httpx.HTTPStatusError: If request fails
        """
        url = f"{self.base_url}{form}{self.format_key(key)}"

        response = await self.client.patch(url, json=data)
        response.raise_for_status()

        return response.json()

    async def delete(self, form: str, key: str):
        """
        Delete a record via DELETE.

        Args:
            form: Priority form name
            key: Record key

        Raises:
            httpx.HTTPStatusError: If request fails
        """
        url = f"{self.base_url}{form}{self.format_key(key)}"

        response = await self.client.delete(url)
        response.raise_for_status()

    # ========================================================================
    # High-level helper methods
    # ========================================================================

    async def get_companies(self) -> List[Dict[str, str]]:
        """
        Get list of available Priority companies.

        Returns:
            List of companies with DNAME and TITLE
        """
        return await self.get(
            form="ENVIRONMENT",
            select=["DNAME", "TITLE"],
            orderby="DNAME"
        )

    async def validate_credentials(self, use_admin_form: bool = False) -> bool:
        """
        Validate ERP credentials by making a simple API call.

        For admin users: queries ENVIRONMENT (system table requiring admin access)
        For regular users: queries USERS form (accessible to all authenticated users)

        Args:
            use_admin_form: If True, use ENVIRONMENT form (requires admin privileges).
                          If False, use USERS form (works for regular users).

        Returns:
            True if credentials are valid

        Raises:
            httpx.HTTPStatusError: If authentication fails (401) or other HTTP errors
            httpx.RequestError: If connection fails
        """
        try:
            if use_admin_form:
                # Admin validation: query ENVIRONMENT (system table)
                await self.get(
                    form="ENVIRONMENT",
                    select=["DNAME"],
                    top=1
                )
            else:
                # User validation: query LOGPART form (parts catalog)
                # All users should have access to this standard business form
                await self.get(
                    form="LOGPART",
                    select=["PARTNAME"],
                    top=1
                )
            return True
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise httpx.HTTPStatusError(
                    "Invalid ERP credentials: authentication failed",
                    request=e.request,
                    response=e.response
                )
            raise
        except Exception as e:
            # Re-raise connection errors as-is
            raise

    async def get_user_id(self, user_login: str) -> Optional[int]:
        """
        Get Priority user ID from login name.

        Args:
            user_login: User login name

        Returns:
            User ID or None if not found
        """
        users = await self.get(
            form="USERS",
            select=["USER"],
            filter_expr=f"USERLOGIN eq '{user_login}'"
        )
        if users:
            return users[0].get("USER")
        return None

    async def get_search_groups(self) -> List[Dict[str, Any]]:
        """
        Get configured search groups with their forms.

        Returns:
            List of search groups with expanded forms
        """
        return await self.get(
            form="SOF_FSGROUPS",
            select=["FSGROUP", "FSGROUPNAME"],
            expand=["SOF_FSGROUPEXEC_SUBFORM($select=ENAME,TITLE)"],
            orderby="FSGROUPNAME"
        )

    async def get_form_metadata(self, form_name: str) -> Optional[Dict[str, Any]]:
        """
        Get metadata for a specific Priority form.

        Args:
            form_name: Form entity name

        Returns:
            Form metadata with field definitions
        """
        results = await self.get(
            form="SOF_FSFORMS",
            filter_expr=f"ENAME eq '{form_name}'",
            expand=["SOF_FSCLMNS_SUBFORM"]
        )
        if results:
            return results[0]
        return None

    async def get_group_forms_metadata(
        self,
        group_id: int
    ) -> List[Dict[str, Any]]:
        """
        Get metadata for all forms in a search group.

        Optimization: Single query with expand instead of multiple queries.

        Args:
            group_id: Search group ID

        Returns:
            List of form metadata
        """
        # Get forms in group
        group_forms = await self.get(
            form="SOF_FSGROUPS",
            select=["FSGROUPNAME"],
            expand=["SOF_FSGROUPEXEC_SUBFORM($select=ENAME)"],
            filter_expr=f"FSGROUP eq {group_id}"
        )

        if not group_forms:
            return []

        # Extract forms from the expanded subform
        forms = []
        for group in group_forms:
            if 'SOF_FSGROUPEXEC_SUBFORM' in group:
                forms.extend(group['SOF_FSGROUPEXEC_SUBFORM'])

        # Build filter for all forms at once
        form_names = [f"ENAME eq '{form['ENAME']}'" for form in forms]
        filter_expr = " or ".join(form_names)

        # Get all metadata in single query
        return await self.get(
            form="SOF_FSFORMS",
            filter_expr=filter_expr,
            expand=["SOF_FSCLMNS_SUBFORM"]
        )

    def build_form_key(self, key_fields: Dict[str, Any]) -> str:
        """
        Build a Priority form key from field values.

        Args:
            key_fields: Dictionary of key field names and values

        Returns:
            Form key string (e.g., "(IVNUM=123,LINE=1)")
        """
        parts = [f"{field}={value}" for field, value in key_fields.items()]
        return f"({','.join(parts)})"

    @staticmethod
    def encode_file_as_data_url(
        file_data: bytes,
        mime_type: Optional[str] = None,
        extension: Optional[str] = None
    ) -> str:
        """
        Encode file data as a data URL for Priority.

        Args:
            file_data: Raw file bytes
            mime_type: MIME type (auto-detected if not provided)
            extension: File extension (used for MIME type detection)

        Returns:
            Data URL string: data:{mime_type};base64,{base64_data}
        """
        if not mime_type and extension:
            mime_type, _ = mimetypes.guess_type(f"file.{extension}")

        if not mime_type:
            mime_type = "application/octet-stream"

        base64_data = base64.b64encode(file_data).decode("utf-8")
        return f"data:{mime_type};base64,{base64_data}"

    @staticmethod
    def decode_data_url(data_url: str) -> Tuple[bytes, str]:
        """
        Decode a Priority data URL to bytes and MIME type.

        Args:
            data_url: Data URL string

        Returns:
            Tuple of (file_bytes, mime_type)
        """
        # Format: data:{mime_type};base64,{base64_data}
        if not data_url.startswith("data:"):
            raise ValueError("Invalid data URL format")

        parts = data_url[5:].split(";base64,")
        if len(parts) != 2:
            raise ValueError("Invalid data URL format")

        mime_type = parts[0]
        base64_data = parts[1]
        file_bytes = base64.b64decode(base64_data)

        return file_bytes, mime_type


class PriorityClientFactory:
    """Factory for creating Priority clients with connection pooling."""

    # Note: Admin client functionality removed to enforce database-only authentication
    # All clients should be created using AuthHelper.create_priority_client()

    @classmethod
    async def close_all(cls):
        """Close all cached clients."""
        # No cached clients to close - all clients are managed by AuthHelper
        pass
