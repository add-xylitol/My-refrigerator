# Smart Fridge Server (FastAPI)

该目录承载 MVP 版本的 BFF，负责：

- 匿名登录与设备指纹绑定；
- 冰箱层位 / 库存 / 调味品 / 菜谱 API；
- 照片上传与 OpenAI 兼容的 Vision 识别代理（默认 Doubao 模型）；
- 规则菜谱推荐、扣减以及同步日志；
- 向 Supabase（Postgres + Storage）读写数据。

## 本地开发

1. 确保已在仓库根目录执行 `npm install`（保持 workspace 依赖一致性）。
2. 安装 Python 依赖：
   ```bash
   cd apps/server
   uv pip install -r <(uv pip compile pyproject.toml)
   # 或使用你偏好的工具（pip/poetry/pdm），均基于 pyproject.toml。
   ```
3. 创建 `.env`（可参考 `.env.example`）并填入：
 ```
 SUPABASE_URL=
 SUPABASE_SERVICE_ROLE_KEY=
 OPENAI_API_KEY=
 OPENAI_API_BASE=https://api.qnaigc.com/v1
 OPENAI_VISION_MODEL=doubao-1.5-vision-pro
 OPENAI_CHAT_MODEL=deepseek-v3
  JWT_SECRET=
  ```
4. 启动开发服务器（确保 `PYTHONPATH=src` 使 FastAPI 能找到模块）：
   ```bash
   PYTHONPATH=src uvicorn server.main:app --reload
   ```
5. 访问 `http://localhost:8000/docs` 查看 OpenAPI。

## 目录结构

```
apps/server
├── pyproject.toml
├── README.md
├── .env.example
└── src/server
    ├── main.py             # FastAPI 入口
    ├── core/               # 配置、日志、依赖注入
    ├── routers/            # Auth / Fridge / Vision / Recipes 等路由
    ├── schemas/            # Pydantic 模型（请求/响应）
    └── services/           # Supabase、OpenAI、规则引擎适配层
```

> 当前仅提供骨架实现，后续会在 `routers` / `services` 中逐步补齐具体业务逻辑。
