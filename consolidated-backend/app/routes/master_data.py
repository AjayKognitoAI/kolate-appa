from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.permissions import get_current_user, has_permissions
from app.models.user import User
from app.services.master_data_service import MasterDataService
from app.exceptions.base import BusinessLogicError
from app.schemas.master_data import (
    MasterDataOut,
    MasterDataCreate,
    MasterDataUpdate,
    MasterDataSearch,
    MasterDataWithLocaleOut,
    MasterDataWithLocalesOut,
    MasterDataLocaleOut,
    MasterDataLocaleCreate,
    MasterDataLocaleUpdate
)
from app.schemas.feature import PaginationParams, PaginatedResponse
from app.routes.crud_router import CRUDRouter, validate_size

# Create the main router
router = APIRouter()

# Add convenience endpoint for getting all scopes (must be before /{item_id} routes)
@router.get(
    "/scopes",
    response_model=List[str],
    summary="Get all available scopes",
    dependencies=[Depends(has_permissions("master_data:read"))]
)
async def get_all_scopes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Get all unique scopes available in master data."""
    service = MasterDataService()
    return await service.get_all_scopes(db)

@router.get(
    "/scope/{scope}",
    response_model=PaginatedResponse,
    summary="Get master data by scope",
    dependencies=[Depends(has_permissions("master_data:read"))]
)
async def get_master_data_by_scope(
    scope: str = Path(..., description="Data scope"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, le=100, description="Page size (-1 for all records)"),
    sort_by: Optional[str] = Query("sort_order", alias="sortBy", description="Field to sort by"),
    sort_order: str = Query("asc", alias="sortOrder", regex="^(asc|desc)$", description="Sort order"),
    locale: Optional[str] = Query(None, description="Locale for localized content"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Get all master data entries for a specific scope with pagination."""
    service = MasterDataService()
    size = validate_size(size)

    pagination = PaginationParams(
        page=page,
        size=size,
        sort_by=sort_by,
        sort_order=sort_order
    )

    result = await service.get_by_scope(db, scope, pagination, locale)

    # Convert items to output schema
    if locale:
        # For locale-specific requests, convert to WithLocaleOut schema
        result.items = [
            await service.get_by_id_with_locale(db, item.id, locale)
            for item in result.items
        ]
    else:
        result.items = [MasterDataOut.model_validate(item) for item in result.items]

    return result



# Create the base CRUD router and get its routes
crud_router = CRUDRouter(
    service_class=MasterDataService,
    schema=MasterDataOut,
    create_schema=MasterDataCreate,
    update_schema=MasterDataUpdate,
    search_schema=MasterDataSearch,
    prefix="",
    resource_name="master_data"
)

# Manually add CRUD routes to avoid the empty prefix issue
crud_routes = crud_router.get_router()
for route in crud_routes.routes:
    router.routes.append(route)

# Additional custom endpoints for master data specific functionality

