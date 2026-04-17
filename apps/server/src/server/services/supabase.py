from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client, create_client

from server.core.config import Settings


def _convert_dates(row: Dict[str, Any]) -> Dict[str, Any]:
  """Convert date/datetime objects to ISO strings for JSON serialization."""
  from datetime import date, datetime
  result = {}
  for k, v in row.items():
    if isinstance(v, (date, datetime)):
      result[k] = v.isoformat()
    else:
      result[k] = v
  return result


class SupabaseGateway:
  """Thin wrapper around the official Supabase client."""

  def __init__(self, client: Client):
    self._client = client

  @classmethod
  def from_settings(cls, settings: Settings) -> "SupabaseGateway":
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return cls(client)

  # -- Auth --------------------------------------------------------------------
  def find_profile_by_fingerprint(self, device_fingerprint: str) -> Optional[Dict[str, Any]]:
    data = (
      self._client.table("profiles")
      .select("*")
      .eq("device_fingerprint", device_fingerprint)
      .maybe_single()
      .execute()
      .data
    )
    return data

  def find_profile_by_wx_openid(self, openid: str) -> Optional[Dict[str, Any]]:
    data = (
      self._client.table("profiles")
      .select("*")
      .eq("wx_openid", openid)
      .maybe_single()
      .execute()
      .data
    )
    return data

  def find_profile_by_token(self, token: str) -> Optional[Dict[str, Any]]:
    data = (
      self._client.table("profiles")
      .select("*")
      .eq("last_token", token)
      .maybe_single()
      .execute()
      .data
    )
    return data

  def insert_profile(self, device_fingerprint: str | None = None, *, wx_openid: str | None = None, nickname: str = "本地用户") -> Dict[str, Any]:
    payload: Dict[str, Any] = {"nickname": nickname}
    if device_fingerprint:
      payload["device_fingerprint"] = device_fingerprint
    if wx_openid:
      payload["wx_openid"] = wx_openid
    result = self._client.table("profiles").insert(payload).execute()
    data = result.data[0] if result.data else None
    # Create default shelves for new profile
    if data:
      self._create_default_shelves(data["id"])
    return data

  def insert_wx_profile(self, openid: str, unionid: str | None = None, nickname: str = "微信用户") -> Dict[str, Any]:
    return self.insert_profile(wx_openid=openid, nickname=nickname)

  def update_profile_token(self, profile_id: UUID, token: str, expires_at: datetime) -> Dict[str, Any]:
    payload = {"last_token": token, "token_expires_at": expires_at.isoformat()}
    result = (
      self._client.table("profiles")
      .update(payload)
      .eq("id", str(profile_id))
      .execute()
    )
    return result.data[0] if result.data else {}

  # -- Shelves -----------------------------------------------------------------

  def _create_default_shelves(self, profile_id: str) -> None:
    from uuid import uuid4
    defaults = [
      ("冷藏层 1", 1, "chill"),
      ("冷藏层 2", 2, "chill"),
      ("冷藏层 3", 3, "chill"),
      ("冷冻层", 4, "freeze"),
      ("果蔬盒", 5, "produce"),
    ]
    records = [
      {"id": str(uuid4()), "profile_id": profile_id, "name": name, "sort": sort, "type": stype}
      for name, sort, stype in defaults
    ]
    self._client.table("shelves").insert(records).execute()

  def list_shelves(self, profile_id: UUID) -> List[Dict[str, Any]]:
    data = (
      self._client.table("shelves")
      .select("*")
      .eq("profile_id", str(profile_id))
      .order("sort")
      .execute()
      .data
    )
    return data or []

  def upsert_shelves(self, profile_id: UUID, shelves: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    records = []
    for shelf in shelves:
      record = {
        **shelf,
        "profile_id": str(profile_id),
      }
      record.pop("createdAt", None)
      record.pop("updatedAt", None)
      records.append(record)

    data = (
      self._client.table("shelves")
      .upsert(records, on_conflict="id")
      .execute()
      .data
    )
    return data or []

  def delete_shelf(self, profile_id: UUID, shelf_id: str) -> bool:
    data = (
      self._client.table("shelves")
      .delete()
      .eq("profile_id", str(profile_id))
      .eq("id", shelf_id)
      .execute()
      .data
    )
    return bool(data)

  # -- Items -------------------------------------------------------------------
  def list_items(self, profile_id: UUID, shelf_id: Optional[str] = None) -> List[Dict[str, Any]]:
    query = self._client.table("items").select("*").eq("profile_id", str(profile_id)).order("updated_at", desc=True)
    if shelf_id:
      query = query.eq("shelf_id", shelf_id)
    data = query.execute().data
    return [_convert_dates(row) for row in (data or [])]

  def insert_items(self, profile_id: UUID, shelf_id: str, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    records: List[Dict[str, Any]] = []
    for item in items:
      record = _convert_dates({
        "profile_id": str(profile_id),
        "shelf_id": shelf_id,
        "name": item["name"],
        "unit": item.get("unit"),
        "qty": item.get("qty", 1),
        "exp_date": item.get("exp_date"),
        "barcode": item.get("barcode"),
        "photo_id": item.get("photo_id"),
        "note": item.get("note"),
      })
      records.append(record)

    data = self._client.table("items").insert(records).execute().data
    return [_convert_dates(row) for row in (data or [])]

  def update_item(self, profile_id: UUID, item_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
    payload = {key: value for key, value in changes.items() if value is not None}
    result = (
      self._client.table("items")
      .update(payload)
      .eq("profile_id", str(profile_id))
      .eq("id", item_id)
      .execute()
    )
    if not result.data:
      raise RuntimeError("Item not found or no changes applied.")
    return result.data[0]

  def delete_item(self, profile_id: UUID, item_id: str) -> bool:
    data = (
      self._client.table("items")
      .delete()
      .eq("profile_id", str(profile_id))
      .eq("id", item_id)
      .execute()
      .data
    )
    return bool(data)

  # -- Condiments --------------------------------------------------------------
  def list_condiments(self, profile_id: UUID) -> List[Dict[str, Any]]:
    data = (
      self._client.table("condiments")
      .select("*")
      .eq("profile_id", str(profile_id))
      .order("created_at")
      .execute()
      .data
    )
    return data or []

  def upsert_condiments(self, profile_id: UUID, condiments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    records = []
    for condiment in condiments:
      record = {
        **condiment,
        "profile_id": str(profile_id),
      }
      record.pop("createdAt", None)
      record.pop("updatedAt", None)
      records.append(record)
    data = (
      self._client.table("condiments")
      .upsert(records, on_conflict="id")
      .execute()
      .data
    )
    return data or []

  def delete_condiment(self, profile_id: UUID, condiment_id: str) -> bool:
    data = (
      self._client.table("condiments")
      .delete()
      .eq("profile_id", str(profile_id))
      .eq("id", condiment_id)
      .execute()
      .data
    )
    return bool(data)

  # -- Photos ------------------------------------------------------------------
  def upload_photo(self, profile_id: UUID, content: bytes, content_type: str, shelf_id: str | None = None) -> Dict[str, Any]:
    # For now, store photo metadata in the photos table
    # Actual file upload to Supabase Storage can be added later
    from uuid import uuid4
    photo_id = str(uuid4())
    payload = {
      "id": photo_id,
      "profile_id": str(profile_id),
      "shelf_id": shelf_id,
      "original_url": f"local://{photo_id}",
      "annotated_url": None,
      "metadata": {},
    }
    result = self._client.table("photos").insert(payload).execute()
    return result.data[0] if result.data else payload

  # -- Meal Logs ---------------------------------------------------------------
  def list_meal_logs(self, profile_id: UUID, limit: int = 30) -> List[Dict[str, Any]]:
    data = (
      self._client.table("meal_logs")
      .select("*")
      .eq("profile_id", str(profile_id))
      .order("eaten_at", desc=True)
      .limit(limit)
      .execute()
      .data
    )
    return data or []

  def insert_meal_log(self, profile_id: UUID, log: Dict[str, Any]) -> Dict[str, Any]:
    payload = {**log, "profile_id": str(profile_id)}
    # Default eaten_at to now if not provided
    if not payload.get("eaten_at"):
      from datetime import datetime, timezone
      payload["eaten_at"] = datetime.now(tz=timezone.utc).isoformat()
    # Remove camelCase keys
    payload.pop("createdAt", None)
    result = self._client.table("meal_logs").insert(payload).execute()
    return result.data[0] if result.data else payload

  # -- Shopping Items ----------------------------------------------------------
  def list_shopping_items(self, profile_id: UUID) -> List[Dict[str, Any]]:
    data = (
      self._client.table("shopping_items")
      .select("*")
      .eq("profile_id", str(profile_id))
      .order("created_at", desc=True)
      .execute()
      .data
    )
    return data or []

  def insert_shopping_item(self, profile_id: UUID, item: Dict[str, Any]) -> Dict[str, Any]:
    payload = {**item, "profile_id": str(profile_id)}
    payload.pop("createdAt", None)
    result = self._client.table("shopping_items").insert(payload).execute()
    return result.data[0] if result.data else payload

  def update_shopping_item(self, profile_id: UUID, item_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
    payload = {k: v for k, v in changes.items() if v is not None}
    result = (
      self._client.table("shopping_items")
      .update(payload)
      .eq("profile_id", str(profile_id))
      .eq("id", item_id)
      .execute()
    )
    if not result.data:
      raise RuntimeError("Shopping item not found")
    return result.data[0]

  def delete_shopping_item(self, profile_id: UUID, item_id: str) -> bool:
    data = (
      self._client.table("shopping_items")
      .delete()
      .eq("profile_id", str(profile_id))
      .eq("id", item_id)
      .execute()
      .data
    )
    return bool(data)

  # -- Recipes -----------------------------------------------------------------
  def list_recipes(self, profile_id: UUID) -> List[Dict[str, Any]]:
    data = (
      self._client.table("recipes")
      .select("*")
      .eq("profile_id", str(profile_id))
      .order("created_at", desc=True)
      .execute()
      .data
    )
    return data or []

  def insert_recipe(self, profile_id: UUID, recipe: Dict[str, Any]) -> Dict[str, Any]:
    payload = {**recipe, "profile_id": str(profile_id)}
    payload.pop("createdAt", None)
    payload.pop("updatedAt", None)
    result = self._client.table("recipes").insert(payload).execute()
    return result.data[0] if result.data else payload

  def insert_recipe_usage(self, profile_id: UUID, usage: Dict[str, Any]) -> Dict[str, Any]:
    payload = {**usage, "profile_id": str(profile_id)}
    result = self._client.table("recipe_usages").insert(payload).execute()
    return result.data[0] if result.data else payload

  # -- Shelf Life Refs ---------------------------------------------------------
  def lookup_shelf_life(self, name: str) -> Optional[Dict[str, Any]]:
    data = (
      self._client.table("shelf_life_refs")
      .select("*")
      .eq("name", name)
      .maybe_single()
      .execute()
      .data
    )
    return data
