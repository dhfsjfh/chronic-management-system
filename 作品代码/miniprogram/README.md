# 社区慢病管理小程序（患者端）

## 当前定位

患者端微信小程序，和 `server/`、`doctor-web` 保持统一演示链路：

- 登录（评委账号）
- 患者数据查看
- 血压/血糖展示
- AI 咨询与报告入口

## 联调配置

`utils/request.js` 中 `BASE_URL` 指向：

```text
http://127.0.0.1:3000
```

## 统一演示账号

- 评委账号（只读）：`13800138001 / 123`

首页已支持一键进入评委账号。

## 已对接主要接口

- `POST /api/auth/login`
- `GET /api/demo/status`
- `GET /api/patients`
- `GET /api/blood-sugar`
- `GET /api/blood-pressure`
- `POST /api/ai/chat`
- `GET /api/ai/report/:patientId`

## 注意事项

- 演示仅使用后端提供的安全示例数据
- 不在小程序端存储/暴露 Coze PAT token
