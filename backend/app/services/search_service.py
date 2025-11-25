"""
Document search service with optimized Priority queries.

Improvements over C# version:
- Concurrent searches using asyncio.gather()
- Simplified filter building
- Better error handling per form
"""
import asyncio
from typing import List, Dict, Tuple, Optional, Any
from app.models.schemas import Doc, FormMetaData, FormMetaField
from app.services.priority_client import PriorityClient


class SearchService:
    """Service for searching Priority documents."""

    def __init__(self, priority_client: PriorityClient):
        """
        Initialize search service.

        Args:
            priority_client: Authenticated Priority client
        """
        self.client = priority_client

    async def search_in_group(
        self,
        group_id: int,
        search_term: str,
        form: Optional[str] = None
    ) -> Tuple[List[Doc], Dict[str, str]]:
        """
        Search for documents across all forms in a search group.

        Optimizations:
        - Concurrent searches using asyncio.gather()
        - Single metadata query for all forms
        - Simplified filter building

        Args:
            group_id: Search group ID
            search_term: Search term (supports wildcards)
            form: Specific form to search in (optional)

        Returns:
            Tuple of (documents, errors_by_form)
        """
        # Get metadata for all forms in group (single query)
        forms_metadata = await self.client.get_group_forms_metadata(group_id)

        if not forms_metadata:
            return [], {"group": "No forms found in search group"}

        # Filter forms if specific form is provided
        if form:
            forms_metadata = [f for f in forms_metadata if f["ENAME"] == form]
            if not forms_metadata:
                return [], {"form": f"Form '{form}' not found in search group"}

        # Search all forms concurrently
        search_tasks = [
            self._search_in_form(metadata, search_term)
            for metadata in forms_metadata
        ]

        results = await asyncio.gather(*search_tasks, return_exceptions=True)

        # Aggregate results and errors
        all_docs: List[Doc] = []
        errors: Dict[str, str] = {}

        for i, result in enumerate(results):
            form_name = forms_metadata[i]["ENAME"]

            if isinstance(result, Exception):
                errors[form_name] = str(result)
            else:
                docs, error = result
                if error:
                    errors[form_name] = error
                else:
                    all_docs.extend(docs)

        return all_docs, errors

    async def _search_in_form(
        self,
        metadata: Dict[str, Any],
        search_term: str
    ) -> Tuple[List[Doc], Optional[str]]:
        """
        Search within a single Priority form.

        Args:
            metadata: Form metadata with field definitions
            search_term: Search term

        Returns:
            Tuple of (documents, error_message)
        """
        form_name = metadata["ENAME"]
        form_title = metadata.get("TITLE", form_name)
        ext_files_form = metadata.get("SUBENAME", "EXTFILES")

        try:
            # Build search filter
            filter_expr = self._build_search_filter(
                metadata.get("SOF_FSCLMNS_SUBFORM", []),
                search_term
            )

            if not filter_expr:
                return [], f"No searchable fields configured for {form_name}"

            # Determine key fields and display fields
            key_fields = self._get_key_fields(metadata.get("SOF_FSCLMNS_SUBFORM", []))
            doc_no_field = self._get_field_by_flag(
                metadata.get("SOF_FSCLMNS_SUBFORM", []),
                "DOC_FLAG"
            )
            date_field = self._get_field_by_flag(
                metadata.get("SOF_FSCLMNS_SUBFORM", []),
                "DATE_FLAG"
            )
            cust_field = self._get_field_by_flag(
                metadata.get("SOF_FSCLMNS_SUBFORM", []),
                "CS_FLAG"
            )
            details_field = self._get_field_by_flag(
                metadata.get("SOF_FSCLMNS_SUBFORM", []),
                "DET_FLAG"
            )

            # Build select clause
            select_fields = key_fields.copy()
            if doc_no_field:
                select_fields.append(doc_no_field)
            if date_field:
                select_fields.append(date_field)
            if cust_field:
                select_fields.append(cust_field)
            if details_field:
                select_fields.append(details_field)

            # Execute search
            results = await self.client.get(
                form=form_name,
                select=list(set(select_fields)),  # Remove duplicates
                filter_expr=filter_expr,
                top=100  # Limit results
            )

            # Map results to Doc objects
            docs = []
            for record in results:
                # Build form key from key fields
                form_key_parts = [
                    f"{field}={record.get(field, '')}"
                    for field in key_fields
                ]
                form_key = f"({','.join(form_key_parts)})"

                doc = Doc(
                    Form=form_name,
                    FormDesc=form_title,
                    ExtFilesForm=ext_files_form,
                    FormKey=form_key,
                    DocNo=str(record.get(doc_no_field, "")) if doc_no_field else None,
                    DocDate=str(record.get(date_field, "")) if date_field else None,
                    CustName=str(record.get(cust_field, "")) if cust_field else None,
                    Details=str(record.get(details_field, "")) if details_field else None
                )
                docs.append(doc)

            return docs, None

        except Exception as e:
            return [], str(e)

    def _build_search_filter(
        self,
        fields: List[Dict[str, Any]],
        search_term: str
    ) -> str:
        """
        Build OData filter expression for search.

        Supports:
        - Primary search fields (SEARCH_FLAG = 'Y')
        - Secondary search fields (SEARCH_FLAG_B = 'Y')
        - Wildcard searches for text fields
        - Exact match for numeric fields

        Args:
            fields: Form field metadata
            search_term: Search term

        Returns:
            OData filter expression
        """
        filters = []

        # Determine if search term is numeric
        is_numeric = search_term.isdigit()

        for field in fields:
            field_name = field.get("SOF_NAME")
            field_type = field.get("TYPE", "")
            is_primary = field.get("SEARCH_FLAG") == "Y"
            is_secondary = field.get("SEARCH_FLAG_B") == "Y"

            if not (is_primary or is_secondary):
                continue

            # Build filter based on field type
            if is_numeric and field_type in ["REAL", "INT"]:
                # Numeric exact match
                filters.append(f"{field_name} eq {search_term}")
            elif field_type not in ["REAL", "INT"]:
                # Text wildcard search
                # Priority supports wildcards with 'eq' operator
                filters.append(f"{field_name} eq '*{search_term}*'")

        if not filters:
            return ""

        # Combine with OR
        return " or ".join(filters)

    def _get_key_fields(self, fields: List[Dict[str, Any]]) -> List[str]:
        """
        Get key field names from metadata.

        Args:
            fields: Form field metadata

        Returns:
            List of key field names
        """
        key_fields = [
            field["SOF_NAME"]
            for field in fields
            if field.get("KNUM") and field.get("KNUM") > 0
        ]

        # Sort by KNUM
        key_fields.sort(
            key=lambda name: next(
                field["KNUM"]
                for field in fields
                if field["SOF_NAME"] == name
            )
        )

        return key_fields

    def _get_field_by_flag(
        self,
        fields: List[Dict[str, Any]],
        flag_name: str
    ) -> Optional[str]:
        """
        Get field name by flag.

        Args:
            fields: Form field metadata
            flag_name: Flag name (e.g., 'DOC_FLAG', 'DATE_FLAG')

        Returns:
            Field name or None
        """
        for field in fields:
            if field.get(flag_name) == "Y":
                return field["SOF_NAME"]
        return None

    async def find_doc_by_number(
        self,
        form_name: str,
        doc_number: str
    ) -> Optional[Doc]:
        """
        Find a document by its document number.

        Args:
            form_name: Priority form name
            doc_number: Document number

        Returns:
            Document or None if not found
        """
        # Get form metadata
        metadata = await self.client.get_form_metadata(form_name)
        if not metadata:
            return None

        # Get document number field
        doc_no_field = self._get_field_by_flag(
            metadata.get("SOF_FSCLMNS_SUBFORM", []),
            "DOC_FLAG"
        )

        if not doc_no_field:
            return None

        # Search by document number
        results = await self.client.get(
            form=form_name,
            filter_expr=f"{doc_no_field} eq '{doc_number}'",
            top=1
        )

        if not results:
            return None

        # Build Doc object
        record = results[0]
        key_fields = self._get_key_fields(metadata.get("SOF_FSCLMNS_SUBFORM", []))
        form_key_parts = [f"{field}={record.get(field, '')}" for field in key_fields]
        raw_form_key = f"({','.join(form_key_parts)})"
        form_key = self.client.format_key(raw_form_key)

        return Doc(
            Form=form_name,
            FormDesc=metadata.get("TITLE", form_name),
            ExtFilesForm=metadata.get("SUBENAME", "EXTFILES"),
            FormKey=form_key,
            DocNo=doc_number
        )
