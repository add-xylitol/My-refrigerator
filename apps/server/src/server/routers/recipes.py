from typing import Any, Dict, List

from fastapi import APIRouter, Depends

from server.core.dependencies import get_current_profile, get_openai_client, get_recipe_service
from server.schemas.auth import AuthContext
from server.schemas.recipes import RecipeConsumeRequest, RecipeSuggestRequest, RecipeSuggestion
from server.services.openai_client import OpenAIClient
from server.services.recipes import RecipeService

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.post("/suggest", response_model=List[RecipeSuggestion])
async def suggest_recipes(
  payload: RecipeSuggestRequest,
  profile: AuthContext = Depends(get_current_profile),
  service: RecipeService = Depends(get_recipe_service),
  client: OpenAIClient = Depends(get_openai_client),
) -> List[RecipeSuggestion]:
  return await service.suggest(profile.profile_id, payload, client)


@router.post("/consume")
async def consume_recipe(
  payload: RecipeConsumeRequest,
  profile: AuthContext = Depends(get_current_profile),
  service: RecipeService = Depends(get_recipe_service),
) -> Dict[str, Any]:
  return await service.consume(profile.profile_id, payload.recipe_id, payload.items_used)
