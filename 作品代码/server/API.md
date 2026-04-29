# 社区慢病管理后端 API 文档（最小版）

## 基础信息

- **Base URL**: `http://127.0.0.1:3000`
- **统一响应**：
  - 成功：`{ "code": 200, "data": ... }`
  - 失败：`{ "code": 4xx/5xx, "message": "..." }`

## 健康检查

### GET `/api/health`

返回服务状态与时间戳。

## 用户与认证

### POST `/api/auth/login`

Body：

```json
{ "phone": "13800138001", "password": "any" }
```

### GET `/api/auth/refresh`

### GET `/api/user/profile`

## 患者

### GET `/api/patients?page=1&pageSize=20&keyword=`

### GET `/api/patients/:id`

### POST `/api/patients`

### PUT `/api/patients/:id`

### DELETE `/api/patients/:id`

## 生命体征

### GET `/api/blood-sugar?patient_id=1&days=7`

### POST `/api/blood-sugar`

### GET `/api/blood-sugar/stats?patient_id=1`

### GET `/api/blood-pressure?patient_id=1&days=7`

### POST `/api/blood-pressure`

### GET `/api/blood-pressure/stats?patient_id=1`

## 预警

### GET `/api/alerts?status=&patient_id=`

### POST `/api/alerts/:id/process`

### GET `/api/alerts/rules`

## 回访

### GET `/api/followups?status=&patient_id=`

### POST `/api/followups`

### POST `/api/followups/:id/complete`

### POST `/api/followups/ai-call`

## 通知

### GET `/api/notifications?user_id=user-1001`

### POST `/api/notifications/read`

### POST `/api/notifications/send`

## 首页

### GET `/api/home/banners`

### GET `/api/home/quick-stats`

### GET `/api/news?page=1&pageSize=10&keyword=`

### GET `/api/checkin/today`

### POST `/api/checkin/one-click`

## 仪表盘

### GET `/api/dashboard/overview`

### GET `/api/dashboard/chronic-distribution`

### GET `/api/dashboard/trends?days=7`

## AI（Coze）

### GET `/api/ai/coze/status`

用于确认 PAT/Workspace/Bot/Workflow 是否配置完成。

如果 `workflowIdNeedsConfig=true`，说明 `COZE_WORKFLOW_ID` 与 `COZE_BOT_ID` 相同，**需要重新配置**（不要假设可用）。

### POST `/api/ai/chat`

Body：

```json
{ "message": "你好", "agentType": "doctor", "patientId": 1 }
```

### POST `/api/ai/agent`

Body：

```json
{ "agentType": "nutritionist", "patientId": 1, "task": "diet_plan", "params": { "goal": "控糖" } }
```

### POST `/api/ai/workflow/run`

Body：

```json
{ "patientId": 1, "workflowType": "weekly_report", "parameters": { "days": 7 } }
```

### GET `/api/ai/report/:patientId`

## 数据入库（新增）

- `ai_consultations`：记录 `/api/ai/chat`、`/api/ai/agent` 的请求/回复、patientId、agentType、conversationId、chatId、状态与错误
- `workflow_runs`：记录 `/api/ai/workflow/run` 的入参、结果、状态、patientId、workflowId

## Coze 页面/工作流对接接口

这些接口用于让 Coze 生成的医生端页面、工作流或 OpenClaw 自动化任务直接读写后端数据。演示环境默认不强制登录，生产环境建议在网关层增加签名、Token 白名单或内网访问限制。

### GET `/api/coze/status`

返回 Coze 对接接口状态。

### GET `/api/coze/overview`

返回医生端概览数据：患者数、预警数、今日回访数、最近预警、最近回访、慢病分布。

### GET `/api/coze/patients?page=1&pageSize=20&keyword=&riskLevel=`

返回 Coze 医生端患者列表，包含脱敏手机号、最新体征和风险等级。

### GET `/api/coze/patient/:id/summary`

返回单个患者摘要、最新血糖/血压、7 日统计、最近预警、最近回访。

### POST `/api/coze/health-data`

写入 Coze 或设备同步来的血糖/血压数据。血糖异常或血压异常会自动生成预警。

血糖 Body：

```json
{
  "patientId": 1,
  "type": "blood_sugar",
  "value": 8.2,
  "mealPeriod": "fasting",
  "recordTime": "2026-04-29 08:20",
  "source": "coze"
}
```

血压 Body：

```json
{
  "patientId": 1,
  "type": "blood_pressure",
  "systolic": 152,
  "diastolic": 96,
  "heartRate": 82,
  "recordTime": "2026-04-29 08:30",
  "source": "coze"
}
```

### POST `/api/coze/alerts`

写入 Coze 生成的 AI 预警。

```json
{
  "patientId": 1,
  "level": "medium",
  "type": "ai_warning",
  "title": "血糖异常提醒",
  "content": "患者今日空腹血糖偏高，建议医生复核。",
  "source": "coze"
}
```

### POST `/api/coze/followup-result`

写入或更新 Coze 外呼/回访结果。

```json
{
  "patientId": 1,
  "status": "completed",
  "result": "已完成",
  "notes": "患者已收到用药提醒",
  "source": "coze"
}
```

### POST `/api/coze/workflow-callback`

记录 Coze 工作流回调结果，落库到 `workflow_runs`。

```json
{
  "workflowId": "workflow_xxx",
  "runId": "run_xxx",
  "patientId": 1,
  "workflowType": "weekly_report",
  "status": "success",
  "input": {},
  "output": {}
}
```
