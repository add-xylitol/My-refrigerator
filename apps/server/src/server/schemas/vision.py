from typing import List, Optional

from server.schemas.base import ApiSchema
from server.schemas.fridge import QuantityUnit


class VisionCandidate(ApiSchema):
  id: str
  name: str
  qty: float
  unit: QuantityUnit
  exp_date: Optional[str] = None
  confidence: float
  barcode: Optional[str] = None
  shelf_life_days: Optional[int] = None


class VisionRecognizeRequest(ApiSchema):
  photo_id: str | None = None
  image_base64: str | None = None
  image_url: str | None = None
  shelf_id: str = "auto"


class VisionRecognizeResponse(ApiSchema):
  note: str | None = None
  candidates: List[VisionCandidate] = []
  debug: dict | None = None
