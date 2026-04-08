# Smart Fridge Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将"我的冰箱"从 React+localStorage 单机版改造为 Taro+FastAPI+Supabase 的服务端优先架构，先出微信小程序 MVP。

**Architecture:** Taro (React) 统一前端编译为小程序/H5/App，FastAPI 后端处理所有数据和 AI 调用，Supabase 提供数据库+认证+图片存储。服务端优先，前端只做 UI。

**Tech Stack:** Taro 4 + React 18 + TypeScript / FastAPI + Pydantic v2 / Supabase (Postgres + Auth + Storage) / GLM-5V-Turbo (智谱AI)

**UX Reference:** `docs/plans/2026-04-08-miniprogram-ux-design.md` — 页面布局、交互规范、视觉风格以此文档为准。

---

## Phase 1: 数据库 + 后端（先让后端能真正工作）

### Task 1: 数据库迁移 — 新增表 + 升级 profiles

**Files:**
- Create: `infra/supabase/migrations/0002_profiles_upgrade_and_new_tables.sql`

**Step 1: 写迁移 SQL**

```sql
-- 0002_profiles_upgrade_and_new_tables.sql

-- 1. 升级 anon_profiles → profiles
ALTER TABLE public.anon_profiles RENAME TO profiles;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wx_openid TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wx_unionid TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_ai_quota INT NOT NULL DEFAULT 10;
-- device_fingerprint 改为可选（微信用户没有）
ALTER TABLE public.profiles ALTER COLUMN device_fingerprint DROP NOT NULL;
-- 更新所有外键引用（shelves, items, photos, condiments, recipes, recipe_usages, sync_logs）
-- Supabase 的 FK 引用表名，需要逐个更新
ALTER TABLE public.shelves DROP CONSTRAINT shelves_profile_id_fkey,
  ADD CONSTRAINT shelves_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.photos DROP CONSTRAINT photos_profile_id_fkey,
  ADD CONSTRAINT photos_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.items DROP CONSTRAINT items_profile_id_fkey,
  ADD CONSTRAINT items_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.condiments DROP CONSTRAINT condiments_profile_id_fkey,
  ADD CONSTRAINT condiments_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.recipes DROP CONSTRAINT recipes_profile_id_fkey,
  ADD CONSTRAINT recipes_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.recipe_usages DROP CONSTRAINT recipe_usages_profile_id_fkey,
  ADD CONSTRAINT recipe_usages_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.sync_logs DROP CONSTRAINT sync_logs_profile_id_fkey,
  ADD CONSTRAINT sync_logs_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. 新增 meal_logs 表
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  items_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  photo_url TEXT,
  note TEXT,
  eaten_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS meal_logs_profile_idx ON public.meal_logs(profile_id, eaten_at DESC);

-- 3. 新增 shopping_items 表
CREATE TABLE IF NOT EXISTS public.shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qty NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit public.quantity_unit NOT NULL DEFAULT '个',
  source TEXT,
  purchased BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS shopping_items_profile_idx ON public.shopping_items(profile_id, purchased, created_at DESC);

-- 4. 新增 shelf_life_refs 食材保质期参考表
CREATE TABLE IF NOT EXISTS public.shelf_life_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  chill_days INT,
  freeze_days INT,
  produce_days INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
CREATE UNIQUE INDEX IF NOT EXISTS shelf_life_refs_name_idx ON public.shelf_life_refs(name);

-- 5. 插入常见食材保质期初始数据
INSERT INTO public.shelf_life_refs (name, category, chill_days, freeze_days, produce_days) VALUES
  ('鸡蛋', '蛋类', 30, NULL, NULL),
  ('牛奶', '乳制品', 7, NULL, NULL),
  ('鸡胸肉', '肉类', 2, 180, NULL),
  ('猪肉', '肉类', 2, 180, NULL),
  ('牛肉', '肉类', 3, 180, NULL),
  ('鱼', '海鲜', 1, 90, NULL),
  ('虾', '海鲜', 2, 120, NULL),
  ('西红柿', '蔬菜', 7, NULL, 10),
  ('上海青', '蔬菜', 3, NULL, 5),
  ('黄瓜', '蔬菜', 5, NULL, 7),
  ('胡萝卜', '蔬菜', 14, NULL, 21),
  ('土豆', '蔬菜', 30, NULL, 30),
  ('豆腐', '豆制品', 5, NULL, NULL),
  ('草莓', '水果', 3, NULL, 5),
  ('苹果', '水果', 30, NULL, 30),
  ('香蕉', '水果', 5, NULL, 7),
  ('酸奶', '乳制品', 14, NULL, NULL),
  ('火腿', '加工肉', 7, 60, NULL),
  ('白菜', '蔬菜', 7, NULL, 10),
  ('蘑菇', '蔬菜', 3, NULL, 5)
ON CONFLICT (name) DO NOTHING;
```

