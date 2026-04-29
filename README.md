# 社区慢病管理系统

面向社区慢病随访场景的演示系统，包含患者端、医生端/公开演示页、Node.js 后端 API、公网部署配置和参赛提交材料。

## 目录说明

| 路径 | 说明 |
| --- | --- |
| `server/` | 后端 API 服务，包含患者、体征、预警、回访、AI/Coze 状态与公网 API 配置 |
| `miniprogram/` | 微信小程序患者端源码 |
| `demo-local-presentation/` | 可部署到 Vercel/GitHub Pages 的公开演示版 |
| `作品代码/` | 面向作品提交的完整源码汇总 |
| `参赛提交材料/` | 按比赛系统字段整理的提交材料 |
| `render.yaml` | Render 公网 API 一键部署配置 |
| `待提交压缩包/` | 本地生成的干净提交压缩包，不建议上传 GitHub |
| `本地私有_不要上传/` | 本地运行数据、旧压缩包、私有文件备份，不要上传 |

## 后端本地启动

```bash
cd server
npm install
DEMO_MODE=true JUDGE_ACCOUNT_PASSWORD=123 npm start
```

访问：

```text
http://127.0.0.1:3000/api/health
http://127.0.0.1:3000/api/coze/status
```

验收：

```bash
npm run smoke
```

## 公网 API 部署

优先使用 Render。仓库根目录已提供 `render.yaml`，详细步骤见：

```text
server/PUBLIC_API_DEPLOY.md
```

公网演示建议保持：

```bash
DEMO_MODE=true
PUBLIC_API_READONLY=true
JUDGE_ACCOUNT_PASSWORD=123
```

## 评委演示账号

```text
手机号：13800138001
密码：123
权限：只读演示账号
```

## 安全说明

- 不提交 `.env`、真实 Token、运行数据库、`node_modules`。
- `server/.env.example` 和 `server/.env.public.example` 只保留占位变量。
- 公网 API 默认只读，写入类 Coze webhook 接口会返回 403。
