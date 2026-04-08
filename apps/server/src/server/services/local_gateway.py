"""In-memory mock gateway for local development without Supabase."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from server.schemas.fridge import ShelfType


class LocalGateway:
  """Drop-in replacement for SupabaseGateway using in-memory dicts."""

  def __init__(self) -> None:
    self._profiles: Dict[str, Dict[str, Any]] = {}
    self._shelves: Dict[str, Dict[str, Any]] = {}
    self._items: Dict[str, Dict[str, Any]] = {}
    self._condiments: Dict[str, Dict[str, Any]] = {}
    self._photos: Dict[str, Dict[str, Any]] = {}
    self._meal_logs: Dict[str, Dict[str, Any]] = {}
    self._shopping_items: Dict[str, Dict[str, Any]] = {}
    self._shelf_life_refs: Dict[str, Dict[str, Any]] = {}
    self._recipes: Dict[str, Dict[str, Any]] = {}
    self._recipe_usages: Dict[str, Dict[str, Any]] = {}
    self._init_shelf_life_data()

  # -- Shelf Life Refs -------------------------------------------------------
  def _init_shelf_life_data(self) -> None:
    refs = [
      ("鸡蛋", "蛋类", 30, None, None),
      ("牛奶", "乳制品", 7, None, None),
      ("鸡胸肉", "肉类", 2, 180, None),
      ("猪肉", "肉类", 2, 180, None),
      ("牛肉", "肉类", 3, 180, None),
      ("鱼", "海鲜", 1, 90, None),
      ("虾", "海鲜", 2, 120, None),
      ("西红柿", "蔬菜", 7, None, 10),
      ("上海青", "蔬菜", 3, None, 5),
      ("黄瓜", "蔬菜", 5, None, 7),
      ("胡萝卜", "蔬菜", 14, None, 21),
      ("土豆", "蔬菜", 30, None, 30),
      ("豆腐", "豆制品", 5, None, None),
      ("草莓", "水果", 3, None, 5),
      ("苹果", "水果", 30, None, 30),
      ("香蕉", "水果", 5, None, 7),
      ("酸奶", "乳制品", 14, None, None),
      ("火腿", "加工肉", 7, 60, None),
      ("白菜", "蔬菜", 7, None, 10),
      ("蘑菇", "蔬菜", 3, None, 5),
    ]
    for name, cat, chill, freeze, produce in refs:
      self._shelf_life_refs[name] = {
        "id": str(uuid4()), "name": name, "category": cat,
        "chill_days": chill, "freeze_days": freeze, "produce_days": produce,
        "created_at": datetime.now(tz=timezone.utc).isoformat(),
      }

  def lookup_shelf_life(self, name: str) -> Optional[Dict[str, Any]]:
    return self._shelf_life_refs.get(name)

  # -- Auth -------------------------------------------------------------------
  def find_profile_by_fingerprint(self, device_fingerprint: str) -> Optional[Dict[str, Any]]:
    for p in self._profiles.values():
      if p.get("device_fingerprint") == device_fingerprint:
        return p
    return None

  def find_profile_by_wx_openid(self, openid: str) -> Optional[Dict[str, Any]]:
    for p in self._profiles.values():
      if p.get("wx_openid") == openid:
        return p
    return None

  def find_profile_by_token(self, token: str) -> Optional[Dict[str, Any]]:
    for p in self._profiles.values():
      if p.get("last_token") == token:
        return p
    return None

  def insert_profile(self, device_fingerprint: str | None = None, *, wx_openid: str | None = None, nickname: str = "本地用户") -> Dict[str, Any]:
    pid = str(uuid4())
    now = datetime.now(tz=timezone.utc).isoformat()
    profile: Dict[str, Any] = {
      "id": pid, "nickname": nickname,
      "created_at": now, "updated_at": now,
      "daily_ai_quota": 20,
    }
    if device_fingerprint:
      profile["device_fingerprint"] = device_fingerprint
    if wx_openid:
      profile["wx_openid"] = wx_openid
    self._profiles[pid] = profile
    # Auto-create default shelves
    self._create_default_shelves(pid)
    return profile

  def insert_wx_profile(self, openid: str, unionid: str | None = None, nickname: str = "微信用户") -> Dict[str, Any]:
    return self.insert_profile(wx_openid=openid, nickname=nickname)

  def update_profile_token(self, profile_id: UUID, token: str, expires_at: datetime) -> Dict[str, Any]:
    pid = str(profile_id)
    if pid in self._profiles:
      self._profiles[pid]["last_token"] = token
      self._profiles[pid]["token_expires_at"] = expires_at.isoformat()
      return self._profiles[pid]
    raise RuntimeError("Profile not found")

  # -- Shelves ----------------------------------------------------------------
  def _create_default_shelves(self, profile_id: str) -> None:
    defaults = [
      ("冷藏层 1", 1, "chill"),
      ("冷藏层 2", 2, "chill"),
      ("冷藏层 3", 3, "chill"),
      ("冷冻层", 4, "freeze"),
      ("果蔬盒", 5, "produce"),
    ]
    now = datetime.now(tz=timezone.utc).isoformat()
    for name, sort, stype in defaults:
      sid = str(uuid4())
      self._shelves[sid] = {
        "id": sid, "profile_id": profile_id, "name": name,
        "sort": sort, "type": stype, "created_at": now, "updated_at": now,
      }

  def list_shelves(self, profile_id: UUID) -> List[Dict[str, Any]]:
    pid = str(profile_id)
    return sorted(
      [s for s in self._shelves.values() if s["profile_id"] == pid],
      key=lambda x: x["sort"],
    )

  def upsert_shelves(self, profile_id: UUID, shelves: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    pid = str(profile_id)
    now = datetime.now(tz=timezone.utc).isoformat()
    results = []
    for shelf in shelves:
      sid = shelf.get("id") or str(uuid4())
      record = {**shelf, "id": sid, "profile_id": pid, "updated_at": now}
      if "created_at" not in record:
        record["created_at"] = now
      self._shelves[sid] = record
      results.append(record)
    return results

  def delete_shelf(self, profile_id: UUID, shelf_id: str) -> bool:
    if shelf_id in self._shelves and self._shelves[shelf_id]["profile_id"] == str(profile_id):
      del self._shelves[shelf_id]
      return True
    return False

  # -- Items ------------------------------------------------------------------
  def list_items(self, profile_id: UUID, shelf_id: Optional[str] = None) -> List[Dict[str, Any]]:
    pid = str(profile_id)
    items = [i for i in self._items.values() if i["profile_id"] == pid]
    if shelf_id:
      items = [i for i in items if i["shelf_id"] == shelf_id]
    return sorted(items, key=lambda x: x.get("updated_at", ""), reverse=True)

  def insert_items(self, profile_id: UUID, shelf_id: str, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    pid = str(profile_id)
    now = datetime.now(tz=timezone.utc).isoformat()
    results = []
    for item in items:
      iid = str(uuid4())
      record = {
        "id": iid, "profile_id": pid, "shelf_id": shelf_id,
        "name": item.get("name", ""), "unit": item.get("unit", "个"),
        "qty": item.get("qty", 1), "exp_date": item.get("exp_date"),
        "barcode": item.get("barcode"), "photo_id": item.get("photo_id"),
        "note": item.get("note"), "created_at": now, "updated_at": now,
      }
      self._items[iid] = record
      results.append(record)
    return results

  def update_item(self, profile_id: UUID, item_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
    if item_id in self._items and self._items[item_id]["profile_id"] == str(profile_id):
      self._items[item_id].update({k: v for k, v in changes.items() if v is not None})
      self._items[item_id]["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
      return self._items[item_id]
    raise RuntimeError("Item not found")

  def delete_item(self, profile_id: UUID, item_id: str) -> bool:
    if item_id in self._items and self._items[item_id]["profile_id"] == str(profile_id):
      del self._items[item_id]
      return True
    return False

  # -- Condiments -------------------------------------------------------------
  def list_condiments(self, profile_id: UUID) -> List[Dict[str, Any]]:
    pid = str(profile_id)
    return [c for c in self._condiments.values() if c["profile_id"] == pid]

  def upsert_condiments(self, profile_id: UUID, condiments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    pid = str(profile_id)
    now = datetime.now(tz=timezone.utc).isoformat()
    results = []
    for cond in condiments:
      cid = cond.get("id") or str(uuid4())
      record = {**cond, "id": cid, "profile_id": pid, "updated_at": now}
      if "created_at" not in record:
        record["created_at"] = now
      self._condiments[cid] = record
      results.append(record)
    return results

  def delete_condiment(self, profile_id: UUID, condiment_id: str) -> bool:
    if condiment_id in self._condiments and self._condiments[condiment_id]["profile_id"] == str(profile_id):
      del self._condiments[condiment_id]
      return True
    return False

  # -- Photos -----------------------------------------------------------------
  def upload_photo(self, profile_id: UUID, content: bytes, content_type: str, shelf_id: str | None = None) -> Dict[str, Any]:
    pid = str(profile_id)
    now = datetime.now(tz=timezone.utc).isoformat()
    phid = str(uuid4())
    record = {
      "id": phid, "profile_id": pid, "shelf_id": shelf_id,
      "original_url": f"http://localhost:8000/static/photos/{phid}.jpg",
      "annotated_url": None, "taken_at": now, "note": None,
      "metadata": {}, "created_at": now, "updated_at": now,
    }
    self._photos[phid] = record
    return record

  # -- Meal Logs --------------------------------------------------------------
  def list_meal_logs(self, profile_id: UUID, limit: int = 30) -> List[Dict[str, Any]]:
    pid = str(profile_id)
    logs = [m for m in self._meal_logs.values() if m["profile_id"] == pid]
    return sorted(logs, key=lambda x: x.get("eaten_at", ""), reverse=True)[:limit]

  def insert_meal_log(self, profile_id: UUID, log: Dict[str, Any]) -> Dict[str, Any]:
    pid = str(profile_id)
    mlid = str(uuid4())
    now = datetime.now(tz=timezone.utc).isoformat()
    record = {**log, "id": mlid, "profile_id": pid, "created_at": now}
    if "eaten_at" not in record:
      record["eaten_at"] = now
    self._meal_logs[mlid] = record
    return record

  # -- Shopping Items ---------------------------------------------------------
  def list_shopping_items(self, profile_id: UUID) -> List[Dict[str, Any]]:
    pid = str(profile_id)
    return sorted(
      [s for s in self._shopping_items.values() if s["profile_id"] == pid],
      key=lambda x: x.get("created_at", ""), reverse=True,
    )

  def insert_shopping_item(self, profile_id: UUID, item: Dict[str, Any]) -> Dict[str, Any]:
    pid = str(profile_id)
    siid = str(uuid4())
    now = datetime.now(tz=timezone.utc).isoformat()
    record = {**item, "id": siid, "profile_id": pid, "purchased": item.get("purchased", False), "created_at": now}
    self._shopping_items[siid] = record
    return record

  def update_shopping_item(self, profile_id: UUID, item_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
    if item_id in self._shopping_items and self._shopping_items[item_id]["profile_id"] == str(profile_id):
      self._shopping_items[item_id].update(changes)
      return self._shopping_items[item_id]
    raise RuntimeError("Shopping item not found")

  def delete_shopping_item(self, profile_id: UUID, item_id: str) -> bool:
    if item_id in self._shopping_items and self._shopping_items[item_id]["profile_id"] == str(profile_id):
      del self._shopping_items[item_id]
      return True
    return False

  # -- Recipes ----------------------------------------------------------------
  def list_recipes(self, profile_id: UUID) -> List[Dict[str, Any]]:
    pid = str(profile_id)
    return [r for r in self._recipes.values() if r["profile_id"] == pid]

  def insert_recipe(self, profile_id: UUID, recipe: Dict[str, Any]) -> Dict[str, Any]:
    pid = str(profile_id)
    rid = str(uuid4())
    now = datetime.now(tz=timezone.utc).isoformat()
    record = {**recipe, "id": rid, "profile_id": pid, "created_at": now, "updated_at": now}
    self._recipes[rid] = record
    return record

  def insert_recipe_usage(self, profile_id: UUID, usage: Dict[str, Any]) -> Dict[str, Any]:
    pid = str(profile_id)
    uid = str(uuid4())
    now = datetime.now(tz=timezone.utc).isoformat()
    record = {**usage, "id": uid, "profile_id": pid, "created_at": now}
    self._recipe_usages[uid] = record
    return record