**Step 2: 在 Supabase Dashboard 的 SQL Editor 中执行此迁移**

（手动执行，因为本地没有 supabase CLI 连接）

**Step 3: Commit**

```bash
git add infra/supabase/migrations/0002_profiles_upgrade_and_new_tables.sql
git commit -m "feat(db): upgrade profiles, add meal_logs and shopping_items tables"
```

---

### Task 2: 后端配置更新 — 支持 GLM-5V-Turbo + 微信登录

**Files:**
- Modify: `apps/server/src/server/core/config.py`
- Modify: `apps/server/.env.example`

**Step 1: 更新 config.py**

在 `apps/server/src/server/core/config.py` 的 Settings 类中：

```python
# 替换 openai_vision_model 和 openai_chat_model 的默认值
openai_vision_model: str = Field(
    default="glm-5v-turbo", validation_alias="OPENAI_VISION_MODEL"
)
openai_chat_model: str = Field(default="glm-5v-turbo", validation_alias="OPENAI_CHAT_MODEL")

# 新增微信小程序配置
wx_appid: str | None = Field(default=None, validation_alias="WX_APPID")
wx_secret: str | None = Field(default=None, validation_alias="WX_SECRET")
```

**Step 2: 更新 .env.example**

在 `apps/server/.env.example` 末尾追加：

```
WX_APPID=your-wechat-appid
WX_SECRET=your-wechat-secret
```

同时更新默认模型值：

```
OPENAI_VISION_MODEL=glm-5v-turbo
OPENAI_CHAT_MODEL=glm-5v-turbo
```

**Step 3: Commit**

```bash
git add apps/server/src/server/core/config.py apps/server/.env.example
git commit -m "feat(config): add GLM-5V-Turbo and WeChat mini-program settings"
```

---

### Task 3: 后端 Auth — 微信登录接口

**Files:**
- Modify: `apps/server/src/server/schemas/auth.py`
- Modify: `apps/server/src/server/services/auth.py`
- Modify: `apps/server/src/server/services/supabase.py`
- Modify: `apps/server/src/server/routers/auth.py`

**Step 1: 更新 auth schemas**

在 `apps/server/src/server/schemas/auth.py` 追加：

```python
class WxLoginRequest(ApiSchema):
    code: str = Field(min_length=1, max_length=128, description="微信登录 code")


class WxLoginResponse(ApiSchema):
    profile_id: str
    access_token: str
    expires_at: datetime
    is_new_user: bool = False
```

**Step 2: 在 supabase.py 的 SupabaseGateway 中追加微信相关方法**

```python
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

def insert_wx_profile(self, openid: str, unionid: str | None = None, nickname: str = "微信用户") -> Dict[str, Any]:
    payload = {"wx_openid": openid, "nickname": nickname}
    if unionid:
        payload["wx_unionid"] = unionid
    data = self._client.table("profiles").insert(payload).single().execute().data
    return data
```

同时将所有现有方法中的 `"anon_profiles"` 改为 `"profiles"`。

**Step 3: 在 auth.py 的 AuthService 中追加微信登录方法**

```python
import httpx

async def wx_login(self, code: str) -> "WxLoginResponse":
    """微信小程序 code 换 openid，创建/查找用户。"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.weixin.qq.com/sns/jscode2session",
            params={
                "appid": self._settings.wx_appid,
                "secret": self._settings.wx_secret,
                "js_code": code,
                "grant_type": "authorization_code",
            },
        )
    resp.raise_for_status()
    wx_data = resp.json()
    openid = wx_data.get("openid")
    if not openid:
        raise HTTPException(status_code=400, detail=f"微信登录失败: {wx_data.get('errmsg', 'unknown')}")

    is_new = False
    profile = self._supabase.find_profile_by_wx_openid(openid)
    if profile is None:
        profile = self._supabase.insert_wx_profile(openid, wx_data.get("unionid"))
        is_new = True

    # 签发 token（复用现有逻辑）
    from server.schemas.auth import WxLoginResponse
    expires_at = datetime.now(tz=timezone.utc) + timedelta(minutes=self._settings.jwt_expires_minutes)
    token = secrets.token_urlsafe(32)
    profile_id = UUID(profile["id"])
    self._supabase.update_profile_token(profile_id, token, expires_at)

    return WxLoginResponse(
        profile_id=str(profile_id),
        access_token=token,
        expires_at=expires_at,
        is_new_user=is_new,
    )
```

