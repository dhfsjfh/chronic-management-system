# 给 Cursor 的完整指令：完善 Coze 接口与系统联通

请在 `/Users/leo/Desktop/慢病管理` 项目中继续开发，不要新建无关项目。

## 一、当前项目定位

这是“社区慢病管理系统”参赛项目，当前结构如下：

- `server/`：Node.js + Express + SQLite 后端，负责业务接口、数据库落库、Coze Bot/Workflow 调用
- `miniprogram/`：微信小程序患者端
- `作品代码/coze-page-export/`：Coze 页面导出的核心前端文件，包含 `index_v2.html` 和小程序核心文件
- `作品代码/patient-web-prototype/`：早期患者端 Web 原型，不要标注为医生端源码
- Coze 公开演示入口：`https://www.coze.cn/s/-LdnZbZJCI8/`

注意：Coze 公开页面是主要在线演示入口，访问范围受 Coze 分享和权限设置控制。本地代码主要用于后端、患者端、小程序端、核心页面文件提交和二次开发。

## 二、必须遵守的安全要求

1. 不要把真实 `COZE_PAT_TOKEN`、飞书 App Secret、OpenClaw token 写进源码、README 或提交材料。
2. `.env` 只能本地使用，提交材料里只允许 `.env.example`。
3. 评委演示密码统一为 `123`。
4. 评委账号只读：
   - 手机号：`13800138001`
   - 密码：`123`
5. 演示模式下禁止删除、关键修改、真实外呼、真实短信、真实医疗处方。
6. 所有公网演示数据必须是模拟数据，不能包含真实患者身份证、手机号、病历、联系方式。

## 三、当前已存在能力

后端已有这些接口和能力：

- 登录：`POST /api/auth/login`
- 患者：`GET /api/patients`、`GET /api/patients/:id`
- 血糖：`GET /api/blood-sugar`、`POST /api/blood-sugar`
- 血压：`GET /api/blood-pressure`、`POST /api/blood-pressure`
- 设备：`GET /api/devices`、`POST /api/devices/bind`
- 预警：`GET /api/alerts`、`POST /api/alerts/:id/process`
- 回访：`GET /api/followups`、`POST /api/followups`
- Coze 状态：`GET /api/ai/coze/status`
- Coze Bot 对话：`POST /api/ai/chat`
- Coze 多智能体：`POST /api/ai/agent`
- Coze Workflow：`POST /api/ai/workflow/run`
- 咨询记录：`GET /api/ai/consultations`
- Workflow 记录：`GET /api/ai/workflow-runs`

请先阅读：

- `server/server.js`
- `server/coze-client.js`
- `server/database.js`
- `server/.env.example`
- `作品代码/README.md`
- `参赛提交材料/提交信息填写表.md`

## 四、本次开发目标

补齐“Coze 工作流/页面可调用的业务接口”，让 Coze 可以通过统一接口读写数据，实现：

1. Coze 页面或工作流能查询系统概览
2. Coze 能查询患者列表和患者详情
3. Coze 能查询患者最新血糖、血压、预警、回访
4. Coze 能提交健康数据，并由后端落 SQLite
5. Coze 能创建预警记录
6. Coze 能写入 AI 回访/工作流回执
7. 所有 Coze 接口都返回统一 JSON，便于 Coze 工作流解析
8. 本地不可公网访问时，接口仍要有清晰状态提示

## 五、请新增 Coze 专用接口

在 `server/server.js` 中新增一组 `/api/coze/*` 接口。接口返回格式统一为：

```json
{
  "code": 200,
  "data": {},
  "message": "ok"
}
```

错误返回：

```json
{
  "code": 400,
  "message": "错误原因"
}
```

### 1. Coze 接口状态

`GET /api/coze/status`

返回：

```json
{
  "service": "community-chronic-disease-backend",
  "demoMode": true,
  "publicApiBaseUrl": "",
  "coze": {
    "tokenConfigured": true,
    "botConfigured": true,
    "workflowConfigured": false,
    "workflowIdNeedsConfig": true
  },
  "availableEndpoints": [
    "GET /api/coze/overview",
    "GET /api/coze/patients",
    "GET /api/coze/patient/:id/summary",
    "POST /api/coze/health-data",
    "POST /api/coze/alerts",
    "POST /api/coze/followup-result",
    "POST /api/coze/workflow-callback"
  ]
}
```

如果 `PUBLIC_API_BASE_URL` 为空，返回提示：`Coze 云端不能主动访问 localhost，请部署公网 API 或配置内网穿透地址。`

