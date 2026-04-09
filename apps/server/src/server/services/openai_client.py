from __future__ import annotations

import json as _json
from typing import Any, Dict, List

import httpx

from server.core.config import Settings


class OpenAIClient:
  """HTTP client for Zhipu GLM / OpenAI-compatible Chat & Vision endpoints."""

  def __init__(self, *, settings: Settings):
    self._settings = settings
    self._client = httpx.AsyncClient(
      base_url=settings.openai_api_base,
      headers={
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
      },
      timeout=60,
    )

  async def recognize(
    self,
    *,
    messages: List[Dict[str, Any]],
    response_format: str | None = None,
  ) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
      "model": self._settings.openai_vision_model,
      "messages": messages,
    }
    if response_format:
      payload["response_format"] = {"type": response_format}
    response = await self._client.post("/chat/completions", json=payload)
    if response.status_code != 200:
      body = response.text
      raise RuntimeError(f"Vision API error {response.status_code}: {body}")
    return response.json()

  async def chat(
    self,
    *,
    messages: List[Dict[str, Any]],
    response_format: str | None = None,
  ) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
      "model": self._settings.openai_chat_model,
      "messages": messages,
    }
    if response_format:
      payload["response_format"] = {"type": response_format}
    response = await self._client.post("/chat/completions", json=payload)
    if response.status_code != 200:
      body = response.text
      raise RuntimeError(f"Chat API error {response.status_code}: {body}")
    return response.json()

  async def close(self) -> None:
    await self._client.aclose()
