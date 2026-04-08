from datetime import date, datetime
from typing import Literal, Optional

from pydantic import Field

from server.schemas.base import ApiSchema


ShelfType = Literal["chill", "freeze", "produce"]
QuantityUnit = Literal["个", "克", "毫升", "把", "袋"]
CondimentCategory = Literal["酱油/醋", "香料", "油/脂", "其他"]
StockLevel = Literal["充足", "缺货", "临期"]


class ShelfPayload(ApiSchema):
  id: Optional[str] = None
  name: str
  sort: int = 1
  type: ShelfType = "chill"


class ShelfResponse(ShelfPayload):
  id: str
  created_at: datetime
  updated_at: datetime


class ItemPayload(ApiSchema):
  id: Optional[str] = None
  shelf_id: str
  name: str
  unit: QuantityUnit = "个"
  qty: float = Field(default=1, gt=0)
  exp_date: Optional[date] = None
  barcode: Optional[str] = None
  photo_id: Optional[str] = None
  note: Optional[str] = None


class ItemResponse(ItemPayload):
  id: str
  created_at: datetime
  updated_at: datetime


class CondimentPayload(ApiSchema):
  id: Optional[str] = None
  name: str
  category: CondimentCategory = "其他"
  stock_level: StockLevel = "充足"
  note: Optional[str] = None


class CondimentResponse(CondimentPayload):
  id: str
  created_at: datetime
  updated_at: datetime
