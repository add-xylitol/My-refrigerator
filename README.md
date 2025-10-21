# 我的冰箱（MVP）

本项目旨在实现“拍照/相册 → AI 识别 → 分层入库 → 库存查看 → 菜谱推荐”的最小闭环体验，优先面向安卓 APK（H5 打包）并预留小程序适配层。

## 仓库结构
- `apps/client`：React + TypeScript + Vite 移动端优先 H5 客户端。
- `apps/server`：AI 识别微服务（FastAPI）。
- `packages/shared`：前后端共享的类型、常量与工具。
- `infra/`：部署脚本、Docker 配置等。
- `docs/`：产品 PRD、设计文档与接口说明。

## 快速开始
1. 安装依赖：`npm install`（一次性安装所有 workspace）。
2. 启动 H5 客户端开发服务器：`npm run dev:client -- --host 127.0.0.1`（默认 http://localhost:5173，移动端同网段可连）。
3. 构建产物验证：`npm run build:client`。
4. （预留）启动识别服务：`npm run dev:server`。

> 当前仓库仍在搭建阶段，功能将按 PRD 分阶段补齐。欢迎在 `docs/` 目录查阅最新需求与设计记录。

## 移动端与离线支持
- UI 采用移动端优先布局，底部导航适配手机浏览器操作。
- 使用 Zustand + localStorage 持久化库存与小料数据，支持离线使用，网络恢复后可再同步至后端。
- 拍照入口基于 `<input type="file">`，后续可替换为 Capacitor / 原生相机并对接识别微服务。

## AI 占位服务
- 拍照识别通过 `aiService.recognize` 提供占位数据：上传照片后返回候选名称、数量、到期日，并可一键填充入库表单。
- 菜谱助手使用 `aiService.chatRecipes` 模拟大模型问答，支持快捷提示与根据库存动态生成菜谱卡。
- 待接入真实模型后，仅需替换 `apps/client/src/services/aiService.ts` 的请求实现即可。
