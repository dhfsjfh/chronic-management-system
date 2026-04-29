# 社区慢病管理系统 — 完全版

> 2026 中国大学生计算机设计大赛 · 人工智能实践赛  
> 提交用完整代码

## 项目简介

**社区慢病管理系统** 是一款面向社区慢性病患者的健康管理平台，覆盖高血压、糖尿病等常见慢病的日常监测与管理。系统提供健康打卡、趋势追踪、AI健康咨询、消息通知、数据同步等完整功能链，并预留 Coze 多智能体平台对接接口。

## 运行环境要求

| 组件 | 版本要求 |
|------|----------|
| 浏览器 | Chrome 90+ / Edge 90+ / Firefox 90+ |
| Node.js (可选后端) | v18+ |
| Python (可选后端) | 3.9+ |
| 微信小程序 IDE (可选) | 最新稳定版 |

## 快速启动

### 方法一：直接浏览器打开（无需服务端）

```bash
# 直接双击 index.html 或使用 Python 启动简易服务
cd 完全版代码
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080
```

### 方法二：部署 Web 服务

```bash
cd 完全版代码
npm install
node src/api/server.js
# 浏览器访问 http://localhost:3000
```

### 方法三：微信小程序（需微信开发者工具）

```bash
# 用微信开发者工具打开 community-cdm-miniprogram/ 目录
# 在 project.config.json 中填入 AppID
```

## 登录信息

- **演示账号：** admin
- **演示密码：** 123

## 核心功能

### 1️⃣ 首页概览
- 用户信息展示（姓名、就诊卡号）
- 最新健康速览（血压、血糖、体重）
- 四宫格功能入口
- 健康资讯轮播

### 2️⃣ 健康打卡
- 血压记录（收缩压/舒张压+自动分级判定）
- 血糖记录（空腹/餐后+自动分级判定）
- 体重记录
- 多维度数据校验
- 打卡结果展示

### 3️⃣ 我的档案
- 最近指标卡片
- 血糖/血压/体重趋势图表（Canvas 绘制）
- 日/周/月时间范围切换
- 历史打卡记录列表

### 4️⃣ AI健康咨询
- 智能对话界面
- 快捷健康问题
- 模拟 AI 回复（预留 Coze API 对接）
- 消息历史展示

### 5️⃣ 消息通知
- 随访提醒
- 用药提醒
- 健康周报
- 通知公告
- 已读/未读管理

### 6️⃣ 数据同步（预留）
- Coze 多智能体平台对接
- 手动触发同步
- 同步日志查看
- 数据统计

## 技术架构

```
[Web前端 (HTML5 + CSS3 + JavaScript)]
        |
        | (HTTP / WebSocket)
        |
[Node.js / Python 后端服务]
        |
        | (REST API)
        |
[Coze 多智能体平台] ←→ [数据库]
```

## 详细目录结构

```
完全版代码/
├── index.html                     # 系统入口
├── README.md                      # 本文件
├── 运行说明.txt                     # 极简启动步骤
├── src/
│   ├── css/
│   │   ├── style.css              # 全局样式
│   │   └── components.css         # 组件样式
│   ├── js/
│   │   ├── app.js                 # 应用入口与路由器
│   │   ├── utils.js               # 工具函数
│   │   ├── api.js                 # API 接口定义
│   │   ├── mock-data.js           # 模拟数据层
│   │   └── pages/
│   │       ├── home.js            # 首页逻辑
│   │       ├── login.js           # 登录逻辑
│   │       ├── checkin.js         # 健康打卡逻辑
│   │       ├── record.js          # 档案记录逻辑
│   │       ├── chart-renderer.js  # Canvas 图表渲染引擎
│   │       ├── ai.js              # AI咨询逻辑
│   │       ├── msg.js             # 消息通知逻辑
│   │       └── datasync.js        # 数据同步逻辑
│   ├── api/
│   │   ├── server.js              # Node.js 后端服务
│   │   ├── coze-client.js         # Coze 平台 SDK 客户端
│   │   └── routes.js              # REST API 路由定义
│   └── components/
│       ├── health-card.js           # 健康指标卡片组件
│       └── loading.js              # 加载动画组件
├── static/
│   └── images/                    # 图片资源
├── database/
│   └── schema.sql                 # 数据库表结构定义
└── config/
    ├── config.js                  # 应用配置
    └── coze-config.json           # Coze 平台对接配置
```

## 数据流向设计

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│  患者浏览器端    │ ←───→ │  Coze 多智能体    │ ←───→ │  社区医生Web端  │
│  (前端展示)      │       │  (数据同步+AI)    │       │  (管理后台)     │
└─────────────────┘       └──────────────────┘       └─────────────────┘
        ↑                                                    ↑
        │ localStorage                                        │
        └───────── 本地缓存/离线记录 ──────────────────────────┘
```

## Coze 平台对接说明

系统预留 Coze 多智能体平台对接能力，需在 Coze 平台创建：

### 数据库
- **名称：** 慢病管理数据同步
- **字段：** id, user_id, user_name, content, source, data_type, extra_data, created_at

### 工作流
1. `submit_health_data` — 写入健康数据
2. `get_latest_data` — 获取最新数据

### 配置方法
编辑 `config/coze-config.json`，填入对应工作流 ID、Bot ID、Token 后，重启后端服务即可连通。

## 开发规范

- **缩进：** 4 空格
- **命名：** 语义化英文小驼峰（变量/函数），文件名全小写连字符
- **AI 标注：** 所有 AI 生成代码前标注 `// AI辅助生成` 注释
- **注释：** 每个文件顶部有功能/用途/AI来源说明
- **ESLint：** 遵循 standard 规范

## 提交与审核

本代码可直接打包为 zip 文件提交至：
- OpenClaw 平台
- 大赛指定源代码提交平台
- GitHub / Gitee 代码仓库

## 许可证

仅供 2026 中国大学生计算机设计大赛参赛使用。