**Step 4: 在 routers/auth.py 追加微信登录路由**

```python
from server.schemas.auth import WxLoginRequest, WxLoginResponse

@router.post(
    "/wx-login",
    response_model=WxLoginResponse,
    status_code=status.HTTP_201_CREATED,
    summary="微信小程序登录",
)
async def wx_login(
    payload: WxLoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> WxLoginResponse:
    return await service.wx_login(payload.code)
```

**Step 5: Commit**

```bash
git add apps/server/src/server/
git commit -m "feat(auth): add WeChat mini-program login endpoint"
```

---

### Task 4: 后端 Fridge CRUD — 补全 shelves/items/condiments + DELETE 端点

**Files:**
- Modify: `apps/server/src/server/routers/fridge.py`
- Modify: `apps/server/src/server/services/supabase.py`

**Step 1: 给 fridge 路由加上认证 + 调用 SupabaseGateway**

将 `apps/server/src/server/routers/fridge.py` 中的每个路由函数加入 `profile: AuthContext = Depends(get_current_profile)` 参数，并调用 `gateway` 的对应方法（已存在）。

关键变更：
- `list_shelves` → 调用 `gateway.list_shelves(profile.profile_id)`，将结果映射为 `ShelfResponse`
- `save_shelves` → 调用 `gateway.upsert_shelves(profile.profile_id, [s.model_dump() for s in payload])`
- **新增** `DELETE /fridge/shelves/{shelf_id}` — 删除层架
- `list_items` → 调用 `gateway.list_items(profile.profile_id, shelf_id)`
- `confirm_items` → 改路由为 `POST /items/batch`，调用 `gateway.insert_items`
- `update_item` → 调用 `gateway.update_item`
- 新增 `POST /items` 单条手动添加
- 新增 `DELETE /items/{item_id}`
- `list_condiments` → 调用 `gateway.list_condiments`
- `upsert_condiments` → 调用 `gateway.upsert_condiments`
- **新增** `DELETE /condiments/{condiment_id}` — 删除调料

**Step 2: 在 supabase.py 追加 delete 方法**

```python
def delete_item(self, profile_id: UUID, item_id: str) -> bool:
    result = (
        self._client.table("items")
        .delete()
        .eq("profile_id", str(profile_id))
        .eq("id", item_id)
        .execute()
    )
    return bool(result.data)

def delete_shelf(self, profile_id: UUID, shelf_id: str) -> bool:
    result = (
        self._client.table("shelves")
        .delete()
        .eq("profile_id", str(profile_id))
        .eq("id", shelf_id)
        .execute()
    )
    return bool(result.data)

def delete_condiment(self, profile_id: UUID, condiment_id: str) -> bool:
    result = (
        self._client.table("condiments")
        .delete()
        .eq("profile_id", str(profile_id))
        .eq("id", condiment_id)
        .execute()
    )
    return bool(result.data)
```

**Step 3: Commit**

```bash
git add apps/server/src/server/routers/fridge.py apps/server/src/server/services/supabase.py
git commit -m "feat(fridge): wire up shelves/items/condiments CRUD with auth"
```

---

### Task 5: 后端 Photos — 上传到 Supabase Storage

**Files:**
- Create: `apps/server/src/server/routers/photos.py`
- Create: `apps/server/src/server/schemas/photos.py`
- Modify: `apps/server/src/server/routers/__init__.py`

**Step 1: 写 photos schema**

`apps/server/src/server/schemas/photos.py`:

```python
from datetime import datetime
from typing import Optional
from server.schemas.base import ApiSchema


class PhotoUploadResponse(ApiSchema):
    id: str
    url: str
    created_at: datetime
```

**Step 2: 写 photos router**

`apps/server/src/server/routers/photos.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from loguru import logger
from supabase import Client

from server.core.dependencies import get_current_profile, get_supabase_gateway
from server.schemas.auth import AuthContext
from server.schemas.photos import PhotoUploadResponse
from server.services.supabase import SupabaseGateway

router = APIRouter(prefix="/photos", tags=["photos"])


@router.post("/upload", response_model=PhotoUploadResponse)
async def upload_photo(
    file: UploadFile = File(...),
    shelf_id: str | None = None,
    profile: AuthContext = Depends(get_current_profile),
    gateway: SupabaseGateway = Depends(get_supabase_gateway),
) -> PhotoUploadResponse:
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=413, detail="图片不能超过 10MB")

    photo_record = gateway.upload_photo(profile.profile_id, content, file.content_type or "image/jpeg", shelf_id)
    return PhotoUploadResponse(
        id=photo_record["id"],
        url=photo_record["original_url"],
        created_at=photo_record["created_at"],
    )
```

