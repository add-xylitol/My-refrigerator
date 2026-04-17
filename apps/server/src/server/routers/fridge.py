from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger

from server.core.dependencies import get_current_profile, get_supabase_gateway
from server.schemas.auth import AuthContext
from server.schemas.fridge import (
  CondimentPayload,
  CondimentResponse,
  ItemPayload,
  ItemResponse,
  ShelfPayload,
  ShelfResponse,
)

router = APIRouter(prefix="", tags=["fridge"])


# ---------------------------------------------------------------------------
# Shelves
# ---------------------------------------------------------------------------

@router.get("/fridge/shelves", response_model=List[ShelfResponse])
async def list_shelves(
  profile: AuthContext = Depends(get_current_profile),
  gateway=Depends(get_supabase_gateway),
) -> List[ShelfResponse]:
  logger.info("List shelves for profile={}", profile.profile_id)
  data = gateway.list_shelves(UUID(profile.profile_id))
  return data


@router.post("/fridge/shelves", response_model=List[ShelfResponse])
async def save_shelves(
  payload: List[ShelfPayload],
  profile: AuthContext = Depends(get_current_profile),
  gateway=Depends(get_supabase_gateway),
) -> List[ShelfResponse]:
  logger.info("Save shelves for profile={} count={}", profile.profile_id, len(payload))
  data = gateway.upsert_shelves(
    UUID(profile.profile_id),
    [s.model_dump(by_alias=False) for s in payload],
  )
  return data


@router.delete("/fridge/shelves/{shelf_id}", response_model=dict)
async def delete_shelf(
  shelf_id: str,
  profile: AuthContext = Depends(get_current_profile),
  gateway=Depends(get_supabase_gateway),
) -> dict:
  logger.info("Delete shelf {} for profile={}", shelf_id, profile.profile_id)
  ok = gateway.delete_shelf(UUID(profile.profile_id), shelf_id)
  if not ok:
    raise HTTPException(status_code=404, detail="Shelf not found")
  return {"detail": "deleted"}


# ---------------------------------------------------------------------------
# Items
# ---------------------------------------------------------------------------

@router.get("/items", response_model=List[ItemResponse])
async def list_items(
  shelf_id: str | None = Query(default=None),
  profile: AuthContext = Depends(get_current_profile),
  gateway=Depends(get_supabase_gateway),
) -> List[ItemResponse]:
  logger.info("List items for profile={} shelf_id={}", profile.profile_id, shelf_id)
  data = gateway.list_items(UUID(profile.profile_id), shelf_id=shelf_id)
  return data


@router.post("/items", response_model=ItemResponse)
async def create_item(
  payload: ItemPayload,
  profile: AuthContext = Depends(get_current_profile),
  gateway=Depends(get_supabase_gateway),
) -> ItemResponse:
  logger.info("Create item for profile={} shelf_id={}", profile.profile_id, payload.shelf_id)
  results = gateway.insert_items(
    UUID(profile.profile_id),
    payload.shelf_id,
    [payload.model_dump(by_alias=False)],
  )
  if not results:
    raise HTTPException(status_code=500, detail="Failed to create item")
  return results[0]


@router.post("/items/batch", response_model=List[ItemResponse])
async def create_items_batch(
  payload: List[ItemPayload],
  profile: AuthContext = Depends(get_current_profile),
  gateway=Depends(get_supabase_gateway),
) -> List[ItemResponse]:
  logger.info("Batch create items for profile={} count={}", profile.profile_id, len(payload))
  # Group items by shelf_id so each group uses the correct shelf_id
  from collections import defaultdict
  by_shelf: dict[str, list] = defaultdict(list)
  for item in payload:
    by_shelf[item.shelf_id].append(item.model_dump(by_alias=False))

  all_results: list = []
  for shelf_id, items in by_shelf.items():
    results = gateway.insert_items(UUID(profile.profile_id), shelf_id, items)
    all_results.extend(results)
  return all_results


@router.post("/items/confirm", response_model=List[ItemResponse])
async def confirm_items(
  payload: List[ItemPayload],
  profile: AuthContext = Depends(get_current_profile),
  gateway=Depends(get_supabase_gateway),
) -> List[ItemResponse]:
  logger.info("Confirm items for profile={} count={}", profile.profile_id, len(payload))
  from collections import defaultdict
  by_shelf: dict[str, list] = defaultdict(list)
  for item in payload:
    by_shelf[item.shelf_id].append(item.model_dump(by_alias=False))

  all_results: list = []
  for shelf_id, items in by_shelf.items():
    results = gateway.insert_items(UUID(profile.profile_id), shelf_id, items)
    all_results.extend(results)
  return all_results


@router.patch("/items/{item_id}", response_model=ItemResponse)
async def update_item(
  item_id: str,
  payload: dict,
  profile: AuthContext = Depends(get_current_profile),
  gateway=Depends(get_supabase_gateway),
) -> ItemResponse:
  logger.info("Update item {} for profile={}", item_id, profile.profile_id)
  changes = {k: v for k, v in payload.items() if v is not None and k not in ("id", "shelf_id")}
  # Remove fields that should not be overwritten on partial update
  changes.pop("id", None)
  changes.pop("shelf_id", None)
  try:
    data = gateway.update_item(UUID(profile.profile_id), item_id, changes)
  except RuntimeError:
    raise HTTPException(status_code=404, detail="Item not found")
  return data


@router.delete("/items/{item_id}", response_model=dict)
async def delete_item(
  item_id: str,
  profile: AuthContext = Depends(get_current_profile),
  gateway=Depends(get_supabase_gateway),
) -> dict:
  logger.info("Delete item {} for profile={}", item_id, profile.profile_id)
  ok = gateway.delete_item(UUID(profile.profile_id), item_id)
  if not ok:
    raise HTTPException(status_code=404, detail="Item not found")
  return {"detail": "deleted"}


# ---------------------------------------------------------------------------
# Condiments
# ---------------------------------------------------------------------------

@router.get("/condiments", response_model=List[CondimentResponse])
async def list_condiments(
  profile: AuthContext = Depends(get_current_profile),
  gateway=Depends(get_supabase_gateway),
) -> List[CondimentResponse]:
  logger.info("List condiments for profile={}", profile.profile_id)
  data = gateway.list_condiments(UUID(profile.profile_id))
  return data


@router.post("/condiments", response_model=List[CondimentResponse])
async def upsert_condiments(
  payload: List[CondimentPayload],
  profile: AuthContext = Depends(get_current_profile),
  gateway=Depends(get_supabase_gateway),
) -> List[CondimentResponse]:
  logger.info("Upsert condiments for profile={} count={}", profile.profile_id, len(payload))
  data = gateway.upsert_condiments(
    UUID(profile.profile_id),
    [c.model_dump(by_alias=False) for c in payload],
  )
  return data


@router.delete("/condiments/{condiment_id}", response_model=dict)
async def delete_condiment(
  condiment_id: str,
  profile: AuthContext = Depends(get_current_profile),
  gateway=Depends(get_supabase_gateway),
) -> dict:
  logger.info("Delete condiment {} for profile={}", condiment_id, profile.profile_id)
  ok = gateway.delete_condiment(UUID(profile.profile_id), condiment_id)
  if not ok:
    raise HTTPException(status_code=404, detail="Condiment not found")
  return {"detail": "deleted"}
