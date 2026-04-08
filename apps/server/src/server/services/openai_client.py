from __future__ import annotations

from typing import Any, Dict, List

import httpx

from server.core.config import Settings


class OpenAIClient:
  """Simple HTTP client for calling OpenAI-compatible Chat/Vision endpoints (qnaigc default)."""

  def __init__(self, *, settings: Settings):
    self._settings = settings
    self._client = httpx.AsyncClient(
      base_url=settings.openai_api_base,
      headers={
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
      },
      timeout=30,
    )

  async def recognize(
    self,
    *,
    messages: List[Dict[str, Any]],
    response_format: str = "json_object",
  ) -> Dict[str, Any]:
    payload = {
      "model": self._settings.openai_vision_model,
      "messages": messages,
      "response_format": {"type": response_format},
    }
    response = await self._client.post("/chat/completions", json=payload)
    response.raise_for_status()
    return response.json()

  async def chat(
    self,
    *,
    messages: List[Dict[str, Any]],
    response_format: str | None = None,
  ) -> Dict[str, Any]:
    payload = {
      "model": self._settings.openai_chat_model,
      "messages": messages,
    }
    if response_format:
      payload["response_format"] = {"type": response_format}
    response = await self._client.post("/chat/completions", json=payload)
    response.raise_for_status()
    return response.json()

  async def close(self) -> None:
    await self._client.aclose()
