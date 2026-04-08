from collections.abc import AsyncGenerator
from functools import lru_cache

from fastapi import Depends, Header, HTTPException, status

from server.core.config import Settings, get_settings
from server.services.auth import AuthService
from server.services.openai_client import OpenAIClient
from server.services.recipes import RecipeService
from server.services.supabase import SupabaseGateway
from server.services.local_gateway import LocalGateway
from server.schemas.auth import AuthContext


@lru_cache(maxsize=1)
def _get_gateway():
  settings = get_settings()
  if settings.local_mode:
    return LocalGateway()
  return SupabaseGateway.from_settings(settings)


def get_gateway():
  return _get_gateway()


# Backward compat alias
def get_supabase_gateway():
  return get_gateway()


async def get_openai_client(
  settings: Settings = Depends(get_settings),
) -> AsyncGenerator[OpenAIClient, None]:
  client = OpenAIClient(settings=settings)
  try:
    yield client
  finally:
    await client.close()


def get_auth_service(
  settings: Settings = Depends(get_settings),
  gateway=Depends(get_gateway),
) -> AuthService:
  return AuthService(settings=settings, supabase=gateway)


def get_recipe_service(
  gateway=Depends(get_gateway),
) -> RecipeService:
  return RecipeService(gateway=gateway)


async def get_current_profile(
  authorization: str | None = Header(default=None),
  service: AuthService = Depends(get_auth_service),
) -> AuthContext:
  if not authorization:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
  scheme, _, token = authorization.partition(" ")
  if scheme.lower() != "bearer" or not token:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header")
  return await service.authenticate(token)
