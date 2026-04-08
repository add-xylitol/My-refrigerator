from fastapi import APIRouter

from server.routers import auth, fridge, health, meals, photos, recipes, shelf_life, shopping, vision


def mount_routes() -> APIRouter:
  router = APIRouter()
  router.include_router(health.router)
  router.include_router(auth.router)
  router.include_router(fridge.router)
  router.include_router(recipes.router)
  router.include_router(vision.router)
  router.include_router(photos.router)
  router.include_router(shelf_life.router)
  router.include_router(meals.router)
  router.include_router(shopping.router)
  return router