**Step 3: 在 supabase.py 追加 upload_photo 方法**

```python
from uuid import uuid4

def upload_photo(self, profile_id: UUID, content: bytes, content_type: str, shelf_id: str | None = None) -> Dict[str, Any]:
    path = f"{profile_id}/{uuid4()}.jpg"
    self._client.storage.from_("fridge-photos").upload(path, content, {"content-type": content_type})
    public_url = self._client.storage.from_("fridge-photos").get_public_url(path)
    record = {
        "profile_id": str(profile_id),
        "original_url": public_url,
        "shelf_id": shelf_id,
    }
    data = self._client.table("photos").insert(record).single().execute().data
    return data
```

**Step 4: 注册路由**

在 `apps/server/src/server/routers/__init__.py` 中追加 `photos` 路由。

**Step 5: Commit**

```bash
git add apps/server/src/server/
git commit -m "feat(photos): add photo upload to Supabase Storage"
```

---

### Task 6: 后端 Vision — 适配 GLM-5V-Turbo + 支持图片 URL 输入

**Files:**
- Modify: `apps/server/src/server/routers/vision.py`
- Modify: `apps/server/src/server/schemas/vision.py`

**Step 1: 更新 VisionRecognizeRequest 支持图片 URL**

在 `apps/server/src/server/schemas/vision.py` 中：

```python
class VisionRecognizeRequest(ApiSchema):
    photo_id: str | None = None  # 已上传的照片 ID
    image_base64: str | None = None  # base64（兼容旧模式）
    image_url: str | None = None  # 图片 URL（Storage 公开链接）
    shelf_id: str
```

**Step 2: 更新 vision router 中的 prompt 和图片传递方式**

在 `apps/server/src/server/routers/vision.py` 的 `recognize` 函数中：
- 修改 note 默认文案提到 GLM-5V-Turbo
- 图片传递优先用 `image_url`（GLM 原生支持 URL），fallback 到 base64

```python
# 构造图片内容部分
image_parts = []
if payload.image_url:
    image_parts.append({"type": "image_url", "image_url": {"url": payload.image_url}})
elif payload.image_base64:
    image_parts.append({"type": "image_url", "image_url": {"url": payload.image_base64}})
```

**Step 3: Commit**

```bash
git add apps/server/src/server/routers/vision.py apps/server/src/server/schemas/vision.py
git commit -m "feat(vision): adapt for GLM-5V-Turbo with URL-based image input"
```

---

### Task 7: 后端 Shelf Life — 食材保质期参考接口

**Files:**
- Create: `apps/server/src/server/routers/shelf_life.py`
- Modify: `apps/server/src/server/routers/__init__.py`
- Modify: `apps/server/src/server/services/supabase.py`

**Step 1: 在 supabase.py 追加查询方法**

```python
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
```

**Step 2: 写 shelf_life router**

```python
from fastapi import APIRouter, Query
from server.core.dependencies import get_supabase_gateway
from server.services.supabase import SupabaseGateway

router = APIRouter(prefix="/shelf-life", tags=["shelf-life"])


@router.get("/")
async def get_shelf_life(
    name: str = Query(..., description="食材名称"),
    gateway: SupabaseGateway = Depends(get_supabase_gateway),
):
    ref = gateway.lookup_shelf_life(name)
    if not ref:
        return {"name": name, "chill_days": None, "freeze_days": None, "produce_days": None}
    return ref
```

**Step 3: 注册路由到 `__init__.py`**

**Step 4: Commit**

```bash
git add apps/server/src/server/
git commit -m "feat(shelf-life): add shelf life reference lookup endpoint"
```

---

### Task 8: 后端 Recipes — AI 驱动的菜谱推荐 + 扣减

**Files:**
- Modify: `apps/server/src/server/routers/recipes.py`
- Modify: `apps/server/src/server/services/recipes.py`
- Modify: `apps/server/src/server/schemas/recipes.py`

**Step 1: 更新 RecipeSuggestRequest**

