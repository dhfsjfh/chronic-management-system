# 社区慢病管理小程序首页

## 当前已落地内容

- `pages/index/index.js`：首页状态管理、搜索、轮播、资讯、一键打卡
- `pages/index/index.wxml`：首页视图结构
- `pages/index/index.wxss`：适老化卡片风格样式
- `utils/request.js`：通用请求封装
- `utils/api.js`：首页 REST API 适配层，已对接 OpenClaw 后端并保留 mock 回退
- `utils/auth.js`：演示登录状态工具

## 当前对接状态

- 前端默认请求 `http://localhost:3000`
- 已适配后端统一响应格式：`{ code, data, message? }`
- 已验证接口：
  - `GET /api/health`
  - `GET /api/user/profile`
  - `GET /api/news`
  - `GET /api/checkin/today`
  - `POST /api/checkin/one-click`
- 如本地 SQLite 文件不可用，后端已增加内存库回退，便于演示联调

## REST API 约定

### `GET /api/user/profile`

```json
{
  "code": 200,
  "data": {
    "id": "user-1001",
    "name": "张阿姨",
    "avatar": "",
    "age": 67,
    "chronicTags": ["高血压", "糖尿病"]
  }
}
```

### `GET /api/home/banners`

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "title": "健康知识",
        "image": "",
        "link": "/pages/index/index"
      }
    ]
  }
}
```

### `GET /api/home/quick-stats`

```json
{
  "code": 200,
  "data": {
    "unreadMessageCount": 2,
    "weather": {
      "city": "上海",
      "temperature": "24",
      "condition": "多云"
    }
  }
}
```

### `GET /api/news?page=1&pageSize=10&keyword=血压`

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "title": "高血压患者日常饮食需要注意什么？",
        "summary": "高血压患者建议控制盐摄入...",
        "coverImage": "",
        "author": "李医生",
        "publishTime": "2026-04-20 10:30",
        "views": 1256
      }
    ],
    "total": 20
  }
}
```

### `GET /api/checkin/today`

```json
{
  "code": 200,
  "data": {
    "date": "2026-04-28",
    "checked": true,
    "checkinTime": "08:30",
    "items": {
      "bloodPressure": { "value": "126/82", "status": "normal" },
      "bloodSugar": { "value": "5.8", "status": "normal" },
      "weight": { "value": "65kg", "status": "normal" }
    }
  }
}
```

### `POST /api/checkin/one-click`

```json
{
  "code": 200,
  "data": {
    "success": true
  }
}
```

## 接真实后端时需要改的地方

1. 把 `utils/request.js` 里的 `BASE_URL` 改成实际服务地址。
2. 如接口返回格式不同，在 `utils/api.js` 里做字段映射。
3. 如果消息页、档案页、打卡页已存在，把首页里的占位跳转改成真实页面路由。
