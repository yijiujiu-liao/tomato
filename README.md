# 考研番茄钟

一个面向考研复习的番茄钟 PWA，已经从本地单机版升级为带后端 API、账号体系和云端同步能力的学习管理应用。

## 当前能力

- 前端 PWA：专注 / 休息计时、每日任务、学习目标、宠物成长、今日记录、离线缓存。
- 账号系统：注册、登录、会话认证、退出登录。
- 云端同步：每日任务、专注记录、学习目标、学习设置、宠物成长进度。
- 学习统计：每日 / 每周 / 每月统计、学习天数、日均分钟、连续学习天数、最佳学习日、近 30 天热力图。
- AI 学习教练：学习结束后可基于当天专注、任务和目标自动生成今日总结与明日建议。
- 成长激励：完成专注后获得宠物 XP，并可把专注时间归因到长期学习目标。
- 后端测试：核心 API 集成测试覆盖认证、同步、统计、AI 配置兜底、幂等离线补传。

## 本地启动

```bash
cmd /c npm install
cmd /c npm start
```

启动后访问：

- App: `http://localhost:3000`
- Health check: `http://localhost:3000/api/health`
- Readiness check: `http://localhost:3000/api/ready`

Windows PowerShell 可能会阻止 `npm.ps1`，所以建议使用 `cmd /c npm ...`。

## 常用命令

```bash
cmd /c npm run check
cmd /c npm test
cmd /c npm start
```

`check` 会做语法检查，`test` 会使用临时 SQLite 数据库跑集成测试，不会污染本地 `data/tomato.sqlite`。

## 环境变量

复制 `.env.example` 后按需调整。当前服务不会自动读取 `.env` 文件，部署平台需要把这些变量配置到运行环境中。

```bash
NODE_ENV=production
PORT=3000
DATABASE_PATH=./data/tomato.sqlite
SESSION_TTL_DAYS=30
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
OPENAI_BASE_URL=https://api.openai.com/v1
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

说明：

- `NODE_ENV`：运行环境标识，健康检查会返回该值。
- `PORT`：后端监听端口，范围 `1-65535`。
- `DATABASE_PATH`：SQLite 数据库文件位置。
- `SESSION_TTL_DAYS`：登录会话有效天数，范围 `1-365`。
- `AI_PROVIDER`：AI 总结提供商，可选 `openai` 或 `deepseek`，默认 `openai`。
- `OPENAI_API_KEY`：服务端调用 OpenAI 的密钥。不要写进前端代码，也不要提交到 Git。
- `OPENAI_MODEL`：AI 总结使用的模型，默认 `gpt-5.5`。
- `OPENAI_BASE_URL`：OpenAI API 地址，默认 `https://api.openai.com/v1`。
- `DEEPSEEK_API_KEY`：服务端调用 DeepSeek 的密钥。使用 DeepSeek 时设置 `AI_PROVIDER=deepseek`。
- `DEEPSEEK_MODEL`：DeepSeek 总结使用的模型，默认 `deepseek-v4-flash`。
- `DEEPSEEK_BASE_URL`：DeepSeek API 地址，默认 `https://api.deepseek.com`。

## API 概览

需要登录的 API 使用：

```http
Authorization: Bearer <token>
```

认证：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`

同步与设置：

- `GET /api/sync`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/pet`
- `PUT /api/pet`

每日任务：

- `GET /api/tasks?date=YYYY-MM-DD`
- `POST /api/tasks`
- `PATCH /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`

学习目标：

- `GET /api/study-goals`
- `POST /api/study-goals`
- `PATCH /api/study-goals/:goalId`
- `DELETE /api/study-goals/:goalId`

专注记录与统计：

- `POST /api/focus-sessions`
- `GET /api/stats?range=day|week|month`

AI 学习教练：

- `POST /api/ai/daily-summary`

该接口会读取登录用户当天的任务、专注记录、学习目标和宠物成长数据，返回结构化的今日总结、风险提醒、第二天学习建议和鼓励语。未配置对应 provider 的 API Key 时会返回 `503` 与 `AI_NOT_CONFIGURED`。

## 部署提示

1. 使用 Node.js `>=24.0.0`。
2. 设置 `NODE_ENV=production`、`DATABASE_PATH`、`SESSION_TTL_DAYS`，如需 AI 总结再设置 OpenAI 或 DeepSeek 的环境变量。
3. 确保 `DATABASE_PATH` 所在目录可写并可持久化。
4. 部署后检查 `/api/health` 和 `/api/ready`。
5. 当前使用 Node.js 内置 SQLite，Node 会提示实验性警告；生产长期使用时建议评估迁移到稳定 SQLite 包或托管数据库。

## Render 部署

仓库已经包含 `render.yaml`，可以用 Render Blueprint 部署：

1. 把当前仓库推到 GitHub。
2. 在 Render 里选择 `New` -> `Blueprint`。
3. 选择这个 GitHub 仓库，Render 会读取 `render.yaml`。
4. 确认服务配置：
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`
   - Disk Mount Path: `/var/data`
   - `DATABASE_PATH=/var/data/tomato.sqlite`
   - OpenAI：`AI_PROVIDER=openai`、`OPENAI_API_KEY=你的 OpenAI API Key`
   - DeepSeek：`AI_PROVIDER=deepseek`、`DEEPSEEK_API_KEY=你的 DeepSeek API Key`
5. 部署完成后访问：
   - `https://你的服务域名/`
   - `https://你的服务域名/api/health`
   - `https://你的服务域名/api/ready`

注意：Render 上 SQLite 必须放在持久化 Disk 里，否则重新部署可能丢数据。当前 `render.yaml` 已经把数据库路径设为 `/var/data/tomato.sqlite`，并挂载了 `tomato-data` 磁盘。

## Fly.io 备选

如果改用 Fly.io，也可以部署这个 Node 服务，但需要创建 Volume 并把 `DATABASE_PATH` 指向 Volume 内的路径，例如：

```bash
DATABASE_PATH=/data/tomato.sqlite
```

Fly.io 方案后续需要补 `Dockerfile` / `fly.toml`，核心原则同样是：SQLite 数据库必须放在持久化 Volume 中。

## 项目状态

当前已经具备完整前后端学习管理应用的核心闭环。后续可以继续加强：生产数据库方案、更多端到端 UI 测试、数据导出、账户资料管理、部署流水线。
