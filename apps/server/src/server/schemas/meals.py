from datetime import datetime
from typing import Optional, List

from server.schemas.base import ApiSchema


class MealLogCreate(ApiSchema):
    title: str
    recipe_id: Optional[str] = None
    items_used: list = []
    photo_url: Optional[str] = None
    note: Optional[str] = None
    eaten_at: Optional[datetime] = None


class MealLogResponse(MealLogCreate):
    id: str
    profile_id: str
    created_at: datetime