### 2. 系统概览

`GET /api/coze/overview`

返回患者数、今日打卡数、待处理预警数、待回访数、最近同步时间、演示模式状态。

### 3. 患者列表

`GET /api/coze/patients?keyword=&limit=20`

返回字段：

```json
{
  "list": [
    {
      "id": 1,
      "name": "张阿姨",
      "gender": "女",
      "age": 68,
      "phoneMasked": "138****8001",
      "chronicTags": ["高血压", "糖尿病"],
      "riskLevel": "medium"
    }
  ]
}
```

注意：Coze 公开演示不要返回完整手机号和身份证。

### 4. 患者摘要

`GET /api/coze/patient/:id/summary`

聚合返回：

- 患者基本信息
- 最新血糖
- 最新血压
- 最近 7 天血糖统计
- 最近 7 天血压统计
- 未处理预警
- 最近回访记录
- AI 建议摘要

### 5. 健康数据提交

`POST /api/coze/health-data`

请求：

```json
{
  "patientId": 1,
  "type": "blood_sugar",
  "value": 6.8,
  "mealPeriod": "fasting",
  "recordTime": "2026-04-29 08:20",
  "source": "coze",
  "notes": "早餐前"
}
```

或血压：

```json
{
  "patientId": 1,
  "type": "blood_pressure",
  "systolic": 142,
  "diastolic": 88,
  "heartRate": 76,
  "recordTime": "2026-04-29 08:20",
  "source": "coze",
  "notes": "家庭血压计"
}
```

要求：

- `type=blood_sugar` 时写入 `blood_sugar_records`
- `type=blood_pressure` 时写入 `blood_pressure_records`
- 根据阈值自动生成预警：
  - 空腹血糖 > 7.0 或餐后血糖 > 10.0，生成 warning
  - 血糖 >= 11.1，生成 danger
  - 收缩压 >= 140 或舒张压 >= 90，生成 warning
  - 收缩压 >= 160 或舒张压 >= 100，生成 danger
- 演示模式下可以允许写入“内存/演示库”，但不能触达真实数据

### 6. 创建预警

`POST /api/coze/alerts`

请求：

```json
{
  "patientId": 1,
  "alertType": "blood_sugar",
  "alertLevel": "warning",
  "content": "近三次空腹血糖偏高，建议社区医生回访。",
  "source": "coze_workflow"
}
```

写入 `alerts` 表。

### 7. 回访结果写入

`POST /api/coze/followup-result`

请求：

```json
{
  "patientId": 1,
  "followupType": "ai_call",
  "status": "completed",
  "result": "患者已确认按时服药，明天上午复测血压。",
  "notes": "Coze AI 回访生成",
  "source": "coze"
}
```

写入 `followups` 表；如果传了 `followupId`，则更新对应记录。

### 8. 工作流回调

`POST /api/coze/workflow-callback`

请求：

```json
{
  "patientId": 1,
  "workflowType": "health_risk_assessment",
  "workflowId": "xxx",
  "input": {},
  "output": {
    "riskLevel": "medium",
    "summary": "血糖控制一般，血压轻度偏高。",
    "suggestions": ["低盐饮食", "规律复测", "三天后回访"]
  },
  "status": "success"
}
```

写入 `workflow_runs` 表，并返回保存后的记录 id。

## 六、Coze 工作流建议补齐

请按下面 4 个工作流设计后端接口兼容参数。Coze 里如果还没建工作流，按这个 schema 建。

### workflow 1：健康数据入库

名称：`submit_health_data`

输入：

```json
{
  "patientId": "number",
  "type": "blood_sugar | blood_pressure",
  "value": "number",
  "systolic": "number",
  "diastolic": "number",
  "heartRate": "number",
  "mealPeriod": "fasting | after_meal | bedtime",
  "recordTime": "string",
  "notes": "string"
}
```

调用后端：`POST {PUBLIC_API_BASE_URL}/api/coze/health-data`

输出：

```json
{
  "saved": true,
  "recordId": 123,
  "alertCreated": true,
  "alertLevel": "warning",
  "message": "健康数据已保存"
}
```

### workflow 2：患者摘要查询

名称：`get_patient_summary`

输入：

```json
{ "patientId": "number" }
```

调用后端：`GET {PUBLIC_API_BASE_URL}/api/coze/patient/{patientId}/summary`

输出：患者摘要 JSON。