```python
class RecipeSuggestRequest(ApiSchema):
    max_results: int = 5
    prompt: Optional[str] = None  # 用户自定义需求（如"减肥餐"）
    profile_id: Optional[str] = None  # 从认证中获取，此字段仅内部传递
```

**Step 2: 重写 RecipeService.suggest**

改为从 Supabase 获取用户库存，构建 prompt，调用 GLM 模型生成菜谱推荐。

```python
class RecipeService:
    def __init__(self, gateway: SupabaseGateway | None = None, openai_client: OpenAIClient | None = None):
        self._gateway = gateway
        self._client = openai_client

    async def suggest(self, profile_id: str, max_results: int = 5, user_prompt: str | None = None) -> list[RecipeSuggestion]:
        # 1. 获取库存
        items = self._gateway.list_items(profile_id)
        condiments = self._gateway.list_condiments(profile_id)

        # 2. 构建 prompt
        inventory_desc = self._build_inventory_description(items, condiments)
        system_prompt = "你是一个专业的家庭厨师助手..."
        user_msg = f"用户冰箱里有：\n{inventory_desc}\n请推荐{max_results}道菜..."

        # 3. 调用 GLM
        response = await self._client.chat(messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_msg},
        ], response_format="json_object")

        # 4. 解析结果为 RecipeSuggestion 列表
        ...

    async def consume(self, profile_id: str, recipe_id: str, items_used: list) -> dict:
        # 扣减库存 + 记录 meal_log
        ...
```

**Step 3: 更新 recipes router 加入认证和完整参数**

**Step 4: Commit**

```bash
git add apps/server/src/server/routers/recipes.py apps/server/src/server/services/recipes.py apps/server/src/server/schemas/recipes.py
git commit -m "feat(recipes): AI-powered recipe suggestions with GLM and inventory deduction"
```

---

### Task 9: 后端 Meals + Shopping — 新增两个模块

**Files:**
- Create: `apps/server/src/server/routers/meals.py`
- Create: `apps/server/src/server/schemas/meals.py`
- Create: `apps/server/src/server/routers/shopping.py`
- Create: `apps/server/src/server/schemas/shopping.py`
- Modify: `apps/server/src/server/routers/__init__.py`
- Modify: `apps/server/src/server/services/supabase.py`

**Step 1: 写 schemas**

`meals.py`:

```python
from datetime import datetime
from typing import Optional, List
from server.schemas.base import ApiSchema


class MealLogCreate(ApiSchema):
    title: str
    recipe_id: Optional[str] = None
    items_used: list = []
    photo_url: Optional[str] = None
    note: Optional[str] = None
    eaten_at: Optional[datetime] = None


class MealLogResponse(MealLogCreate):
    id: str
    profile_id: str
    created_at: datetime
```

`shopping.py`:

```python
from datetime import datetime
from typing import Optional
from server.schemas.base import ApiSchema
from server.schemas.fridge import QuantityUnit


class ShoppingItemCreate(ApiSchema):
    name: str
    qty: float = 1
    unit: QuantityUnit = "个"
    source: Optional[str] = None


class ShoppingItemUpdate(ApiSchema):
    purchased: Optional[bool] = None
    name: Optional[str] = None
    qty: Optional[float] = None


class ShoppingItemResponse(ShoppingItemCreate):
    id: str
    purchased: bool
    created_at: datetime
```

**Step 2: 在 supabase.py 追加 CRUD 方法**

```python
# Meal logs
def list_meal_logs(self, profile_id: UUID, limit: int = 30) -> List[Dict[str, Any]]:
    data = self._client.table("meal_logs").select("*").eq("profile_id", str(profile_id)).order("eaten_at", desc=True).limit(limit).execute().data
    return data or []

def insert_meal_log(self, profile_id: UUID, log: Dict[str, Any]) -> Dict[str, Any]:
    record = {**log, "profile_id": str(profile_id)}
    return self._client.table("meal_logs").insert(record).single().execute().data

# Shopping items
def list_shopping_items(self, profile_id: UUID) -> List[Dict[str, Any]]:
    data = self._client.table("shopping_items").select("*").eq("profile_id", str(profile_id)).order("created_at", desc=True).execute().data
    return data or []

def insert_shopping_item(self, profile_id: UUID, item: Dict[str, Any]) -> Dict[str, Any]:
    record = {**item, "profile_id": str(profile_id)}
    return self._client.table("shopping_items").insert(record).single().execute().data

def update_shopping_item(self, profile_id: UUID, item_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
    data = self._client.table("shopping_items").update(changes).eq("profile_id", str(profile_id)).eq("id", item_id).maybe_single().execute().data
    if not data:
        raise RuntimeError("Shopping item not found")
    return data

def delete_shopping_item(self, profile_id: UUID, item_id: str) -> bool:
    result = self._client.table("shopping_items").delete().eq("profile_id", str(profile_id)).eq("id", item_id).execute()
    return bool(result.data)
```

