# 社区慢病管理 — 本地极简演示版

纯 HTML/CSS/JS 前端 + 单文件 Node HTTP 服务（**无 npm 依赖**），便于答辩录像与离线演示。

## 运行

前置：已安装 [Node.js](https://nodejs.org/) 18+（系统自带 `/usr/bin/env node`）。

- **一行命令**：在项目目录执行 `node server.js` 或 `npm start`
- **macOS**：双击 `start.command`（需在终端中获得执行权限：`chmod +x start.command`）
- **Windows**：双击 `启动.bat` 或 `start.bat`

浏览器打开：**http://127.0.0.1:8890**

## 演示账号

| 项目 | 值 |
|------|-----|
| 手机号 | `13800138001` |
| 密码 | `123` |

端口可通过环境变量修改：`PORT=9000 node server.js`

## 云端部署（Vercel / GitHub Pages）

请阅读 **[DEPLOY.md](./DEPLOY.md)**：含上传文件清单、`config.js` 说明、推荐命令与线上验证步骤。
