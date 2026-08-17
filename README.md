# 红笺

红笺是一个单人自托管的中文图文创作工作台。围绕同一份作品完成主题、大纲、图片、笔记文案与扫码发布确认。发布时确认内容后直接生成二维码，不提供底层存储选项。

项目由 TanStack Start、React、SQLite 和 Drizzle 驱动。文本与图片模型密钥由用户在设置页配置，仅保存在本机服务端 SQLite 中，保存后不会回传浏览器。该数据库和数据目录不得放入共享盘、同步盘或提交到版本库。访问控制与发布服务密钥继续通过服务端环境变量提供。

## 创作流程

创作流程保持为主题输入、可编辑大纲、图片生成、结果与发布四个阶段。主题输入最多可附加 5 张参考图片；确认大纲后先生成封面，再将封面和用户参考图用于其余页面的并发生成。生成任务由 SQLite 互斥管理，关闭页面后仍会继续；重新进入作品可恢复状态，同一作品不会重复调用收费接口。页面内容、顺序或参考图变化会使不匹配的旧图失效，失败图片可单张重绘或批量补全。

图片会归档到本机，但扫码发布仍需要模型返回的公网图片链接。公网链接失效时，作品会显示为不可发布，需重新生成图片；本项目不提供对象存储或发布服务转存。发布前请确认图片不含第三方平台标识、账号、水印或未获授权素材。

标题、正文和标签在图片结果页单独生成。文案生成失败不会影响已完成的图片，也不会触发图片重绘。

## 本地开发

需要 Node.js 22.12+ 和 npm。

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

开发服务默认运行在 `http://localhost:5173`。生产服务使用端口 `12398`：

```bash
npm run build
npm run start
```

## Cloudflare Workers 部署

构建与部署：`npm run deploy`（等价于 `vite build --mode cloudflare && wrangler deploy`），推送到 GitHub `master` 分支后由 Actions 自动部署到 https://hongjian-studio.mhtm9531.workers.dev 。本地开发保持 node 模式（SQLite），仅 `--mode cloudflare` 构建 Worker 目标。

数据库使用 D1（`xhs_note_creator`），表结构由 `drizzle/` 迁移目录管理，**CI 部署时自动应用未执行的迁移**。修改数据库结构后提交即可：

```bash
npx drizzle-kit generate   # 本地生成新迁移 SQL，随代码提交
# push 后 CI 自动执行 wrangler d1 migrations apply --remote
```

本地 SQLite 数据迁移到线上 D1 的脚本：`node scripts/migrate-to-d1.mjs`（需先在环境变量中提供 R2 凭证，`.env.local` 中已配置）。

## 模型与环境配置

在设置页选择 Doubao Seed 2.1 Pro 或 Turbo 作为文本模型，并分别配置文本模型与 Seedream 图片模型的方舟 API Key。文本模型可独立开启深度思考；关闭时发送 `thinking.type=disabled`，开启时发送 `thinking.type=enabled`。参考图片会以方舟 Chat API 支持的 Base64 `image_url` 格式发送给所选文本模型。

在 `.env.local` 中配置访问控制、扫码发布和运行时路径。除数据库和数据目录外，其余变量均为服务端密钥，不应提交到版本库。

| 变量 | 用途 |
| --- | --- |
| `AICONDUCTOR_API_KEY` | 小红书扫码发布 |
| `APP_ACCESS_PASSWORD` | 单人访问密码 |
| `SESSION_SECRET` | Cookie 签名密钥 |
| `DATABASE_URL`、`DATA_DIR` | SQLite 与图片归档位置 |
| `XHS_PUBLISH_API_URL` | 可选的发布服务覆盖地址 |

## 验证

```bash
npm run test
npm run typecheck
npm run build
npm run smoke:dev
```
