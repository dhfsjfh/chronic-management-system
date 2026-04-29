# 公网 API 部署说明

目标：把后端部署成一个公网 `API_BASE_URL`，前端、评委演示页、OpenClaw 都只访问这个公网 API。

## 推荐路径：Render Web Service

1. 把项目推到 GitHub。
2. 打开 Render，新建 `Blueprint` 或 `Web Service`。
3. 如果用 Blueprint，选择仓库根目录的 `render.yaml`。
4. 如果手动创建 Web Service：
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/api/health`
5. 环境变量：

```bash
NODE_ENV=production
DEMO_MODE=true
PUBLIC_API_READONLY=true
JUDGE_ACCOUNT_PHONE=13800138001
JUDGE_ACCOUNT_PASSWORD=123
PUBLIC_API_BASE_URL=https://你的-api.onrender.com
```

## 验证

部署完成后访问：

```text
https://你的-api.onrender.com/api/health
https://你的-api.onrender.com/api/coze/status
https://你的-api.onrender.com/api/coze/overview
https://你的-api.onrender.com/api/coze/patients
```

本地 smoke test 也可以指向公网：

```bash
BASE_URL=https://你的-api.onrender.com npm run smoke
```

注意：公网演示默认 `PUBLIC_API_READONLY=true`，写入类 Coze webhook 接口会返回 403，避免评委链接被外部乱写；`npm run smoke` 会自动识别并验证这个保护。

## 前端配置

把医生端、患者端、演示页里的 API 地址统一改为：

```js
window.__API_BASE_URL__ = 'https://你的-api.onrender.com';
```

或在构建环境变量里设置：

```bash
VITE_API_BASE_URL=https://你的-api.onrender.com
NEXT_PUBLIC_API_BASE_URL=https://你的-api.onrender.com
```

## 后续如果要开放工作流写入

只在确实需要外部系统写入时使用：

```bash
PUBLIC_API_READONLY=false
COZE_WEBHOOK_SECRET=一串高强度随机密钥
```

调用写入接口时带请求头：

```http
x-api-key: 一串高强度随机密钥
```

不要把这个密钥写进前端页面。
