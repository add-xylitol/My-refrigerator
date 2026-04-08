from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

import httpx
from fastapi import HTTPException, status

from server.core.config import Settings
from server.schemas.auth import AnonAuthRequest, AnonAuthResponse, AuthContext, WxLoginResponse
from server.services.supabase import SupabaseGateway
from server.services.local_gateway import LocalGateway


class AuthService:
  """Issue tokens for both anonymous (local) and WeChat login."""

  def __init__(self, *, settings: Settings, supabase: SupabaseGateway | LocalGateway):
    self._settings = settings
    self._supabase = supabase

  def _issue_token(self, profile: dict) -> tuple[str, datetime, str]:
    expires_at = datetime.now(tz=timezone.utc) + timedelta(minutes=self._settings.jwt_expires_minutes)
    token = secrets.token_urlsafe(32)
    profile_id = UUID(profile["id"])
    self._supabase.update_profile_token(profile_id, token, expires_at)
    return token, expires_at, str(profile_id)

  async def issue_anon_token(self, payload: AnonAuthRequest) -> AnonAuthResponse:
    profile = self._supabase.find_profile_by_fingerprint(payload.device_fingerprint)
    if profile is None:
      profile = self._supabase.insert_profile(payload.device_fingerprint)

    token, expires_at, profile_id = self._issue_token(profile)
    return AnonAuthResponse(profile_id=profile_id, access_token=token, expires_at=expires_at)

  async def issue_local_token(self) -> AnonAuthResponse:
    """Quick local dev login - creates a default user."""
    token, expires_at, profile_id = self._issue_token(
      self._supabase.insert_profile(nickname="本地测试用户")
    )
    return AnonAuthResponse(profile_id=profile_id, access_token=token, expires_at=expires_at)

  async def wx_login(self, code: str) -> WxLoginResponse:
    """微信小程序 code 换 openid，创建/查找用户。"""
    if not self._settings.wx_appid or not self._settings.wx_secret:
      raise HTTPException(status_code=400, detail="微信登录未配置")

    async with httpx.AsyncClient() as client:
      resp = await client.get(
        "https://api.weixin.qq.com/sns/jscode2session",
        params={
          "appid": self._settings.wx_appid,
          "secret": self._settings.wx_secret,
          "js_code": code,
          "grant_type": "authorization_code",
        },
      )
    resp.raise_for_status()
    wx_data = resp.json()
    openid = wx_data.get("openid")
    if not openid:
      raise HTTPException(status_code=400, detail=f"微信登录失败: {wx_data.get('errmsg', 'unknown')}")

    is_new = False
    profile = self._supabase.find_profile_by_wx_openid(openid)
    if profile is None:
      profile = self._supabase.insert_wx_profile(openid, wx_data.get("unionid"))
      is_new = True

    token, expires_at, profile_id = self._issue_token(profile)
    return WxLoginResponse(
      profile_id=profile_id, access_token=token,
      expires_at=expires_at, is_new_user=is_new,
    )

  async def authenticate(self, token: str) -> AuthContext:
    profile = self._supabase.find_profile_by_token(token)
    if not profile:
      raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    expires_at_str = profile.get("token_expires_at")
    if expires_at_str:
      expires_at = datetime.fromisoformat(expires_at_str)
      if expires_at < datetime.now(tz=timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")

    return AuthContext(profile_id=str(profile["id"]), token=token)
