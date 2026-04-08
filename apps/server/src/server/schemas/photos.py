from datetime import datetime

from server.schemas.base import ApiSchema


class PhotoUploadResponse(ApiSchema):
    id: str
    url: str
    created_at: datetime
