"""
Document search endpoints.

Supports both authentication methods:
- JWT Bearer token (multi-tenant) - uses tenant config + user credentials
- X-API-Key header (legacy) - uses encoded credentials
- No auth - fails with 401 error
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status, Request
from app.models.schemas import SearchGroup, SearchRequest, SearchResponse, Doc, Company
from app.services.priority_client import PriorityClient, PriorityClientFactory
from app.services.search_service import SearchService
from app.services.auth_helper import AuthHelper
from app.core.auth import CurrentUser, get_current_user
from app.core.config import settings
from sqlalchemy.orm import Session
from app.db.session import get_db
import logging

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/search", tags=["Document Search"], include_in_schema=False)


@router.get("/test", include_in_schema=False)
async def test_search():
    """Test search endpoint."""
    return {"message": "Search test works"}


@router.get("/groups", response_model=List[SearchGroup], include_in_schema=False)
async def get_search_groups(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[SearchGroup]:
    """
    Get configured search groups from Priority.

    Supports JWT Bearer token authentication:
    - Authorization: Bearer <token>

    Returns:
        List of search groups

    Raises:
        HTTPException: If retrieval fails
    """
    try:
        # Create Priority client using admin credentials for GET operation
        client = AuthHelper.create_priority_client(current_user, request, use_admin_credentials=False)

        groups = await client.get_search_groups()
        await client.close()

        return [
            SearchGroup(
                FSGROUP=g["FSGROUP"],
                FSGROUPNAME=g["FSGROUPNAME"],
                GROUPFORMS=[
                    {"ENAME": form["ENAME"], "TITLE": form.get("TITLE", form["ENAME"])}
                    for form in g.get("SOF_FSGROUPEXEC_SUBFORM", [])
                ]
            )
            for g in groups
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve search groups: {str(e)}"
        )


@router.post("/documents", response_model=SearchResponse)
async def search_documents(
    search_request: SearchRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> SearchResponse:
    """
    Search for documents in a search group.

    Searches across all forms in the specified group concurrently
    Search documents in Priority using configured search criteria.

    Supports JWT Bearer token authentication:
    - Authorization: Bearer <token>

    Args:
        search_request: Search criteria with group ID and search term
        current_user: Authenticated user with JWT token
        http_request: FastAPI Request object

    Returns:
        Search results with matching documents

    Raises:
        HTTPException: If search fails
    """
    print(f"Received search request: group_id={search_request.group_id}, search_term='{search_request.search_term}', form='{search_request.form}'")

    try:
        # Create Priority client using appropriate authentication method
        client = AuthHelper.create_priority_client(current_user, request)

        # Execute search
        search_service = SearchService(client)
        documents, errors = await search_service.search_in_group(
            group_id=search_request.group_id,
            search_term=search_request.search_term,
            form=search_request.form
        )

        await client.close()

        return SearchResponse(
            documents=documents,
            errors=errors
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


@router.get("/document/{form_name}/{doc_number}", response_model=Doc)
async def find_document_by_number(
    form_name: str,
    doc_number: str,
    http_request: Request,
    current_user: CurrentUser = Depends(get_current_user)
) -> Doc:
    """
    Find a specific document by form name and document number.

    Uses authenticated user's ERP credentials from the database.

    Args:
        form_name: Priority form name
        doc_number: Document number
        http_request: FastAPI Request object for authentication
        current_user: Authenticated user with ERP credentials

    Returns:
        Document if found

    Raises:
        HTTPException: If document not found or search fails
    """
    try:
        # Create Priority client using admin credentials for GET operation
        client = AuthHelper.create_priority_client(current_user, http_request, use_admin_credentials=False)
        
        search_service = SearchService(client)
        doc = await search_service.find_doc_by_number(form_name, doc_number)

        await client.close()

        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document not found: {form_name} {doc_number}"
            )

        return doc

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document search failed: {str(e)}"
        )


@router.get("/companies", response_model=List[Company], include_in_schema=False)
async def get_companies(
    http_request: Request,
    current_user: CurrentUser = Depends(get_current_user)
) -> List[Company]:
    """
    Get list of available Priority companies.

    Uses authenticated user's ERP credentials from the database.

    Returns:
        List of companies

    Raises:
        HTTPException: If retrieval fails
    """
    try:
        if current_user is None:
            logger.error("No current_user found in get_companies")
            raise HTTPException(status_code=401, detail="Authentication required")
        
        # Create Priority client using admin credentials for GET operation
        client = AuthHelper.create_priority_client(current_user, http_request, use_admin_credentials=False)
        companies = await client.get_companies()
        await client.close()

        return [
            Company(DNAME=c["DNAME"], TITLE=c["TITLE"])
            for c in companies
        ]

    except Exception as e:
        logger.error(f"get_companies failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve companies: {str(e)}"
        )
