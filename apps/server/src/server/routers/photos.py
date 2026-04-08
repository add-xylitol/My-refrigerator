from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from loguru import logger

from server.core.dependencies import get_current_profile, get_supabase_gateway
from server.schemas.auth import AuthContext
from server.schemas.photos import PhotoUploadResponse

router = APIRouter(prefix="/photos", tags=["photos"])

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("", response_model=PhotoUploadResponse)
async def upload_photo(
    file: UploadFile = File(...),
    shelf_id: str | None = Query(default=None),
    profile: AuthContext = Depends(get_current_profile),
    gateway=Depends(get_supabase_gateway),
) -> PhotoUploadResponse:
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 10 MB limit",
        )

    content_type = file.content_type or "application/octet-stream"
    logger.info(
        "Upload photo for profile={} size={} content_type={}",
        profile.profile_id,
        len(content),
        content_type,
    )

    result = gateway.upload_photo(
        profile_id=UUID(profile.profile_id),
        content=content,
        content_type=content_type,
        shelf_id=shelf_id,
    )
    return PhotoUploadResponse(**result)
