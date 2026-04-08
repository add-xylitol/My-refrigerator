from datetime import datetime
from typing import Optional

from server.schemas.base import ApiSchema
from server.schemas.fridge import QuantityUnit


class ShoppingItemCreate(ApiSchema):
    name: str
    qty: float = 1
    unit: QuantityUnit = "个"
    source: Optional[str] = None


class ShoppingItemUpdate(ApiSchema):
    purchased: Optional[bool] = None
    name: Optional[str] = None
    qty: Optional[float] = None


class ShoppingItemResponse(ShoppingItemCreate):
    id: str
    purchased: bool
    created_at: datetime
