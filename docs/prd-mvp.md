# 我的冰箱 MVP PRD 摘要

> 版本：2024-XX-XX（根据迭代更新）

## 1. 目标与范围
- **目标**：实现“拍照/相册 → AI 识别 → 分层入库 → 库存查看 → 菜谱推荐”的最小闭环。
- **设备**：优先 Android APK（H5 打包），预留微信小程序适配。

## 2. 冰箱分层与交互
- 默认 5 层（冷藏1/2/3、冷冻、果蔬盒），支持增减与拖拽排序。
- 主体验采用可点击的 3D 冰箱示意；性能不足时降级为 2D 网格但交互一致。

## 3. 关键用户流程
1. **入库**：选择层位 → 拍照/相册 → 上传 → 云端识别返回候选清单（名称/数量/单位/到期/条码）→ 用户校正 → 入库。
2. **库存浏览**：层详情顶部展示“最近照片 + 标注框”，下方是可编辑的清单。
3. **菜谱推荐**：根据库存与临期程度，推荐 3–5 道菜谱，并可一键扣减库存。
4. **分享**：生成单页海报 PNG（菜名 + 成品图 + 材料/步骤摘要），支持保存/分享。
5. **提醒**：首页列出“≤2 天到期”食材（MVP 本地计算）。

## 4. MVP 功能清单
- 层位管理：增删改查、排序，默认 5 层。
- 入库识别：多食材检测 + 日期 OCR + 条码识别（云端）。
- 手动登记：名称、数量/单位、到期日、层位。
- 库存清单：内联编辑数量/到期，支持删除/丢弃。
- 菜谱：规则引擎（覆盖率 × 临期优先）；详情可一键扣减库存。
- 分享海报：前端 Canvas 生成 PNG，可保存/分享。
- 登录：匿名登录（Token）。

## 5. 非功能指标
- 首屏 ≤ 2.5s；识别接口 RTT ≤ 3s（Wi-Fi）；3D 交互 ≥ 30fps。
- 上传图片 ≤ 1MB（WebP）；列表滚动流畅。
- 识别失败需有兜底（手动登记、条码近拍提示）。

## 6. 数据模型（最小集合）
- `shelves(id, name, sort, created_at)`
- `items(id, shelf_id, name, unit, qty, exp_date, barcode, photo_id, created_at, updated_at)`
- `photos(id, shelf_id, url, annotated_url, taken_at)`
- `recipes(id, title, minutes, cover_url, ingredients[], steps[])`

## 7. API（MVP 必要）
- `POST /auth/anon`
- `GET/POST /fridge/shelves`
- `POST /vision/recognize`
- `POST /items/confirm`
- `GET /items?shelf_id=`
- `PATCH /items/:id`
- `GET /recipes/suggest`
- `POST /recipes/consume`

## 8. 技术方案概要
- **前端**：React 18 + TypeScript + Vite + Tailwind；React Router；Zustand；react-konva；react-three-fiber + drei；html2canvas/Canvas。
- **移动封装**：Capacitor 6（相机/相册/分享/存储）。
- **后端**：Supabase（Auth + Postgres + Storage）。
- **AI 微服务**：FastAPI；YOLOv8n；PaddleOCR；pyzbar。
- **菜谱推荐**：规则引擎（覆盖率/临期/时间约束）。
- **日志监控**：前端 Sentry（可选）；后端访问日志；慢查询监控。

## 9. 模块边界
- Web/H5 负责上传与编辑，AI 识别在 `/vision/recognize`。
- 数据持久化统一走 Supabase。
- 3D/2D 层位共享 `onPick(shelfIndex)` 回调。

## 10. 关键实现要点
- 图片压缩 ≤1MB WebP；多张并行上传。
- 日期 OCR 文本解析（YYYY-MM-DD、DD.MM.YY、中文“至/有效期至”）。
- 识别结果去重与合并；数量默认 1，可调整。
- 菜谱扣减：勾选耗材后批量 PATCH 库存数量。
- 分享：Canvas 渲染 → Web Share / 下载；Capacitor Share。

## 11. 数据库（Supabase / Postgres）
- 初始化插入默认 5 层。

## 12. 打包与发布
- APK：Capacitor init → `cap sync android` → 打包，权限仅相机/媒体。
- H5：`vite build` 输出静态资源，可直接嵌入 Capacitor。
- Vision 服务：Docker 部署（CPU 可运行 YOLOv8n + OCR）。

> 详细流程请结合 UX 设计稿与 API Contract 文档协同更新。
