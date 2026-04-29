# Vercel / GitHub Pages 部署指南

本目录包含两份可上线的内容：

| 内容 | 说明 |
|------|------|
| **交互演示 App** (`index.html` / `login.html` …) | 支持「Serverless API」或「纯静态 fallback」两种方式 |
| **项目简报 Landing** (`overview.html`) | 自带样式与文案，纯静态 |

> **关于「永久有效」与速度**  
> 免费托管依赖账号与服务商政策——只要仓库／项目存续、配额未超限，链接通常可持续访问。建议使用 **HTTPS**、`index.html`/静态资源的 **CDN 缓存**（本仓库已通过 `vercel.json` 为 JS/CSS/json 配置了短期缓存）；比赛／答辩可复制 **Production 固定域名**（`*.vercel.app`），或绑定 **自有域名**以更稳定。**GitHub Pages** 适合纯静态链路；带真实 `/api/` 时请优先 **Vercel**。

---

## 方案 A — Vercel（推荐：含轻量后端 API）

与本地 `node server.js` 行为等价：`/api/login`、`/api/patients`、`/api/patient/:id`、`/api/vitals/:id` 由 `api/` 下 Serverless 函数提供服务。

### 1. 需上传的文件

将整个 **`demo-local-presentation`** 目录作为仓库根目录（或单体子目录）上传，包含：

```
demo-local-presentation/
├── api/                 # ★ Serverless，勿删
├── lib/                 # 共享逻辑与演示数据（勿删）
├── public/              # 静态资源根（勿删）
│   ├── index.html …
│   ├── data/mock.json   # ★ GitHub Pages 纯静态也需
│   ├── js/config.js      # ★ 见下文
│   └── overview.html
├── server.js             # 仅本地调试用（可保留）
├── vercel.json
└── package.json
```

上传方式任选：**Git Push**、`vercel deploy` CLI 拖拽、`Import Git Repository`。

### 2. `public/js/config.js`（云端默认）

云端保持：

```javascript
window.__DEMO_STATIC__ = false;
window.__API_BASE_PATH__ = '';   // Production 通常为根域名
```

若你把站点挂在子路径（少见），设为 `'/subdir'`。

### 3. 部署命令

在项目根目录：

```bash
# 若无 vercel CLI
npm i -g vercel
vercel            # Preview
vercel --prod    # Production
```

或在 **[vercel.com](https://vercel.com)**：**Add New Project** → Import 仓库 → **Root Directory** 选 **`demo-local-presentation`**（若仓库根不是该文件夹）→ Deploy。

Framework Preset：**Other**。

### 4. 在线地址

构建成功后，控制台会给出 **`https://<project>.vercel.app`**。**Production URL** 即适合写进答辩 PPT（长期可用前提是项目未删）。

### 5. 验证

浏览器打开：**`https://<你的域名>/index.html`** → 登录 **`13800138001` / `123`** → 患者列表 → 进入详情。**`https://<域名>/overview.html`** 为项目简报。

---

## 方案 B — GitHub Pages（纯静态，无需后端）

Pages **不会执行** `api/`，必须把演示改为 **`__DEMO_STATIC__ = true`**，数据仅从浏览器请求 **`public/data/mock.json`** 与 **`js/api.js`** 内逻辑完成同样流程。

### 1. 修改配置

编辑 **`public/js/config.js`**：

```javascript
window.__DEMO_STATIC__ = true;
```

若启用 **GitHub Project Pages**（形如 `https://<user>.github.io/<repo>/`），并保持 **`window.__API_BASE_PATH__ = '/仓库名'`**（与仓库路径段一致，无尾斜杠）——这样 **将来**若把 **`__DEMO_STATIC__`** 改回 **`false`** 并迁移到自建 API 同域子路径时，请求仍会指向同一仓库前缀。**纯静态链路**主要依靠相对路径读取 **`data/mock.json`**；若你一直使用 **`true`**，这一项也可暂时留 **`''`**（仅在你明确需要带子路径的请求前缀时再填）。

User/Organization 站点根 **`username.github.io`** 且无子路径时，**`__API_BASE_PATH__`** 通常为 **`''`**。

### 2. 上传文件

将 **`public/` 下全部文件** 放到仓库的 **`docs/`** 目录（或 **`gh-pages` 分支根目录**），并保证 **`data/mock.json`**、`js/config.js`、`js/api.js` 一并存在。

**不要**依赖 `api/`、`server.js`（GitHub Pages 不会运行）。

### 3. 开启 Pages

仓库 **Settings → Pages**：

- **Source**：`Deploy from a branch` → Branch **`main`** / **`master`**，folder **`/docs`**；或 **`gh-pages`** 分支根目录。

保存后得到：**`https://<user>.github.io/<repo>/`**（或根域名）。

### 4. 验证

访问 **`.../index.html`**（或若 `index.html` 在根则 **`/`**）→ 登录 → 列表与详情与本地静态模式一致。

---

## 两个「项目」在上线中的对应关系

| 线下概念 | 线上入口 |
|----------|----------|
| 交互演示（登录 + 患者 + 指标） | `/index.html`（或根 `/`） |
| 项目官网/答辩长页 | `/overview.html` |

可在首页与导航中互相跳转（已互链）。

---

## 常见问题

**Q：Vercel 冷启动慢？**  
首次访问 Serverless 可能多 1～2 秒；之后边缘缓存会明显加快。比赛前可先打开一次「预热」。

**Q：能把 Coze/真实后端接进去吗？**  
本包为演示隔离包；若需接主项目 `server/`，应单独做环境变量与 CORS，不在本文件范围。

**Q：演示账号密码会泄露吗？**  
仅用于比赛演示的虚构数据；正式环境勿复用。
