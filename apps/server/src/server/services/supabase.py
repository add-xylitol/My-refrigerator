from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client, create_client

from server.core.config import Settings


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
      self._client.table("anon_profiles")
      .select("*")
      .eq("device_fingerprint", device_fingerprint)
      .maybe_single()
      .execute()
      .data
    )
    return data

  def insert_profile(self, device_fingerprint: str) -> Dict[str, Any]:
    payload = {"device_fingerprint": device_fingerprint}
    data = self._client.table("anon_profiles").insert(payload).single().execute().data
    return data

  def update_profile_token(self, profile_id: UUID, token: str, expires_at: datetime) -> Dict[str, Any]:
    payload = {"last_token": token, "token_expires_at": expires_at.isoformat()}
    data = (
      self._client.table("anon_profiles")
      .update(payload)
      .eq("id", str(profile_id))
      .maybe_single()
      .execute()
      .data
    )
    return data

  def find_profile_by_token(self, token: str) -> Optional[Dict[str, Any]]:
    data = (
      self._client.table("anon_profiles")
      .select("*")
      .eq("last_token", token)
      .maybe_single()
      .execute()
      .data
    )
    return data

  # -- Shelves -----------------------------------------------------------------
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
      # remove camelCase keys if any slipped in
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
    return data or []

  def insert_items(self, profile_id: UUID, shelf_id: str, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    records: List[Dict[str, Any]] = []
    for item in items:
      record = {
        "profile_id": str(profile_id),
        "shelf_id": shelf_id,
        "name": item["name"],
        "unit": item.get("unit"),
        "qty": item.get("qty", 1),
        "exp_date": item.get("exp_date"),
        "barcode": item.get("barcode"),
        "photo_id": item.get("photo_id"),
        "note": item.get("note"),
      }
      records.append(record)

    data = self._client.table("items").insert(records).execute().data
    return data or []

  def update_item(self, profile_id: UUID, item_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
    payload = {key: value for key, value in changes.items() if value is not None}
    data = (
      self._client.table("items")
      .update(payload)
      .eq("profile_id", str(profile_id))
      .eq("id", item_id)
      .maybe_single()
      .execute()
      .data
    )
    if not data:
      raise RuntimeError("Item not found or no changes applied.")
    return data

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
