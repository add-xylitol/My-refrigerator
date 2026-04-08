from datetime import datetime

from pydantic import Field

from server.schemas.base import ApiSchema


class AnonAuthRequest(ApiSchema):
  device_fingerprint: str = Field(min_length=6, max_length=128)


class AnonAuthResponse(ApiSchema):
  profile_id: str
  access_token: str
  expires_at: datetime


class WxLoginRequest(ApiSchema):
  code: str = Field(min_length=1, max_length=128, description="微信登录 code")


class WxLoginResponse(ApiSchema):
  profile_id: str
  access_token: str
  expires_at: datetime
  is_new_user: bool = False


class AuthContext(ApiSchema):
  profile_id: str
  token: str
