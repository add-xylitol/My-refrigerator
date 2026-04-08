# 我的冰箱 MVP 交付计划

> 目标：在不引入多账号/家庭成员体系的前提下，打通「拍照 → AI 识别 → 分层入库 → 库存查看/提醒 → 菜谱推荐 → 扣减」闭环，并产出可打包成 APK 的客户端。

## 1. 范围与成功标准
- **账号**：匿名登录（一次性 Token，持久化在客户端）；后续可迁移至多账号。
- **识别与菜谱**：优先对接现成 OpenAI APIs，由服务端统一调用、隐藏密钥；覆盖图像识别与文本菜谱推荐。
- **规则引擎**：菜谱优先使用规则 + 库内数据匹配，AI 仅做文案润色或补齐缺失信息。
- **数据持久化**：所有库存/层位/照片元数据/菜谱快照写入 Supabase（Postgres + Storage）。
- **终端形态**：H5 + Capacitor Android APK，可扩展到小程序（保持 API/BFF 与 UI 解耦）。
- **验收**：端到端用户可以真实上传一张照片，得到候选食材并入库，查看库存/提醒，收到菜谱建议并一键扣减，APK 能在真机安装运行。

## 2. 目标架构（MVP）
```
    [Capacitor H5 客户端]
          |  HTTPS (JWT)
    [FastAPI BFF 层]  <---->  [Supabase Auth + Postgres + Storage]
          | \
          |  \__ /vision/recognize → OpenAI GPT-4o (Vision 模型)
          |_____ /recipes/suggest → 规则引擎 + OpenAI 文案
```
- BFF 负责：匿名登录、资产上传（转存 Supabase Storage）、库存 CRUD、规则算子、对接 OpenAI、统一日志。
- Supabase：建表 `shelves/items/photos/recipes/condiments/sync_logs`，使用 Edge Functions/Row Level Security 限制 Token。
- 客户端：Zustand Store 改为「缓存 + 同步态」，API 调用通过 `apps/client/src/api/http.ts`（新建）集中处理。

## 3. 功能分解与任务
| 模块 | 子任务 | 说明 |
| --- | --- | --- |
| 基建准备 | 1) 配置 Supabase 项目、SQL schema；2) 在 `infra/` 写 `supabase/migrations`；3) `.env` 管理（前后端分离）；4) GitHub Actions 基础流水线（lint + vitest + api tests）。 |
| Auth/配置 | 1) `/auth/anon` FastAPI 实现，生成 Supabase Service Role Token + 短期 JWT；2) 客户端启动时拉取/刷新 Token；3) 统一错误码。 |
| 层位 & 库存 | 1) BFF + Supabase 完成 shelves/items CRUD；2) 客户端 Zustand 改为从 API 初始化，localStorage 仅作 cache；3) 列表支持离线只读 + “待同步”状态；4) 变更/删除后触发本地更新。 |
| 照片上传 & 识别 | 1) 客户端拍照后压缩为 WebP ≤1MB；2) 上传至 BFF `/uploads/photos` → Supabase Storage；3) BFF 调用 OpenAI Vision（带裁剪提示、数量范围）；4) 解析候选并返回；5) 可重试/取消。 |
| 菜谱规则 | 1) 根据库存、临期、烹饪时间定义评分函数（覆盖率×紧急度×偏好标签）；2) 生成 3–5 个菜谱草稿，补充步骤/文案可选调用 OpenAI 文本模型；3) `/recipes/consume` 扣减库存并记录日志。 |
| 提醒/概览 | 1) 客户端首页展示“临期 ≤2 天”列表；2) `lastSyncAt` + “待处理”提示；3) condiments 列表改走 API。 |
| 移动打包 | 1) `apps/client` 集成 Capacitor（相机/文件/分享权限）；2) Android 项目初始化、签名配置文档；3) 调整文件选择逻辑（Capacitor Camera/Filesystem）；4) 真机测试。 |
| 小程序适配预留 | 1) 组件与 API 抽象，不直接依赖 DOM 专属特性；2) `packages/shared` 输出最小 API 类型供未来 Taro/uni-app 使用。 |
| 观测与日志 | 1) 客户端埋点（OpenTelemetry/Sentry 可选）；2) BFF 日志结构化（请求 id、耗时、OpenAI 消耗）；3) 基础指标面板。 |
| QA 与验收 | 1) 单元/集成测试（store、hooks、API 调用）；2) Playwright 端到端覆盖入库/识别/菜谱流程；3) 打包脚本 `npm run build:client && npx cap sync android`；4) 发布 Checklist（见 README）。 |

## 4. 里程碑拆解
1. **M0 · 基础设施就绪（2~3 天）**  
   - 完成 Supabase Schema + FastAPI 项目 scaffold + 环境变量管理。  
   - 新建 API SDK（TypeScript）与本地开发文档。
2. **M1 · 数据闭环（3~4 天）**  
   - Shelves/Items API + 客户端 store 重构 + 离线缓存。  
   - Condiments、提醒模块接入真实数据。
3. **M2 · 识别链路（3 天）**  
   - 图片上传管线、OpenAI Vision 代理、候选 UX、错误兜底。  
   - 存储原始/标注图，支持重新识别。
4. **M3 · 菜谱与扣减（2~3 天）**  
   - 规则引擎 + 文案润色 + 扣减日志。  
   - 首页推荐/临期提示联动。
5. **M4 · APK 打包 & 交付（2 天）**  
   - Capacitor 集成、设备权限、发布指南、CI 打包占位。  
   - 回归测试、文档更新。

## 5. 交付物清单
- `apps/server`：FastAPI 项目代码、配置、测试、Dockerfile。
- `infra/supabase`：迁移 SQL、初始数据脚本。
- `apps/client`：API 封装、状态管理改造、识别 & 菜谱 UI、Capacitor 集成。
- `docs/`:  
  - 本计划（MVP scope）、  
  - 打包/部署手册、  
  - API Contract 更新、  
  - 测试报告模板。
- `README`：新增后端启动、Supabase 配置、Capacitor 构建步骤。

## 6. 风险与缓解
- **OpenAI 费用/速率**：BFF 做并发/速率限制，必要时落地缓存或引入可替代模型。  
- **弱网/大图**：前端压缩 + 分片上传；BFF 校验大小并返回友好提示。  
- **移动端权限**：打包前列出权限申请弹窗与 fallback（相册导入）。  
- **规则准确性**：保留“手动精选”入口 + 反馈机制，后续可用模型训练提升。

---
本计划覆盖了当前识别出的 MVP 缺陷，并将它们映射到具体执行任务；后续如需扩展多账号、会员、内容生态，可在此基础上追加模块级里程碑。
