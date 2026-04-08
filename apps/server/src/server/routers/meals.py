from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger

from server.core.dependencies import get_current_profile, get_supabase_gateway
from server.schemas.auth import AuthContext
from server.schemas.meals import MealLogCreate, MealLogResponse

router = APIRouter(prefix="/meals", tags=["meals"])


@router.get("", response_model=List[MealLogResponse])
async def list_meal_logs(
    limit: int = Query(default=30, ge=1, le=100),
    profile: AuthContext = Depends(get_current_profile),
    gateway=Depends(get_supabase_gateway),
) -> List[MealLogResponse]:
    logger.info("List meal logs for profile={} limit={}", profile.profile_id, limit)
    data = gateway.list_meal_logs(UUID(profile.profile_id), limit=limit)
    return data


@router.post("", response_model=MealLogResponse, status_code=201)
async def create_meal_log(
    payload: MealLogCreate,
    profile: AuthContext = Depends(get_current_profile),
    gateway=Depends(get_supabase_gateway),
) -> MealLogResponse:
    logger.info("Create meal log for profile={} title={}", profile.profile_id, payload.title)
    data = gateway.insert_meal_log(
        UUID(profile.profile_id),
        payload.model_dump(by_alias=False),
    )
    if not data:
        raise HTTPException(status_code=500, detail="Failed to create meal log")
    return data
