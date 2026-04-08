from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.core.logging import configure_logging
from server.routers import mount_routes


def create_app() -> FastAPI:
  configure_logging()
  app = FastAPI(
    title="我的冰箱 API",
    version="0.1.0",
    description="BFF for the My Refrigerator MVP.",
  )
  app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
  )
  app.include_router(mount_routes())
  return app


app = create_app()


def run() -> None:  # pragma: no cover - CLI helper
  import uvicorn

  uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True)
