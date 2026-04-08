from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from server.core.dependencies import get_current_profile, get_openai_client
from server.schemas.auth import AuthContext
from server.schemas.vision import VisionRecognizeRequest, VisionRecognizeResponse
from server.services.openai_client import OpenAIClient

router = APIRouter(prefix="/vision", tags=["vision"])


@router.post("/recognize", response_model=VisionRecognizeResponse)
async def recognize(
  payload: VisionRecognizeRequest,
  profile: AuthContext = Depends(get_current_profile),
  client: OpenAIClient = Depends(get_openai_client),
) -> VisionRecognizeResponse:
  prompt = "\n".join(
    [
      "你是一名冰箱食材识别助手，需要根据照片返回清晰的候选清单。",
      "请只返回 JSON 对象，字段说明：",
      "- note: 对识别的总体说明，可为空字符串；",
      "- items: 数组，每个元素包含 name (食材中文名称)、quantity (数字)、unit (从以下列表选择：个/克/毫升/把/袋)、confidence (0-1)、expiry (可选 ISO 日期或字符串)、barcode (可选)、shelf_life_days (建议保质天数，即距离过期还剩几天)。",
      "识别失败或不确定时依然返回合理估计，避免出现 null。",
      f"当前层位：{payload.shelf_id}。",
      "如果图中没有食材，请返回空数组。",
      "JSON 示例：{\"note\":\"\",\"items\":[{\"name\":\"鸡蛋\",\"quantity\":6,\"unit\":\"个\",\"confidence\":0.9,\"expiry\":\"2024-06-30\",\"barcode\":null,\"shelf_life_days\":30}]}",
    ]
  )

  # Prefer image_url, fallback to image_base64
  image_source = payload.image_url or payload.image_base64
  if not image_source:
    raise HTTPException(
      status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
      detail="Either image_url or image_base64 must be provided.",
    )

  messages: List[Dict[str, Any]] = [
    {
      "role": "system",
      "content": "You are a bilingual fridge inventory vision assistant. Respond in Chinese JSON.",
    },
    {
      "role": "user",
      "content": [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": image_source}},
      ],
    },
  ]

  debug: Dict[str, Any] = {
    "prompt": prompt,
    "request_payload": {"messages": _sanitize_messages(messages)},
  }

  try:
    raw = await client.recognize(messages=messages)
  except Exception as exc:  # pragma: no cover - passthrough for client errors
    debug["error"] = str(exc)
    raise HTTPException(
      status_code=status.HTTP_502_BAD_GATEWAY,
      detail="Vision model request failed",
    ) from exc

  content = _extract_content(raw)
  debug["response_text"] = content

  try:
    parsed = json.loads(content)
  except json.JSONDecodeError as exc:
    debug["parse_error"] = str(exc)
    raise HTTPException(
      status_code=status.HTTP_502_BAD_GATEWAY,
      detail="模型返回内容无法解析为 JSON",
    ) from exc

  debug["parsed_json"] = parsed
  candidates = _to_candidates(parsed.get("items", []))
  note = (parsed.get("note") or "").strip() or "识别结果由 GLM 提供，请核对后入库。"

  return VisionRecognizeResponse(note=note, candidates=candidates, debug=debug)


def _sanitize_messages(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
  sanitized: List[Dict[str, Any]] = []
  for message in messages:
    if isinstance(message.get("content"), list):
      new_content = []
      for part in message["content"]:
        if isinstance(part, dict) and part.get("type") == "image_url":
          image_url = part.get("image_url") or {}
          new_content.append(
            {**part, "image_url": {**image_url, "url": "[base64 omitted]"}}
          )
        else:
          new_content.append(part)
      sanitized.append({**message, "content": new_content})
    else:
      sanitized.append(message)
  return sanitized


def _extract_content(response: Dict[str, Any]) -> str:
  choices = response.get("choices") or []
  first = choices[0] if choices else {}
  message = first.get("message") or {}
  content = message.get("content")
  if isinstance(content, str):
    return content.strip()
  if isinstance(content, list):
    parts = []
    for part in content:
      if isinstance(part, dict) and part.get("type") == "text":
        text = part.get("text") or ""
        if text:
          parts.append(text)
    joined = "\n".join(parts).strip()
    if joined:
      return joined
  raise HTTPException(
    status_code=status.HTTP_502_BAD_GATEWAY,
    detail="模型响应缺少文本内容",
  )


def _parse_float(value: Any, default: float = 1.0) -> float:
  try:
    numeric = float(value)
    if numeric <= 0:
      return default
    return numeric
  except Exception:
    return default


def _normalize_confidence(value: Any) -> float:
  numeric = _parse_float(value, default=0.6)
  if numeric > 1 and numeric <= 100:
    return min(numeric / 100, 1.0)
  return min(max(numeric, 0.0), 1.0)


def _normalize_unit(value: Any) -> str:
  allowed = {"个", "克", "毫升", "把", "袋"}
  if isinstance(value, str) and value in allowed:
    return value
  return "个"


def _normalize_expiry(value: Any) -> str | None:
  if not value:
    return None
  text = str(value).strip()
  if not text:
    return None
  try:
    dt = datetime.fromisoformat(text)
    return dt.date().isoformat()
  except Exception:
    return text


def _parse_shelf_life_days(value: Any) -> int | None:
  if value is None:
    return None
  try:
    days = int(value)
    return days if days > 0 else None
  except Exception:
    return None


def _to_candidates(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
  candidates: List[Dict[str, Any]] = []
  for item in items:
    name = (item.get("name") or "").strip()
    if not name:
      continue
    candidates.append(
      {
        "id": str(uuid4()),
        "name": name,
        "qty": max(0.1, _parse_float(item.get("quantity"))),
        "unit": _normalize_unit(item.get("unit")),
        "exp_date": _normalize_expiry(item.get("expiry")),
        "confidence": _normalize_confidence(item.get("confidence")),
        "barcode": item.get("barcode"),
        "shelf_life_days": _parse_shelf_life_days(item.get("shelf_life_days")),
      }
    )
  return candidates
