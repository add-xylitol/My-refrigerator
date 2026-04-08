from fastapi import APIRouter, Depends, Query
from loguru import logger

from server.core.dependencies import get_supabase_gateway

router = APIRouter(tags=["shelf-life"])


@router.get("/shelf-life")
async def lookup_shelf_life(
    name: str = Query(..., description="Ingredient name, e.g. 鸡蛋"),
    gateway=Depends(get_supabase_gateway),
) -> dict:
    logger.info("Shelf-life lookup for name={}", name)
    result = gateway.lookup_shelf_life(name)
    if result is None:
        return {"name": name, "days": None}
    return result
