# 社区慢病管理系统 - 后端服务

## 技术栈

- **运行时**: Node.js
- **框架**: Express
- **数据库**: SQLite (better-sqlite3)

## 快速启动

```bash
# 安装依赖
npm install

# 启动服务
npm start
# 或
node server.js
```

服务默认监听 `http://localhost:3000`。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/profile` | 获取用户信息 |
| GET | `/api/home/banners` | 获取首页轮播图 |
| GET | `/api/home/quick-stats` | 获取首页快捷统计（天气、未读消息） |
| GET | `/api/news?page=1&pageSize=10&keyword=` | 获取健康资讯（支持分页和关键词搜索） |
| GET | `/api/checkin/today` | 获取今日打卡状态 |
| POST | `/api/checkin/one-click` | 一键打卡 |
| GET | `/api/health` | 健康检查 |

所有接口统一返回格式：

```json
// 成功
{ "code": 200, "data": { ... } }

// 错误
{ "code": 500, "message": "错误描述" }
```

## 数据库

首次启动自动在项目目录下创建 `data.db` 文件，并初始化种子数据：

- 1 位居民用户（张阿姨）
- 8 条健康资讯
- 3 条 banner
- 最近 7 天的打卡记录

## 对接微信小程序

修改 `miniprogram/utils/request.js` 中的 `BASE_URL`：

```js
const BASE_URL = 'http://localhost:3000';  // 开发环境

// 生产环境请使用实际服务器地址
// const BASE_URL = 'https://your-server.com';
```
