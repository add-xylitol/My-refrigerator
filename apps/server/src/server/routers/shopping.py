from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from server.core.dependencies import get_current_profile, get_supabase_gateway
from server.schemas.auth import AuthContext
from server.schemas.shopping import ShoppingItemCreate, ShoppingItemUpdate, ShoppingItemResponse

router = APIRouter(prefix="/shopping", tags=["shopping"])


@router.get("", response_model=List[ShoppingItemResponse])
async def list_shopping_items(
    profile: AuthContext = Depends(get_current_profile),
    gateway=Depends(get_supabase_gateway),
) -> List[ShoppingItemResponse]:
    logger.info("List shopping items for profile={}", profile.profile_id)
    data = gateway.list_shopping_items(UUID(profile.profile_id))
    return data


@router.post("", response_model=ShoppingItemResponse, status_code=201)
async def create_shopping_item(
    payload: ShoppingItemCreate,
    profile: AuthContext = Depends(get_current_profile),
    gateway=Depends(get_supabase_gateway),
) -> ShoppingItemResponse:
    logger.info("Create shopping item for profile={} name={}", profile.profile_id, payload.name)
    data = gateway.insert_shopping_item(
        UUID(profile.profile_id),
        payload.model_dump(by_alias=False),
    )
    if not data:
        raise HTTPException(status_code=500, detail="Failed to create shopping item")
    return data


@router.patch("/{item_id}", response_model=ShoppingItemResponse)
async def update_shopping_item(
    item_id: str,
    payload: ShoppingItemUpdate,
    profile: AuthContext = Depends(get_current_profile),
    gateway=Depends(get_supabase_gateway),
) -> ShoppingItemResponse:
    logger.info("Update shopping item {} for profile={}", item_id, profile.profile_id)
    changes = payload.model_dump(by_alias=False, exclude_none=True, exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=400, detail="No fields to update")
    try:
        data = gateway.update_shopping_item(UUID(profile.profile_id), item_id, changes)
    except RuntimeError:
        raise HTTPException(status_code=404, detail="Shopping item not found")
    return data


@router.delete("/{item_id}", response_model=dict)
async def delete_shopping_item(
    item_id: str,
    profile: AuthContext = Depends(get_current_profile),
    gateway=Depends(get_supabase_gateway),
) -> dict:
    logger.info("Delete shopping item {} for profile={}", item_id, profile.profile_id)
    ok = gateway.delete_shopping_item(UUID(profile.profile_id), item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Shopping item not found")
    return {"detail": "deleted"}