**Step 3: 写 router 文件（标准 CRUD 模式，加 AuthContext 认证）**

**Step 4: 注册路由到 __init__.py**

**Step 5: Commit**

```bash
git add apps/server/src/server/
git commit -m "feat: add meal_logs and shopping_items API modules"
```

---

## Phase 2: Taro 前端骨架搭建

### Task 10: 初始化 Taro 项目

**Step 1: 全局安装 Taro CLI**

```bash
npm install -g @tarojs/cli
```

**Step 2: 在项目根目录创建 Taro 项目**

```bash
cd apps
taro init client-taro
# 选择: React + TypeScript + CSS
```

**Step 3: 配置项目**

- 配置 `app.config.ts` 路由
- 安装依赖: `zustand`, `@tarojs/taro`
- 配置 Supabase client

**Step 4: Commit**

```bash
git add apps/client-taro/
git commit -m "feat: initialize Taro project for mini-program"
```

---

### Task 11: 迁移共享类型和 API 客户端

**Files:**
- Copy from: `packages/shared/src/` → `apps/client-taro/src/shared/`
- Create: `apps/client-taro/src/services/api.ts`

**Step 1: 复制 shared 包的类型定义到 Taro 项目**

从 `packages/shared/src/types/` 复制 `fridge.ts`, `vision.ts` 等。
从 `packages/shared/src/constants/` 复制 `units.ts`。
从 `packages/shared/src/api/` 复制 `contracts.ts`。

**Step 2: 写 API 客户端**

```typescript
// apps/client-taro/src/services/api.ts
import Taro from '@tarojs/taro'

const BASE_URL = process.env.TARO_APP_API_URL || 'http://localhost:8000'

class ApiClient {
  private token: string = ''

  setToken(token: string) { this.token = token }

  private async request<T>(method: string, path: string, data?: any): Promise<T> {
    const res = await Taro.request({
      url: `${BASE_URL}${path}`,
      method: method as any,
      data,
      header: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    })
    if (res.statusCode >= 400) throw new Error(res.data?.detail || 'Request failed')
    return res.data as T
  }

  // Auth
  wxLogin(code: string) { return this.request('POST', '/auth/wx-login', { code }) }

  // Items
  getItems(shelfId?: string) {
    const params = shelfId ? `?shelf_id=${shelfId}` : ''
    return this.request('GET', `/items${params}`)
  }

  // ... 其余端点按 API 合约生成
}

export const api = new ApiClient()
```

**Step 3: Commit**

```bash
git add apps/client-taro/src/
git commit -m "feat(taro): migrate shared types and create API client"
```

---

### Task 12: 迁移 Zustand Store（改为 API 调用）

**Files:**
- Create: `apps/client-taro/src/stores/fridgeStore.ts`

**Step 1: 基于 apps/client/src/stores/fridgeStore.ts 重写**

核心变更：
- 去掉 localStorage 持久化
- 每个 action 调用 `api.xxx()` 然后更新状态
- 加载时从 API 拉取数据

```typescript
// 伪代码框架
import { create } from 'zustand'
import { api } from '../services/api'

interface FridgeState {
  shelves: ShelfDTO[]
  items: ItemDTO[]
  condiments: CondimentDTO[]
  loading: boolean

  fetchAll: () => Promise<void>
  addItem: (item: ItemPayload) => Promise<void>
  removeItem: (id: string) => Promise<void>
  updateItem: (id: string, changes: Partial<ItemPayload>) => Promise<void>
  // ...
}

export const useFridgeStore = create<FridgeState>((set, get) => ({
  shelves: [],
  items: [],
  condiments: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const [shelves, items, condiments] = await Promise.all([
      api.getShelves(),
      api.getItems(),
      api.getCondiments(),
    ])
    set({ shelves, items, condiments, loading: false })
  },

  addItem: async (item) => {
    const created = await api.createItem(item)
    set(state => ({ items: [...state.items, created] }))
  },
  // ...
}))
```

**Step 2: Commit**

```bash
git add apps/client-taro/src/stores/
git commit -m "feat(taro): migrate Zustand store to API-driven mode"
```

---

### Task 13: Taro 页面 — 按 UX 文档 4 Tab 12 页结构实现