### workflow 3：风险评估

名称：`health_risk_assessment`

输入：

```json
{ "patientId": "number", "days": "number" }
```

流程：

1. 调用 `GET /api/coze/patient/:id/summary`
2. 让 Coze 总结风险等级、异常原因、建议
3. 调用 `POST /api/coze/workflow-callback` 写回 `workflow_runs`
4. 必要时调用 `POST /api/coze/alerts` 创建预警

输出：

```json
{
  "riskLevel": "low | medium | high",
  "summary": "string",
  "suggestions": ["string"],
  "needFollowup": true
}
```

### workflow 4：AI 回访记录

名称：`followup_result_sync`

输入：

```json
{
  "patientId": "number",
  "result": "string",
  "needDoctor": "boolean",
  "nextAction": "string"
}
```

调用后端：`POST /api/coze/followup-result`

输出：

```json
{
  "saved": true,
  "message": "回访结果已入库"
}
```

## 七、Coze Bot 提示词同步要求

请把后端 `AGENT_MAP` 和 Coze Bot 的提示词方向保持一致：

- `doctor`：社区全科医生，负责解释指标、给出就医/复测建议
- `nutritionist`：慢病营养师，负责饮食建议
- `exercise_coach`：康复运动教练，负责运动处方级建议，但不得替代医生诊断
- `supervisor`：健康监督员，负责风险汇总、回访提醒、预警分级

要求 Bot 输出尽量结构化：

```json
{
  "summary": "一句话总结",
  "riskLevel": "low | medium | high",
  "suggestions": ["建议1", "建议2"],
  "needDoctor": false,
  "nextAction": "建议明早空腹复测血糖"
}
```

## 八、后端实现要求

1. 所有新增接口写在 `server/server.js`，可以抽 helper，但不要大改现有结构。
2. 使用已有 `db`、`ok()`、`fail()`、`safeJson()`、`computeSugarStats()`、`computeBPStats()`。
3. 新增 helper：
   - `maskPhone(phone)`
   - `getRiskLevel(patientId)`
   - `createAlertIfNeeded({ patientId, type, value, systolic, diastolic, mealPeriod })`
   - `getLatestPatientVitals(patientId)`
4. 新增接口要兼容 camelCase 和 snake_case 入参，例如 `patientId` / `patient_id` 都能识别。
5. 不要引入大型新依赖。
6. 不要删除旧接口，避免小程序和演示系统断掉。
7. 更新 `server/README.md`，列出新增 `/api/coze/*` 接口。
8. 更新 `作品代码/README.md` 和 `参赛提交材料/部署与启动说明.md` 中 Coze 接口说明。

## 九、测试要求

请新增或更新 `server/scripts/smoke-test.js`，至少验证：

1. `GET /api/coze/status`
2. `GET /api/coze/overview`
3. `GET /api/coze/patients`
4. `GET /api/coze/patient/1/summary`
5. `POST /api/coze/health-data` 提交血糖
6. `POST /api/coze/health-data` 提交血压
7. `POST /api/coze/alerts`
8. `POST /api/coze/followup-result`
9. `POST /api/coze/workflow-callback`
10. `GET /api/ai/coze/status`

运行：

```bash
cd /Users/leo/Desktop/慢病管理/server
npm install
DEMO_MODE=true JUDGE_ACCOUNT_PASSWORD=123 npm start
```

另开终端：

```bash
cd /Users/leo/Desktop/慢病管理/server
npm run smoke
```

如果 `npm run smoke` 不存在，就在 `package.json` 加：

```json
{
  "scripts": {
    "start": "node server.js",
    "smoke": "node scripts/smoke-test.js"
  }
}
```

## 十、验收标准

完成后请输出：

1. 修改了哪些文件
2. 新增了哪些 `/api/coze/*` 接口
3. 每个接口的请求/响应示例
4. smoke test 结果
5. Coze 平台还需要手动配置哪些内容
6. 如果 `PUBLIC_API_BASE_URL` 为空，请明确说明 Coze 云端不能访问本机 localhost，需要公网部署或内网穿透
7. 确认没有泄露真实 token、没有提交 `.env`、没有提交 `node_modules`

## 十一、不要做的事

1. 不要把 Coze PAT 写到 `config/coze-config.json` 或 README。
2. 不要把公开演示页说成本地医生端源码。
3. 不要移除现有小程序接口。
4. 不要把演示系统改成需要真实医疗数据才能运行。
5. 不要把评委账号改成可写权限。
