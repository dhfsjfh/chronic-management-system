# 社区慢病管理系统作品代码

## 目录

- `server/`：Node.js + Express + SQLite 后端
- `miniprogram/`：微信小程序前端
- `coze-page-export/`：Coze 页面导出的核心前端文件（`index_v2.html` + 患者端小程序核心文件）
- `patient-web-prototype/`：早期患者端 Web 原型/本地演示材料，不作为医生端源码
- `后端接手说明.md`：给 Cursor/OpenClaw 继续开发后端的任务说明
- `项目总结公开版.html`、`项目总结网页版.html`：项目展示材料
- `OpenClaw.command`：本机 OpenClaw 启动脚本

## 本地端口约定

- **OpenClaw Gateway**：`18789`（本机网关面板常用：`http://127.0.0.1:18789/`）
- **后端 API**：`3000`（默认：`http://127.0.0.1:3000`）

## 后端启动

```bash
cd server
npm install
cp .env.example .env
npm start
```

## Coze 对接

编辑 `server/.env`：

```text
COZE_PAT_TOKEN=pat_xxx
COZE_WORKSPACE_ID=xxx
COZE_BOT_ID=xxx
COZE_WORKFLOW_ID=xxx
```

发布 Coze Bot 后，`/api/ai/chat` 和 `/api/ai/agent` 会优先调用已发布 Bot。

发布 Coze Workflow 后，调用：

```http
POST /api/ai/workflow/run
```

## 评委演示模式（DEMO_MODE）

为评委演示准备了“安全数据 + 只读账号 + 禁止危险操作”的演示模式。

- **开启方式**：在 `server/.env` 中设置 `DEMO_MODE=true`
- **评委账号（只读）**：
  - `JUDGE_ACCOUNT_PHONE=13800138001`
  - `JUDGE_ACCOUNT_PASSWORD=123`

演示模式开启后：
- 只读评委账号可体验：患者列表、健康档案、血压血糖、预警列表、AI 建议、健康报告
- 禁止危险操作：删除/关键修改接口会返回“演示模式下不可操作”
- 所有数据使用**模拟患者数据**（后端使用内存数据库，避免触达本机持久化数据）

演示状态接口：
- `GET /api/demo/status`

## OpenClaw + Cursor + Coze 协作流程

### 角色分工

- **OpenClaw Gateway（本机）**：负责本机智能体网关与可视化面板（端口 `18789`）。
- **后端 API（本机）**：负责业务接口、SQLite 落库、Coze 调用与回执入库（端口 `3000`）。
- **Coze（云端）**：负责 Bot/Workflow 的推理与编排；通过 PAT 进行 API 调用。
- **Cursor（本机协作）**：不作为 HTTP 服务被调用；通过**同一代码目录**协作开发，通过**测试结果/日志/提交变更**进行协作。

### 本地开发闭环（推荐顺序）

1. **启动 OpenClaw Gateway**（可选，用于观察/调试网关与智能体能力）
2. **启动后端服务**
3. **配置 Coze 环境变量**（仅写在 `server/.env`，不要提交/打印 token）
4. **运行 smoke test / 集成状态检查**：
   - `GET /api/system/integration-status`
   - `GET /api/ai/coze/status`
5. **小程序前端联调**：小程序通过 `miniprogram/utils/request.js` 调用后端 API

### 重要提示

- `PUBLIC_API_BASE_URL` 为空时：**Coze 等云端服务不能主动访问本机后端**（localhost/127.0.0.1 不可从云端访问），只能由本机后端主动调用 Coze，然后将结果落库并返回给前端。
- `COZE_WORKFLOW_ID` 如果与 `COZE_BOT_ID` 相同：请视为 **Workflow ID 待确认**，不要假设该值可用（应填写真实发布后的 workflow_id）。

## 说明

当前目录不包含 `server/node_modules`，这是刻意排除的依赖目录。交给 Cursor 或其他机器继续开发时，在 `server/` 内重新执行 `npm install` 即可。
