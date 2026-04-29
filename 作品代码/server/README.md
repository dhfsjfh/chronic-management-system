# 社区慢病管理系统 - 后端服务

## 技术栈

- Node.js + Express
- SQLite（DEMO_MODE 下使用内存库）
- Coze Bot / Workflow API

## 启动

```bash
npm install
cp .env.example .env
npm start
```

默认监听：`http://127.0.0.1:3000`

## 演示账号（统一）

- 评委只读账号：`13800138001 / 123`

## 核心接口（与 miniprogram / doctor-web 对齐）

- 登录：`POST /api/auth/login`
- 患者：`GET /api/patients`、`GET /api/patients/:id`
- 生命体征：`GET /api/blood-sugar`、`GET /api/blood-pressure`
- AI：`POST /api/ai/chat`、`POST /api/ai/agent`
- 报告：`GET /api/ai/report/:patientId`
- 演示状态：`GET /api/demo/status`

## 演示模式

当 `.env` 中 `DEMO_MODE=true` 时：

- judge 账号只读
- 删除/关键修改接口被拦截（返回“演示模式下不可操作”）
- 数据使用演示安全数据

## 安全提交

提交作品前请确保：

- 不提交 `.env`
- 不提交真实 token
- 不提交 `node_modules/`
- 不提交 `*.db`、`*.db-wal`、`*.db-shm`
