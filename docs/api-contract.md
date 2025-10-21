# API Contract（MVP 草案）

| Endpoint | Method | 描述 |
| --- | --- | --- |
| `/auth/anon` | POST | 匿名登录，返回 Token 与过期时间 |
| `/fridge/shelves` | GET | 查询层位列表 |
| `/fridge/shelves` | POST | 批量保存层位配置 |
| `/vision/recognize` | POST | 上传 base64 图片数组，返回识别候选 |
| `/items/confirm` | POST | 批量确认识别结果入库 |
| `/items` | GET | 按层位查询库存列表 |
| `/items/:id` | PATCH | 编辑库存项数量或到期日 |
| `/recipes/suggest` | GET | 基于库存推荐菜谱列表 |
| `/recipes/consume` | POST | 扣减选中菜谱的食材库存 |

> 详细字段请参考 `packages/shared` 中的 TypeScript 类型定义。
