# Smart Fridge Redesign - Architecture Design

**Date:** 2026-04-08
**Status:** Approved

## Background

"我的冰箱" 是一个 AI 驱动的智能冰箱管理应用。核心场景：用户每天拍冰箱照片 → AI 识别食材 → 管理库存 → 推荐菜谱 → 告诉用户缺什么 → 去买菜。

当前状态：前端 React + Vite 完整可用（纯 localStorage），后端 FastAPI 是空壳（大部分 501），数据库 Supabase schema 已定义但未对接。

## Design Decisions

### 1. Frontend: Migrate to Taro (React)

**Why:** 目标是先微信小程序后 App。当前 React + Vite 无法编译为小程序。Taro 使用 React 语法，可编译为小程序 + H5 + React Native，一套代码多端运行。

**Migration scope:**
- Reuse: Zustand store logic, type definitions, API contracts, prompt templates, business logic
- Rewrite: All UI components (DOM → Taro components), styles (Tailwind → Taro styling), routing (React Router → Taro routing), camera access (<input> → wx.chooseMedia)

### 2. Architecture: Server-first

**Why:** 小程序环境下客户端不能直连第三方 AI API。推向市场需要多用户数据隔离。所有数据和 AI 调用必须走后端。

**Change:** 从 "前端 localStorage + 直连 AI" 变为 "前端只做 UI → 后端处理数据 + AI → Supabase 存储"。

### 3. AI Model: GLM-5V-Turbo (Zhipu AI)

**Why:** 用户有 API key，支持图片识别，成本可控。

**Change:** 替换当前豆包视觉 + DeepSeek 组合。视觉识别和菜谱推荐都用 GLM 系列。

### 4. Auth: Progressive (WeChat silent → optional phone binding)

**Why:** 降低用户首次使用门槛。小程序可直接拿 openid，想跨设备时再绑定手机号。

### 5. Image Storage: Supabase Storage

**Why:** 照片需要保存（用户想回顾历史）。Supabase Storage 与 Postgres 同生态，无需额外引入 OSS。

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│              Taro (React) 统一前端            │
│  微信小程序(主要) | H5 | React Native(后续)   │
│              共享业务逻辑层                     │
│  Zustand store / 类型定义 / API 合约 / 服务    │
└────────────────────┬─────────────────────────┘
                     │ HTTPS (JWT)
┌────────────────────┴─────────────────────────┐
│            FastAPI 后端 (Python)               │
│  用户认证 | 视觉识别(GLM-5V) | 菜谱推荐(GLM)  │
│           业务服务层 (库存/照片/菜谱/购物)      │
└─────────────────────────┬─────────────────────┘
                          │
┌─────────────────────────┼─────────────────────┐
│               Supabase                        │
│  Postgres (数据库) | Auth (认证) | Storage     │
└───────────────────────────────────────────────┘
```

## Database Changes

### Modified: profiles (was anon_profiles)

```sql
profiles:
  id          UUID PK
  wx_openid   TEXT UNIQUE          -- 微信 openid
  wx_unionid  TEXT NULLABLE        -- 微信 unionid
  phone       TEXT NULLABLE        -- 可选绑定手机号
  nickname    TEXT
  avatar_url  TEXT NULLABLE
  daily_ai_quota INT DEFAULT 10   -- 为付费留口子
  created_at  TIMESTAMPTZ
  updated_at  TIMESTAMPTZ
```

### New: meal_logs (饮食记录)

```sql
meal_logs:
  id          UUID PK
  profile_id  FK → profiles
  recipe_id   FK → recipes NULLABLE
  title       TEXT                 -- 吃了什么
  items_used  JSONB                -- 消耗了哪些食材
  photo_url   TEXT NULLABLE        -- 成品照片
  note        TEXT NULLABLE
  eaten_at    TIMESTAMPTZ          -- 吃饭时间
  created_at  TIMESTAMPTZ
```

### New: shopping_items (购物清单)

```sql
shopping_items:
  id          UUID PK
  profile_id  FK → profiles
  name        TEXT
  qty         NUMERIC
  unit        quantity_unit
  source      TEXT NULLABLE        -- 来源（如"菜谱推荐: 番茄炒蛋"）
  purchased   BOOLEAN DEFAULT FALSE
  created_at  TIMESTAMPTZ
```

### Unchanged: shelves, items, photos, condiments, recipes, recipe_usages

## API Endpoints

### Auth
- `POST /auth/wx-login` — 微信 code 换 openid，创建/查找用户
- `POST /auth/bind-phone` — 绑定手机号

### Fridge
- `GET /fridge/shelves` — 获取层架列表
- `POST /fridge/shelves` — 创建/更新层架

### Items
- `GET /items` — 获取库存（可按 shelf 过滤）
- `POST /items` — 手动添加物品
- `POST /items/batch` — 批量添加（AI 识别后确认）
- `PATCH /items/:id` — 更新数量/过期日
- `DELETE /items/:id` — 删除物品

### Photos & Vision
- `POST /photos/upload` — 上传照片到 Storage
- `POST /vision/recognize` — AI 识别照片中的食材

### Condiments
- `GET /condiments` — 获取调料列表
- `POST /condiments` — 添加/更新调料

### Recipes
- `POST /recipes/suggest` — 根据库存推荐菜谱
- `POST /recipes/consume` — 做菜后扣减食材

### Meal Logs
- `GET /meals` — 获取历史饮食记录
- `POST /meals` — 记录一餐

### Shopping
- `GET /shopping` — 获取购物清单
- `POST /shopping` — 添加购物项
- `PATCH /shopping/:id` — 标记已买
- `DELETE /shopping/:id` — 删除购物项

## Core Data Flows

### Flow 1: Photo → Inventory

用户拍照 → 上传 Supabase Storage → 后端调 GLM-5V-Turbo → 返回候选食材 → 用户确认 → 写入 items 表

### Flow 2: Inventory → Recipe

用户点"今天吃什么" → 后端查所有 items + condiments → 构建 prompt → 调 GLM → 返回菜谱(含缺什么) → 用户选"做这道菜" → 扣减食材 + 记录 meal_logs

### Flow 3: Recipe → Shopping List

菜谱推荐中的"缺什么" → 一键加入购物清单 → 去超市勾选已买 → 提醒加入库存

## Taro Frontend Structure

```
src/
├── app.ts / app.config.ts
├── pages/
│   ├── index/          -- 首页（冰箱总览 + 快捷拍照）
│   ├── inventory/      -- 库存详情
│   ├── camera/         -- 拍照 → 识别 → 确认
│   ├── recipes/        -- 菜谱推荐
│   ├── condiments/     -- 调料管理
│   ├── shopping/       -- 购物清单
│   ├── meals/          -- 饮食记录
│   └── settings/       -- 设置
├── components/
├── stores/
├── services/
├── types/
└── utils/
```

## Monetization Hooks

架构上为付费功能预留扩展点：
- `daily_ai_quota` 字段：控制每日 AI 调用次数
- 后端中间件：统一检查额度，超额返回升级提示
- 菜谱推荐：基础版免费，个性化/营养分析可作为付费功能

## Out of Scope (MVP 后再做)

- 3D 冰箱可视化
- 分享海报生成
- 多人共享冰箱
- 营养分析
- Capacitor / React Native App 打包