**Files (参考 UX 文档 §2.2 页面地图):**

```
pages/
├── camera/
│   └── index              ← Tab 1: 拍照录入主页
│
├── fridge/
│   ├── index              ← Tab 2: 冰箱总览（层叠卡片 + 临期提醒）
│   ├── detail             ← 点击某层架 → 该层食材列表
│   └── add                ← 手动添加食材表单
│
├── discover/
│   ├── index              ← Tab 3: 菜谱推荐列表（含临期优先筛选）
│   ├── recipe             ← 菜谱详情 + 开始烹饪按钮
│   ├── shopping           ← 购物清单
│   └── meal-log           ← 饮食记录历史
│
├── profile/
│   ├── index              ← Tab 4: 个人中心
│   ├── condiments         ← 调料管理（CRUD）
│   └── shelves            ← 层架管理（增删改排序）
```

**Step 1: 配置 TabBar（`app.config.ts`）**

```typescript
tabBar: {
  list: [
    { pagePath: 'pages/camera/index', text: '拍照', iconPath: 'assets/tab-camera.png', selectedIconPath: 'assets/tab-camera-active.png' },
    { pagePath: 'pages/fridge/index', text: '冰箱', iconPath: 'assets/tab-fridge.png', selectedIconPath: 'assets/tab-fridge-active.png' },
    { pagePath: 'pages/discover/index', text: '发现', iconPath: 'assets/tab-discover.png', selectedIconPath: 'assets/tab-discover-active.png' },
    { pagePath: 'pages/profile/index', text: '我的', iconPath: 'assets/tab-profile.png', selectedIconPath: 'assets/tab-profile-active.png' },
  ]
}
```

**Step 2: 配置分包（主包 ≤ 2MB）**

```typescript
subPackages: [
  {
    root: 'pages/discover',
    pages: ['recipe', 'shopping', 'meal-log'],
  },
  {
    root: 'pages/profile',
    pages: ['condiments', 'shelves'],
  },
  {
    root: 'pages/fridge',
    pages: ['detail', 'add'],
  },
]
```

**Step 3: 实现 Tab 1 — 拍照页 (`pages/camera/index`)**

按 UX 文档 §3.1 实现：
- 上次录入摘要（可折叠）
- 照片预览区域 / 相机取景框
- 大按钮：拍照 / 从相册选择
- AI 识别结果区（拍照后出现）
- 每个候选显示：名称、数量、AI 预估保质期、层位选择器
- 一键全部入库 / 编辑修改
- 识别中：骨架屏动画 + "正在识别..."
- 识别失败：降级到"手动录入"按钮

拍照核心流程：
```typescript
import Taro from '@tarojs/taro'

const takePhoto = async () => {
  const res = await Taro.chooseMedia({
    count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'],
  })
  const tempFilePath = res.tempFiles[0].tempFilePath
  const uploadRes = await Taro.uploadFile({
    url: `${BASE_URL}/photos/upload`,
    filePath: tempFilePath,
    name: 'file',
    header: { Authorization: `Bearer ${token}` },
  })
  const photo = JSON.parse(uploadRes.data)
  const result = await api.recognize({ photo_id: photo.id, image_url: photo.url, shelf_id: currentShelfId })
  // 查保质期参考
  for (const candidate of result.candidates) {
    const shelfLife = await api.getShelfLife(candidate.name)
    candidate.suggestedDays = shelfLife.chillDays
  }
  // 展示候选列表
}
```

**Step 4: 实现 Tab 2 — 冰箱页 (`pages/fridge/index`)**

按 UX 文档 §3.2 实现：
- 状态摘要卡片（横向滚动）：库存数、临期数、缺料数
- 层叠冰箱可视化（CSS perspective + transform，MVP 简化版 2D 卡片 + 阴影）
- 临期食材提醒区（最多 3 条，附推荐菜谱快捷入口 → Flow 4 临期驱动推荐）
- 浮动 "+" 按钮（短按拍照、长按手动添加）
- 点击层架 → `fridge/detail`
- 空冰箱引导："拍一张照片开始吧"

**Step 5: 实现 Tab 3 — 发现页 (`pages/discover/index`)**

按 UX 文档 §3.3 实现：
- "今天吃什么？" 标题 + 库存食材数
- 筛选标签（横向滚动）：全部 / 临期优先 / 10分钟快手 / 低脂 / 暖汤 / 家常菜
- 菜谱卡片：菜名 + 时间 + "食材齐全" 或 "缺 N 样"
- 底部子导航：菜谱推荐 / 购物清单(N) / 饮食记录