@router.get(
    "/{item_id}/with-locale",
    response_model=MasterDataWithLocaleOut,
    summary="Get master data with locale-specific values",
    dependencies=[Depends(has_permissions("master_data:read"))]
)
async def get_master_data_with_locale(
    item_id: int = Path(..., description="Master data ID"),
    locale: Optional[str] = Query(None, description="Locale code (e.g., en_US, fr_FR)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Get master data by ID with locale-specific display values."""
    service = MasterDataService()
    item = await service.get_by_id_with_locale(db, item_id, locale)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master data not found"
        )

    return item


@router.get(
    "/scope/{scope}/code/{code}",
    response_model=MasterDataWithLocaleOut,
    summary="Get master data by scope and code",
    dependencies=[Depends(has_permissions("master_data:read"))]
)
async def get_master_data_by_scope_and_code(
    scope: str = Path(..., description="Data scope"),
    code: str = Path(..., description="Data code"),
    locale: Optional[str] = Query(None, description="Locale code"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Get master data by scope and code with optional locale."""
    service = MasterDataService()
    item = await service.get_by_scope_and_code(db, scope, code, locale)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master data not found"
        )

    return item

@router.get(
    "/{item_id}/with-locales",
    response_model=MasterDataWithLocalesOut,
    summary="Get master data with all locales",
    dependencies=[Depends(has_permissions("master_data:read"))]
)
async def get_master_data_with_all_locales(
    item_id: int = Path(..., description="Master data ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Get master data by ID with all locale entries included."""
    service = MasterDataService()
    item = await service.get_by_id_with_all_locales(db, item_id)

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master data not found"
        )

    return MasterDataWithLocalesOut.model_validate(item)

# Locale management endpoints

@router.get(
    "/{item_id}/locale",
    response_model=List[MasterDataLocaleOut],
    summary="Get all locale entries for master data",
    dependencies=[Depends(has_permissions("master_data:read"))]
)
async def get_master_data_locales(
    item_id: int = Path(..., description="Master data ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Get all locale entries for a specific master data."""
    service = MasterDataService()

    # Check if master data exists
    master_data = await service.get_by_id(db, item_id)
    if not master_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master data not found"
        )

    locales = await service.get_locales_by_master_id(db, item_id)
    return [MasterDataLocaleOut.model_validate(locale) for locale in locales]

@router.post(
    "/{item_id}/locale",
    response_model=MasterDataLocaleOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create locale entry for master data",
    dependencies=[Depends(has_permissions("master_data:write"))]
)
async def create_master_data_locale(
    item_id: int = Path(..., description="Master data ID"),
    locale_data: MasterDataLocaleCreate = Body(..., description="Locale data"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Create a new locale entry for master data."""
    service = MasterDataService()

    locale = await service.create_locale(db, item_id, locale_data)
    if not locale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master data not found"
        )
    return MasterDataLocaleOut.model_validate(locale)

@router.get(
    "/{item_id}/locale/{locale_code}",
    response_model=MasterDataLocaleOut,
    summary="Get specific locale entry for master data",
    dependencies=[Depends(has_permissions("master_data:read"))]
)
async def get_master_data_locale(
    item_id: int = Path(..., description="Master data ID"),
    locale_code: str = Path(..., description="Locale code"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Get a specific locale entry for master data."""
    service = MasterDataService()

    locale = await service.get_locale_by_master_and_locale(db, item_id, locale_code)
    if not locale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Locale entry not found"
        )

    return MasterDataLocaleOut.model_validate(locale)

@router.put(
    "/{item_id}/locale/{locale_id}",
    response_model=MasterDataLocaleOut,
    summary="Update locale entry for master data",
    dependencies=[Depends(has_permissions("master_data:write"))]
)
async def update_master_data_locale(
    item_id: int = Path(..., description="Master data ID"),
    locale_id: int = Path(..., description="Locale entry ID"),
    locale_data: MasterDataLocaleUpdate = Body(..., description="Updated locale data"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Update a locale entry for master data."""
    service = MasterDataService()

    # Verify the locale belongs to the master data
    existing_locale = await service.get_locale_by_master_and_locale(db, item_id, locale_data.locale) if locale_data.locale else None
    if existing_locale and existing_locale.id != locale_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Locale already exists for this master data"
        )

    locale = await service.update_locale(db, locale_id, locale_data)
    if not locale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Locale entry not found"
        )

    # Ensure the locale belongs to the specified master data
    if locale.master_id != item_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Locale entry does not belong to the specified master data"
        )

    return MasterDataLocaleOut.model_validate(locale)

@router.delete(
    "/{item_id}/locale/{locale_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete locale entry for master data",
    dependencies=[Depends(has_permissions("master_data:delete"))]
)
async def delete_master_data_locale(
    item_id: int = Path(..., description="Master data ID"),
    locale_id: int = Path(..., description="Locale entry ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """Delete a locale entry for master data."""
    service = MasterDataService()

    # First, get the locale to ensure it belongs to the master data
    locale_obj = await service.get_locale_by_id(db, locale_id)
    if not locale_obj or locale_obj.master_id != item_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Locale entry not found for the specified master data"
        )

    deleted = await service.delete_locale(db, locale_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Locale entry not found"
        )
