# 社区慢病管理系统（作品代码）

## 目录总览

- `miniprogram/`：患者端微信小程序（首页、档案、打卡、AI）
- `server/`：Node.js + SQLite + Coze API 后端（含 DEMO_MODE 与评委只读账号）
- `doctor-web/`：医生端说明目录（对应 Coze 导出页面与原型）
- `coze-page-export/`：Coze 导出的医生端页面（`index_v2.html`）与小程序导出文件
- `patient-web-prototype/`：医生/患者 Web 原型（提交备份，不作为主运行后端）
- `部署说明.md`：比赛提交与在线部署说明
- `评委演示说明.md`：评委演示账号、只读范围、演示步骤
- `后端接手说明.md`：后端二次开发说明

## 三端功能一致性（doctor-web / miniprogram / server）

| 功能 | doctor-web（Coze 导出） | miniprogram（患者端） | server（后端） | 状态 |
|---|---|---|---|---|
| 登录演示 | admin / 123 | 评委一键登录（13800138001 / 123） | `/api/auth/login` 支持 judge | 已统一 |
| 患者列表与档案 | 有 | 有 | `/api/patients` `/api/patients/:id` | 一致 |
| 血压/血糖数据展示 | 有 | 有 | `/api/blood-pressure` `/api/blood-sugar` | 一致 |
| AI 咨询 | 有 | 有 | `/api/ai/chat` `/api/ai/agent` | 一致 |
| 健康报告 | 有（展示） | 有（入口） | `/api/ai/report/:patientId` | 一致 |
| 演示只读限制 | 文档约束 | 前端按钮与登录入口 | DEMO_MODE + judge 权限拦截 | 一致 |

## 统一演示账号

- 医生端演示（doctor-web / coze-page-export）：`admin / 123`
- 评委只读账号（miniprogram + server）：`13800138001 / 123`

## 已确认的提交安全规则

本目录已执行以下规则，适配比赛提交：

- 不包含 `.env`
- 不包含真实 token（`COZE_PAT_TOKEN` 仅允许出现在 `.env.example` 占位）
- 不包含 `node_modules/`
- 不包含数据库与临时文件（`*.db`、`*.db-wal`、`*.db-shm`）

`.gitignore` 已加固：

```text
node_modules/
.env
**/.env
*.db
*.sqlite
*.db-shm
*.db-wal
```

## 作品部署链接

- Coze 公开演示链接（主在线入口）：
  - https://www.coze.cn/s/-LdnZbZJCI8/
- 本地医生端页面备份：`coze-page-export/index_v2.html`
- 本地后端 API：`http://127.0.0.1:3000`

## 快速启动（本地联调）

```bash
cd server
npm install
cp .env.example .env
npm start
```

然后在小程序里将 `BASE_URL` 指向 `http://127.0.0.1:3000`，即可联调。
