from datetime import date
from typing import List, Literal, Optional

from server.schemas.base import ApiSchema
from server.schemas.fridge import QuantityUnit

RecipeTag = Literal["临期优先", "快速上桌", "冷冻解压", "定制"]


class RecipeUsage(ApiSchema):
  item_id: Optional[str] = None
  name: str
  qty: float
  unit: QuantityUnit


class RecipeSuggestion(ApiSchema):
  id: str
  title: str
  minutes: Optional[int] = None
  summary: Optional[str] = None
  tag: RecipeTag = "临期优先"
  usage: List[RecipeUsage]
  condiments: List[str] = []
  steps: List[str] = []
  generated_at: date
  missing_ingredients: List[str] = []
  all_available: bool = True


class RecipeSuggestRequest(ApiSchema):
  max_results: int = 5
  prompt: Optional[str] = None
  tag: Optional[RecipeTag] = None


class RecipeConsumeRequest(ApiSchema):
  recipe_id: str
  items_used: List[RecipeUsage]
