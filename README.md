# 红笺

红笺是一个单人自托管的中文图文创作工作台。围绕同一份作品完成主题、大纲、图片、笔记文案与扫码发布确认。

项目由 TanStack Start、React、SQLite 和 Drizzle 驱动。模型与发布服务的密钥只在服务端环境变量中读取，浏览器和数据库都不会保存密钥。

## 本地开发

需要 Node.js 22.12+ 和 pnpm 10。

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

开发服务默认运行在 `http://localhost:5173`。生产服务使用端口 `12398`：

```bash
pnpm build
pnpm start
```

## 环境变量

在 `.env.local` 中配置以下内容。除数据库和数据目录外，其余变量均为服务端密钥，不应提交到版本库。

| 变量 | 用途 |
| --- | --- |
| `TEXT_API_KEY`、`TEXT_BASE_URL`、`TEXT_MODEL` | OpenAI 兼容文本模型 |
| `VOLCENGINE_API_KEY` | 火山引擎 Seedream 图片生成 |
| `AICONDUCTOR_API_KEY` | 小红书扫码发布 |
| `APP_ACCESS_PASSWORD` | 单人访问密码 |
| `SESSION_SECRET` | Cookie 签名密钥 |
| `DATABASE_URL`、`DATA_DIR` | SQLite 与图片归档位置 |
| `XHS_PUBLISH_API_URL` | 可选的发布服务覆盖地址 |

## Docker

```bash
Copy-Item .env.example .env.local
docker compose up --build -d
```

应用在 `http://localhost:12398` 可用，作品数据库和图片归档持久化到 `./data`。

## 验证

```bash
pnpm typecheck
pnpm build
```

## 署名与许可

红笺基于 [RedInk](https://github.com/HisMax/RedInk) 的开源实现重写。原项目许可证保留在 [LICENSE](./LICENSE)，本项目继续遵循 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)。
