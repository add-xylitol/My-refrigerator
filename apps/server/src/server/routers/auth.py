from fastapi import APIRouter, Depends, status

from server.core.dependencies import get_auth_service
from server.schemas.auth import AnonAuthRequest, AnonAuthResponse, WxLoginRequest, WxLoginResponse
from server.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
  "/anon",
  response_model=AnonAuthResponse,
  status_code=status.HTTP_201_CREATED,
  summary="匿名登录",
)
async def issue_anon_token(
  payload: AnonAuthRequest,
  service: AuthService = Depends(get_auth_service),
) -> AnonAuthResponse:
  return await service.issue_anon_token(payload)


@router.post(
  "/local",
  response_model=AnonAuthResponse,
  status_code=status.HTTP_201_CREATED,
  summary="本地开发登录（无需设备指纹）",
)
async def local_login(
  service: AuthService = Depends(get_auth_service),
) -> AnonAuthResponse:
  return await service.issue_local_token()


@router.post(
  "/wx-login",
  response_model=WxLoginResponse,
  status_code=status.HTTP_201_CREATED,
  summary="微信小程序登录",
)
async def wx_login(
  payload: WxLoginRequest,
  service: AuthService = Depends(get_auth_service),
) -> WxLoginResponse:
  return await service.wx_login(payload.code)
