from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  """Application configuration loaded from environment variables."""

  environment: str = Field(default="local", validation_alias="ENVIRONMENT")
  log_level: str = Field(default="INFO", validation_alias="LOG_LEVEL")

  # Local mode: when true, uses in-memory data instead of Supabase
  local_mode: bool = Field(default=True, validation_alias="LOCAL_MODE")

  supabase_url: str = Field(default="http://localhost:54321", validation_alias="SUPABASE_URL")
  supabase_service_role_key: str = Field(default="local-dev-key", validation_alias="SUPABASE_SERVICE_ROLE_KEY")
  supabase_anon_key: str | None = Field(default=None, validation_alias="SUPABASE_ANON_KEY")

  openai_api_key: str = Field(default="sk-placeholder", validation_alias="OPENAI_API_KEY")
  openai_api_base: str = Field(
    default="https://open.bigmodel.cn/api/paas/v4", validation_alias="OPENAI_API_BASE"
  )
  openai_vision_model: str = Field(
    default="glm-4v-flash", validation_alias="OPENAI_VISION_MODEL"
  )
  openai_chat_model: str = Field(default="glm-4-flash", validation_alias="OPENAI_CHAT_MODEL")

  jwt_secret: str = Field(default="local-dev-secret-change-me", validation_alias="JWT_SECRET")
  jwt_expires_minutes: int = Field(default=60, validation_alias="JWT_EXPIRES_MINUTES")

  wx_appid: str | None = Field(default=None, validation_alias="WX_APPID")
  wx_secret: str | None = Field(default=None, validation_alias="WX_SECRET")

  model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="allow")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
  """Provide a cached Settings instance."""
  return Settings()  # type: ignore[call-arg]
