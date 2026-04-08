# 我的冰箱（MVP）/ My-refrigerator

我的冰箱软件，可以对家庭冰箱的每层和小料进行拍照，识别与快速记录有哪些食品，基于已有的食品与用户的指定要求进行菜谱生成。

本项目旨在实现"拍照/相册 → AI 识别 → 分层入库 → 库存查看 → 菜谱推荐"的最小闭环体验，优先面向安卓 APK（H5 打包）并预留小程序适配层。

## 仓库结构
- `apps/client`：React + TypeScript + Vite 移动端优先 H5 客户端。
- `apps/server`：AI 识别微服务（FastAPI）。
- `packages/shared`：前后端共享的类型、常量与工具。
- `infra/`：部署脚本、Docker 配置等。
- `docs/`：产品 PRD、交付计划与接口说明（参见 `docs/mvp-delivery-plan.md`）。

## 快速开始
1. 安装依赖：`npm install`（一次性安装所有 workspace）。
2. 启动 H5 客户端开发服务器：`npm run dev:client -- --host 127.0.0.1`（默认 http://localhost:5173，移动端同网段可连）。
3. 构建产物验证：`npm run build:client`。
4. 启动 FastAPI BFF：参考 `apps/server/README.md` 完成 `.env` 配置后，运行 `uvicorn server.main:app --reload`（默认 http://localhost:8000）。
5. 启动 Supabase 本地堆栈：进到 `infra/supabase` 执行 `supabase start` 与 `supabase migration up`。

> 当前仓库仍在搭建阶段，功能将按 PRD 分阶段补齐。欢迎在 `docs/` 目录查阅最新需求与设计记录。

### 环境变量
- H5 客户端：在 `apps/client/.env.local` 中配置 `VITE_API_BASE_URL`（默认 `http://localhost:8000`）及开发期 `VITE_OPENAI_API_KEY`（若需直接调试前端 AI）。
- FastAPI 服务：复制 `apps/server/.env.example`，填入 Supabase URL/Service Role Key、OpenAI Key（qnaigc）、JWT Secret 等信息，可按需覆盖模型与 Base URL。
- Supabase：在 `infra/supabase` 目录下使用 CLI 管理，本地调试默认读取 `.env`。

## 移动端与离线支持
- UI 采用移动端优先布局，底部导航适配手机浏览器操作。
- 使用 Zustand + localStorage 持久化库存与小料数据，支持离线使用，网络恢复后可再同步至后端。
- 拍照入口基于 `<input type="file">`，后续可替换为 Capacitor / 原生相机并对接识别微服务。

## AI 集成（多模态）
- 拍照识别默认调用 `doubao-1.5-vision-pro`（支持图像输入）；菜谱助手默认使用 `deepseek-v3` 文本模型，均通过 OpenAI 兼容端点 `https://api.qnaigc.com/v1/chat/completions`。
- 在 `apps/client/.env.local` 填入密钥（首次需手动创建文件），可直接使用你提供的 key：
  ```ini
  VITE_OPENAI_API_KEY=sk-xxxx                # 例如 sk-dc1b7b7382afbf531b14e6f6343869a3dc215ef79e1c064996bf9443668cfb83
  VITE_OPENAI_VISION_MODEL=doubao-1.5-vision-pro
  VITE_OPENAI_CHAT_MODEL=deepseek-v3
  VITE_OPENAI_API_URL=https://api.qnaigc.com/v1/chat/completions
  ```
  重启 `npm run dev:client` 以加载最新环境变量。**注意**：当前实现直接在前端调用 AI 服务，适用于内部调试，请勿在生产环境暴露正式密钥。
- 移动端入口使用 `<input type="file" accept="image/*" capture="environment">`，可唤起相机或相册；图片超过 ~1MB 会提示压缩后再上传。
