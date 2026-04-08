from loguru import logger

from server.core.config import get_settings

_LOGGER_CONFIGURED = False


def configure_logging() -> None:
  """Configure Loguru once per process."""
  global _LOGGER_CONFIGURED
  if _LOGGER_CONFIGURED:
    return
  settings = get_settings()
  logger.remove()
  logger.add(
    sink=lambda msg: print(msg, end=""),  # noqa: T201 - console logging for dev
    level=settings.log_level.upper(),
    serialize=False,
    enqueue=True,
    backtrace=settings.environment == "local",
    diagnose=settings.environment == "local",
  )
  _LOGGER_CONFIGURED = True
