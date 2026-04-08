# Supabase 基础设施

本目录存放 Supabase 项目的迁移脚本与初始化指引。按照 MVP 计划，数据库需要承载以下实体：

- `shelves`：冰箱层位配置；
- `items`：库存食材；
- `photos`：拍照记录（含原图/标注图地址）；
- `condiments`：小料库存；
- `recipes`：菜谱建议/历史；
- `recipe_usages`：菜谱与库存的扣减记录；
- `sync_logs`：客户端与服务端的同步/操作日志；
- `anon_profiles`：匿名会话（MVP 阶段单用户，但需为多账号预留字段）。

## 使用方式

1. 安装 Supabase CLI，并在根目录执行 `supabase login`。
2. 在仓库根目录运行：
   ```bash
   cd infra/supabase
   supabase start
   supabase migration up
   ```
3. 将 `.env.example` 中的 Supabase 相关字段（`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY` 等）填入后端/客户端环境变量。

> 迁移脚本采用 `infra/supabase/migrations/<timestamp>_<name>.sql` 形式；如需新增表或列，请追加迁移文件，禁止直接修改历史脚本。
