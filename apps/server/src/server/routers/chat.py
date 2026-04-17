from __future__ import annotations

import json
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends

from server.core.dependencies import get_current_profile, get_gateway, get_openai_client
from server.schemas.auth import AuthContext
from server.schemas.recipes import RecipeSuggestion, RecipeUsage
from server.services.openai_client import OpenAIClient

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest:
    pass


from pydantic import BaseModel, Field


class ChatMessageIn(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequestBody(BaseModel):
    messages: List[ChatMessageIn]


class ChatResponse(BaseModel):
    reply: str
    suggested_recipes: List[Dict[str, Any]] = []


@router.post("", response_model=ChatResponse)
async def chat_with_ai(
    payload: ChatRequestBody,
    profile: AuthContext = Depends(get_current_profile),
    gateway=Depends(get_gateway),
    client: OpenAIClient = Depends(get_openai_client),
) -> ChatResponse:
    pid = UUID(profile.profile_id)

    # Fetch inventory context
    items = gateway.list_items(pid)
    condiments = gateway.list_condiments(pid)

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

    system_prompt = (
        "你是一名专业的家庭厨师助手「小冰」，擅长根据冰箱现有食材推荐合适的菜谱。\n"
        "你可以和用户自由对话，回答关于做菜、食材搭配、保存方法等问题。\n"
        "当你推荐菜谱时，请在回复末尾附带一个 JSON 块，格式如下：\n"
        "```json\n"
        '{"recipes": [{'
        '  "title": "菜名",'
        '  "minutes": 15,'
        '  "summary": "简短描述",'
        '  "tag": "临期优先/快速上桌/冷冻解压/定制",'
        '  "usage": [{"name": "食材名", "qty": 1, "unit": "个"}],'
        '  "condiments": ["调料1", "调料2"],'
        '  "steps": ["步骤1", "步骤2"],'
        '  "missing_ingredients": [],'
        '  "all_available": true'
        "}]}\n"
        "```\n"
        "如果你没有推荐具体菜谱，就不需要附带 JSON。\n\n"
        f"当前冰箱食材：\n{inventory_text}\n\n"
        f"当前调料：\n{condiment_text}"
    )

    messages: List[Dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    for msg in payload.messages:
        messages.append({"role": msg.role, "content": msg.content})

    try:
        raw = await client.chat(messages=messages)
    except Exception as exc:
        return ChatResponse(
            reply=f"抱歉，AI 服务暂时不可用：{exc}",
            suggested_recipes=[],
        )

    # Extract text content
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

    # Try to extract JSON recipe block from the reply
    reply_text = content
    suggested_recipes: List[Dict[str, Any]] = []

    # Look for ```json ... ``` block
    if "```json" in content:
        parts = content.split("```json", 1)
        reply_text = parts[0].strip()
        json_part = parts[1].split("```", 1)[0].strip()
        try:
            parsed = json.loads(json_part)
            recipes_raw = parsed.get("recipes", [])
            for r in recipes_raw:
                usage_list = []
                for u in r.get("usage", []):
                    usage_list.append({
                        "id": str(uuid4()),
                        "name": u.get("name", ""),
                        "qty": float(u.get("qty", 1)),
                        "unit": u.get("unit", "个"),
                    })
                suggested_recipes.append({
                    "id": str(uuid4()),
                    "title": r.get("title", ""),
                    "minutes": r.get("minutes"),
                    "summary": r.get("summary"),
                    "tag": r.get("tag", "定制"),
                    "usage": usage_list,
                    "condiments": r.get("condiments", []),
                    "steps": r.get("steps", []),
                    "generated_at": str(__import__("datetime").date.today()),
                    "missing_ingredients": r.get("missing_ingredients", []),
                    "all_available": r.get("all_available", True),
                })
        except json.JSONDecodeError:
            pass

    return ChatResponse(reply=reply_text, suggested_recipes=suggested_recipes)