**Step 6: 实现 Tab 4 — 我的页 (`pages/profile/index`)**

按 UX 文档 §3.4 实现：
- 头像 + 昵称 + 使用天数 + 管理食材数
- 入口列表：调料管理 / 层架管理 / 设置
- 重置数据按钮

**Step 7: 实现子页面**

- `fridge/detail` — 层架食材列表，按到期日排序，到期日颜色编码（红/橙/黄/绿），左滑操作（减一/用完/移动层架）
- `fridge/add` — 手动添加表单（名称、数量、单位、层位、到期日、保质期自动查询）
- `discover/recipe` — 菜谱详情 + 食材用量（标注库存有/无）+ 烹饪步骤 + 开始烹饪按钮
- `discover/shopping` — 购物清单（待买/已买分组），标记已买→提示加入库存
- `discover/meal-log` — 饮食记录时间线，按日期分组
- `profile/condiments` — 调料管理 CRUD，按类别分组，缺货→补货到购物清单
- `profile/shelves` — 层架管理（拖拽排序、增删改）

**Step 8: Commit**

```bash
git add apps/client-taro/src/
git commit -m "feat(taro): implement all 12 pages per UX design doc"
```

---

## Phase 3: 前后端联调

### Task 14: 微信登录流程打通

**Step 1: Taro 调用 wx.login() 拿 code → 发送到后端 /auth/wx-login → 存储 token**

```typescript
// apps/client-taro/src/services/auth.ts
import Taro from '@tarojs/taro'
import { api } from './api'

export async function login() {
  const { code } = await Taro.login()
  const res = await api.wxLogin(code)
  api.setToken(res.accessToken)
  await Taro.setStorageSync('token', res.accessToken)
  await Taro.setStorageSync('profileId', res.profileId)
  return res
}

export async function tryAutoLogin() {
  const token = Taro.getStorageSync('token')
  if (token) {
    api.setToken(token)
    return true
  }
  return false
}
```

**Step 2: 在 app.ts 入口处调用自动登录**

**Step 3: Commit**

```bash
git add apps/client-taro/src/
git commit -m "feat(taro): integrate WeChat login flow"
```

---

### Task 15: 完整流程 E2E 联调

**Step 1: 启动后端**

```bash
cd apps/server && source .venv/bin/activate && uvicorn server.main:app --reload
```

**Step 2: 用微信开发者工具打开 Taro 编译产物**

```bash
cd apps/client-taro && npm run dev:weapp
```

**Step 3: 测试完整流程**

- [ ] 微信登录成功
- [ ] 拍照 → 上传 → AI 识别 → 确认入库
- [ ] 手动添加食材（含保质期自动查询）
- [ ] 查看库存（分层、临期筛选、颜色编码）
- [ ] 临期提醒 → 菜谱推荐联动（Flow 4）
- [ ] 菜谱推荐（含"食材齐全"/"缺 N 样"标注）
- [ ] 做菜扣减 + 饮食记录
- [ ] 购物清单增删改 + 标记已买 → 加入库存
- [ ] 调料管理（CRUD + 缺货补货）

**Step 4: Commit**

```bash
git commit -m "feat: end-to-end integration complete"
```

---

## Phase 4: 收尾 + 上线准备

### Task 16: 交互规范落地 + 用户体验打磨

按 UX 文档 §4 交互规范实现：
- 全局错误拦截（网络断开、token 过期、AI 调用失败）
- Toast 规范（按 §4.2 的文案表实现）
- 骨架屏 / loading 态
- 下拉刷新（所有列表页）
- 空状态引导（每个列表为空时显示引导文案 + 行动按钮）
- 动画（层架卡片点击回弹、食材滑入滑出、AI 识别脉冲光圈）
- 图片压缩（减少上传体积）

### Task 17: 安全加固

- Supabase RLS (Row Level Security) 策略
- API 限流（防止滥用 AI 调用）
- 输入校验（防注入）

### Task 18: 小程序审核准备

- 隐私政策页
- 用户协议页
- 小程序信息配置（名称、图标、类目）

---

## 执行顺序建议

```
Phase 1 (后端): Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
                ↓
Phase 2 (前端): Task 10 → 11 → 12 → 13
                ↓
Phase 3 (联调): Task 14 → 15
                ↓
Phase 4 (收尾): Task 16 → 17 → 18
```

Phase 1 和 Phase 2 可以并行推进（后端和前端独立开发）。
