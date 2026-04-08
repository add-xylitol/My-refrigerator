from __future__ import annotations

import json
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from server.schemas.recipes import (
  RecipeConsumeRequest,
  RecipeSuggestion,
  RecipeSuggestRequest,
  RecipeUsage,
)
from server.services.openai_client import OpenAIClient


class RecipeService:
  """AI-powered recipe suggestion and consumption service."""

  def __init__(self, *, gateway: Any, openai_client: Optional[OpenAIClient] = None):
    self._gateway = gateway
    self._openai_client = openai_client

  async def suggest(
    self,
    profile_id: str,
    payload: RecipeSuggestRequest,
    client: OpenAIClient,
  ) -> List[RecipeSuggestion]:
    """Fetch inventory, build prompt, call OpenAI, parse into RecipeSuggestion list."""
    from uuid import UUID

    pid = UUID(profile_id)

    # Fetch current items and condiments from the gateway
    items = self._gateway.list_items(pid)
    condiments = self._gateway.list_condiments(pid)

    # Build inventory summary for the prompt
    item_lines: List[str] = []
    for item in items:
      name = item.get("name", "未知")
      qty = item.get("qty", 0)
      unit = item.get("unit", "个")
      exp = item.get("exp_date", "")
      exp_info = f"，过期日期：{exp}" if exp else ""
      item_lines.append(f"- {name} {qty}{unit}{exp_info}")

    condiment_lines: List[str] = []
    for cond in condiments:
      cname = cond.get("name", "未知")
      stock = cond.get("stock_level", "充足")
      condiment_lines.append(f"- {cname}（{stock}）")

    inventory_text = "\n".join(item_lines) if item_lines else "（暂无食材）"
    condiment_text = "\n".join(condiment_lines) if condiment_lines else "（暂无调料）"

    tag_instruction = ""
    if payload.tag:
      tag_instruction = f"\n请优先推荐「{payload.tag}」类型的菜谱。"

    user_extra = ""
    if payload.prompt:
      user_extra = f"\n用户额外要求：{payload.prompt}"

    system_prompt = (
      "你是一名专业的家庭厨师助手，擅长根据冰箱现有食材推荐合适的菜谱。"
      "你需要根据用户冰箱中的食材和调料，推荐适合的菜谱。"
      "请只返回 JSON，不要任何其他文字。"
    )

    user_prompt = "\n".join([
      f"请根据以下冰箱食材推荐最多 {payload.max_results} 个菜谱。",
      "",
      "冰箱食材：",
      inventory_text,
      "",
      "现有调料：",
      condiment_text,
      tag_instruction,
      user_extra,
      "",
      "请返回 JSON，格式如下：",
      '{"recipes": [{',
      '  "title": "菜名",',
      '  "minutes": 15,',
      '  "summary": "简短描述",',
      '  "tag": "临期优先/快速上桌/冷冻解压/定制",',
      '  "usage": [{"item_id": "可选", "name": "食材名", "qty": 1, "unit": "个"}],',
      '  "condiments": ["调料1", "调料2"],',
      '  "steps": ["步骤1", "步骤2"],',
      '  "missing_ingredients": ["缺少的食材"],',
      '  "all_available": true',
      "}]}",
    ])

    messages = [
      {"role": "system", "content": system_prompt},
      {"role": "user", "content": user_prompt},
    ]

    try:
      raw = await client.chat(messages=messages, response_format="json_object")
    except Exception as exc:
      raise RuntimeError(f"Recipe AI request failed: {exc}") from exc

    # Extract content from response
    choices = raw.get("choices") or []
    first = choices[0] if choices else {}
    message = first.get("message") or {}
    content = message.get("content", "")

    if isinstance(content, list):
      parts = []
      for part in content:
        if isinstance(part, dict) and part.get("type") == "text":
          parts.append(part.get("text", ""))
      content = "\n".join(parts)

    content = content.strip()

    try:
      parsed = json.loads(content)
    except json.JSONDecodeError as exc:
      raise RuntimeError(f"Recipe AI returned invalid JSON: {exc}") from exc

    recipes_raw = parsed.get("recipes", [])
    if not isinstance(recipes_raw, list):
      recipes_raw = []

    suggestions: List[RecipeSuggestion] = []
    for idx, r in enumerate(recipes_raw):
      usage_list: List[RecipeUsage] = []
      for u in r.get("usage", []):
        usage_list.append(
          RecipeUsage(
            item_id=u.get("item_id"),
            name=u.get("name", ""),
            qty=float(u.get("qty", 1)),
            unit=u.get("unit", "个"),
          )
        )

      missing = r.get("missing_ingredients", [])
      if not isinstance(missing, list):
        missing = []

      all_available = bool(r.get("all_available", len(missing) == 0))

      suggestions.append(
        RecipeSuggestion(
          id=r.get("id", str(uuid4())),
          title=r.get("title", f"推荐菜谱 {idx + 1}"),
          minutes=r.get("minutes"),
          summary=r.get("summary"),
          tag=r.get("tag", "临期优先"),
          usage=usage_list,
          condiments=r.get("condiments", []),
          steps=r.get("steps", []),
          generated_at=date.today(),
          missing_ingredients=missing,
          all_available=all_available,
        )
      )

    return suggestions[: payload.max_results]

  async def consume(
    self,
    profile_id: str,
    recipe_id: str,
    items_used: List[RecipeUsage],
  ) -> Dict[str, Any]:
    """Deduct used items from inventory and create a meal log."""
    from uuid import UUID

    pid = UUID(profile_id)

    deducted: List[Dict[str, Any]] = []
    errors: List[str] = []

    for usage in items_used:
      item_id = usage.item_id
      if not item_id:
        # Try to find the item by name
        all_items = self._gateway.list_items(pid)
        matched = [i for i in all_items if i.get("name") == usage.name]
        if matched:
          item_id = matched[0].get("id")
        else:
          errors.append(f"找不到食材：{usage.name}")
          continue

      try:
        existing = self._gateway.update_item(pid, item_id, {})
        current_qty = float(existing.get("qty", 0))
        new_qty = current_qty - usage.qty

        if new_qty <= 0:
          self._gateway.delete_item(pid, item_id)
          deducted.append({"item_id": item_id, "name": usage.name, "action": "deleted"})
        else:
          self._gateway.update_item(pid, item_id, {"qty": new_qty})
          deducted.append({"item_id": item_id, "name": usage.name, "action": "deducted", "remaining": new_qty})
      except Exception as exc:
        errors.append(f"扣减 {usage.name} 失败: {exc}")

    # Create meal log
    meal_log = self._gateway.insert_meal_log(
      pid,
      {
        "recipe_id": recipe_id,
        "items_used": [u.model_dump() for u in items_used],
        "deducted": deducted,
        "errors": errors,
        "eaten_at": datetime.now(tz=timezone.utc).isoformat(),
      },
    )

    return {
      "meal_log_id": meal_log.get("id"),
      "deducted": deducted,
      "errors": errors,
    }
