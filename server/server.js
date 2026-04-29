const express = require('express');
const cors = require('cors');
const path = require('path');
const { loadEnv } = require('./env');
loadEnv();
const { initDatabase, getDatabase } = require('./database');
const {
  callCozeChat,
  callCozeBot,
  runCozeWorkflow,
  getCozeStatus,
  AGENT_MAP
} = require('./coze-client');

const app = express();
const PORT = process.env.PORT || 3000;
const CLOUD_HOST = process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.FLY_APP_NAME || process.env.PUBLIC_API_BASE_URL;
const HOST = process.env.HOST || (CLOUD_HOST ? '0.0.0.0' : '127.0.0.1');
const DEMO_MODE = String(process.env.DEMO_MODE || '').toLowerCase() === 'true';
const JUDGE_ACCOUNT_PHONE = process.env.JUDGE_ACCOUNT_PHONE || '13800138001';
const JUDGE_ACCOUNT_PASSWORD = process.env.JUDGE_ACCOUNT_PASSWORD || '123';
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || !ALLOWED_ORIGINS.length || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin denied'));
  }
}));
app.use(express.json());

const db = initDatabase();
const BOOT_AT = Date.now();

// ========== Helpers ==========
function ok(data) { return { code: 200, data }; }
function fail(msg, status = 500) { return { code: status, message: msg }; }
function cozeOk(data, message = 'ok') { return { code: 200, data, message }; }
function cozeFail(message, status = 400) { return { code: status, message }; }
function today() { return new Date().toISOString().slice(0, 10); }
function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function safeJson(obj) {
  try { return JSON.stringify(obj ?? {}); } catch (_) { return ''; }
}

function firstDefined(...values) {
  return values.find(v => v !== undefined && v !== null && v !== '');
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h${String(m).padStart(2, '0')}m${String(sec).padStart(2, '0')}s`;
}

function mb(bytes) {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

function logHeartbeat() {
  const mem = process.memoryUsage();
  console.log(
    `[heartbeat] uptime=${formatUptime(Date.now() - BOOT_AT)} rss=${mb(mem.rss)}MB heapUsed=${mb(mem.heapUsed)}MB`
  );
}

function issueToken(user) {
  // Demo-grade token (not cryptographically signed). Used only for judge/read-only gating.
  const payload = {
    id: user.id,
    role: user.role,
    phone: user.phone || '',
    name: user.name || '',
    iat: Date.now()
  };
  const base = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `demo.${base}`;
}

function parseAuth(req) {
  const header = req.headers.authorization || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1] : '';
  if (!token.startsWith('demo.')) return null;
  const raw = token.slice('demo.'.length);
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const payload = JSON.parse(json);
    if (!payload || typeof payload !== 'object') return null;
    return payload;
  } catch {
    return null;
  }
}

function attachUser(req, res, next) {
  req.user = parseAuth(req);
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json(fail('未登录', 401));
  next();
}

function forbidMutation(req, res, next) {
  const role = req.user?.role || '';
  if (role === 'judge') {
    return res.status(403).json(fail('评委只读账号：不可进行修改/删除操作', 403));
  }
  if (DEMO_MODE) {
    return res.status(403).json(fail('演示模式下不可操作', 403));
  }
  next();
}

function requireCozeWebhookSecret(req, res, next) {
  if (String(process.env.PUBLIC_API_READONLY || '').toLowerCase() === 'true') {
    return res.status(403).json(cozeFail('Public demo API is read-only', 403));
  }
  const expected = process.env.COZE_WEBHOOK_SECRET || '';
  if (!expected) return next();
  const actual = req.headers['x-coze-webhook-secret'] || req.headers['x-api-key'] || req.query.secret || '';
  if (String(actual) !== String(expected)) {
    return res.status(401).json(cozeFail('Coze webhook secret invalid', 401));
  }
  next();
}

app.use(attachUser);

function insertAiConsultation({
  patientId,
  agentType,
  conversationId,
  chatId,
  requestText,
  responseText,
  requestJson,
  responseJson,
  status,
  errorMessage
}) {
  try {
    db.prepare(
      `INSERT INTO ai_consultations
        (patient_id, agent_type, conversation_id, chat_id, request_text, response_text, request_json, response_json, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      patientId || null,
      agentType || 'doctor',
      conversationId || '',
      chatId || '',
      requestText || '',
      responseText || '',
      requestJson || '',
      responseJson || '',
      status || 'success',
      errorMessage || ''
    );
  } catch (err) {
    console.warn('insertAiConsultation failed:', err.message);
  }
}

function insertWorkflowRun({
  patientId,
  workflowType,
  workflowId,
  inputJson,
  outputJson,
  status,
  errorMessage
}) {
  try {
    db.prepare(
      `INSERT INTO workflow_runs
        (patient_id, workflow_type, workflow_id, input_json, output_json, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      patientId || null,
      workflowType || 'default',
      workflowId || '',
      inputJson || '',
      outputJson || '',
      status || 'success',
      errorMessage || ''
    );
  } catch (err) {
    console.warn('insertWorkflowRun failed:', err.message);
  }
}

// ================================================================
// 🔐 认证模块
// ================================================================
app.post('/api/auth/login', (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone) return res.status(400).json(fail('手机号不能为空', 400));
    // Demo mode: allow judge login with fixed credentials
    if (DEMO_MODE && String(phone) === String(JUDGE_ACCOUNT_PHONE)) {
      if (String(password || '') !== String(JUDGE_ACCOUNT_PASSWORD)) {
        return res.status(401).json(fail('账号或密码错误', 401));
      }
      const judge = { id: 'judge-1001', name: '评委账号', role: 'judge', phone: JUDGE_ACCOUNT_PHONE, department: '演示' };
      return res.json(ok({ token: issueToken(judge), user: judge, demoMode: true }));
    }

    // Normal: login as existing user by phone (demo-grade)
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!user) return res.status(401).json(fail('账号不存在', 401));
    const u = {
      id: user.id, name: user.name, avatar: user.avatar,
      role: user.role, phone: user.phone, department: user.department
    };
    res.json(ok({ token: issueToken(u), user: u, demoMode: DEMO_MODE }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.get('/api/auth/refresh', (req, res) => {
  if (!req.user) return res.status(401).json(fail('未登录', 401));
  const refreshed = {
    id: req.user.id,
    name: req.user.name,
    role: req.user.role,
    phone: req.user.phone
  };
  res.json(ok({ token: issueToken(refreshed) }));
});

app.get('/api/user/profile', (req, res) => {
  try {
    const userId = req.user?.id || 'user-1001';
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json(fail('用户不存在', 404));
    res.json(ok({
      id: user.id, name: user.name, avatar: user.avatar || '',
      age: user.age, chronicTags: JSON.parse(user.chronic_tags || '[]'),
      role: user.role, phone: user.phone
    }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

// ================================================================
// 🎭 演示状态
// ================================================================
app.get('/api/demo/status', (req, res) => {
  const coze = getCozeStatus();
  res.json(ok({
    demoMode: DEMO_MODE,
    judgeAccountEnabled: DEMO_MODE,
    safeData: true,
    cozeConfigured: Boolean(coze.tokenConfigured && (coze.botConfigured || coze.workspaceConfigured))
  }));
});

// ================================================================
// 👤 患者管理
// ================================================================
app.get('/api/patients', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 20));
    const keyword = (req.query.keyword || '').trim();

    let countSql = 'SELECT COUNT(*) as total FROM patients';
    let dataSql = 'SELECT * FROM patients';
    const params = [];

    if (keyword) {
      const like = `%${keyword}%`;
      const where = ' WHERE name LIKE ? OR phone LIKE ? OR address LIKE ?';
      countSql += where; dataSql += where;
      params.push(like, like, like);
    }
    dataSql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    const offset = (page - 1) * pageSize;

    const total = db.prepare(countSql).get(...params).total;
    const rows = db.prepare(dataSql).all(...params, pageSize, offset);

    res.json(ok({
      list: rows.map(r => ({
        id: r.id, name: r.name, gender: r.gender, age: r.age,
        phone: r.phone, address: r.address,
        chronicTags: JSON.parse(r.chronic_tags || '[]'),
        doctorId: r.doctor_id, avatar: r.avatar,
        createdAt: r.created_at
      })),
      total, page, pageSize
    }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.get('/api/patients/:id', (req, res) => {
  try {
    const p = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!p) return res.status(404).json(fail('患者不存在', 404));
    res.json(ok({
      id: p.id, name: p.name, gender: p.gender, age: p.age,
      phone: p.phone, idCard: p.id_card, address: p.address,
      chronicTags: JSON.parse(p.chronic_tags || '[]'),
      doctorId: p.doctor_id, avatar: p.avatar,
      createdAt: p.created_at, updatedAt: p.updated_at
    }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.post('/api/patients', (req, res) => {
  try {
    if (DEMO_MODE || req.user?.role === 'judge') return res.status(403).json(fail('演示模式下不可操作', 403));
    const { name, gender, age, phone, idCard, address, chronicTags, doctorId } = req.body;
    if (!name) return res.status(400).json(fail('患者姓名不能为空', 400));
    const result = db.prepare(
      `INSERT INTO patients (name, gender, age, phone, id_card, address, chronic_tags, doctor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(name, gender || '', age || 0, phone || '', idCard || '', address || '',
         JSON.stringify(chronicTags || []), doctorId || '');
    res.json(ok({ id: result.lastInsertRowid, message: '创建成功' }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.put('/api/patients/:id', (req, res) => {
  try {
    if (DEMO_MODE || req.user?.role === 'judge') return res.status(403).json(fail('演示模式下不可操作', 403));
    const { name, gender, age, phone, address, chronicTags, doctorId } = req.body;
    db.prepare(
      `UPDATE patients SET name=?, gender=?, age=?, phone=?, address=?, chronic_tags=?, doctor_id=?, updated_at=datetime('now','localtime') WHERE id=?`
    ).run(name, gender, age, phone, address, JSON.stringify(chronicTags || []), doctorId, req.params.id);
    res.json(ok({ message: '更新成功' }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.delete('/api/patients/:id', (req, res) => {
  try {
    return res.status(403).json(fail('演示模式下不可操作', 403));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

// ================================================================
// 🩸 血糖管理
// ================================================================
app.get('/api/blood-sugar', (req, res) => {
  try {
    const patientId = parseInt(req.query.patient_id) || 0;
    const days = parseInt(req.query.days) || 7;
    if (!patientId) return res.status(400).json(fail('patient_id 是必填参数', 400));
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const rows = db.prepare(
      'SELECT * FROM blood_sugar_records WHERE patient_id = ? AND record_time >= ? ORDER BY record_time DESC'
    ).all(patientId, sinceStr);

    res.json(ok({
      list: rows.map(r => ({
        id: r.id, patientId: r.patient_id, value: r.value,
        recordTime: r.record_time, mealPeriod: r.meal_period,
        notes: r.notes, createdAt: r.created_at
      })),
      total: rows.length,
      stats: computeSugarStats(rows)
    }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.post('/api/blood-sugar', (req, res) => {
  try {
    if (DEMO_MODE || req.user?.role === 'judge') return res.status(403).json(fail('演示模式下不可操作', 403));
    const { patientId, value, recordTime, mealPeriod, notes } = req.body;
    if (!patientId || !value) return res.status(400).json(fail('patient_id 和 value 是必填参数', 400));
    db.prepare(
      'INSERT INTO blood_sugar_records (patient_id, value, record_time, meal_period, notes) VALUES (?, ?, ?, ?, ?)'
    ).run(patientId, value, recordTime || now(), mealPeriod || 'fasting', notes || '');
    res.json(ok({ message: '血糖记录已保存' }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.get('/api/blood-sugar/stats', (req, res) => {
  try {
    const patientId = parseInt(req.query.patient_id) || 0;
    if (!patientId) return res.status(400).json(fail('patient_id 是必填参数', 400));
    const rows = db.prepare(
      'SELECT * FROM blood_sugar_records WHERE patient_id = ? ORDER BY record_time DESC'
    ).all(patientId);
    res.json(ok(computeSugarStats(rows)));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

function computeSugarStats(rows) {
  if (!rows.length) return { avg: 0, min: 0, max: 0, normalRate: 0, total: 0 };
  const values = rows.map(r => r.value);
  const normal = values.filter(v => v >= 3.9 && v <= 7.0);
  return {
    avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
    min: Math.min(...values), max: Math.max(...values),
    normalRate: Math.round((normal.length / values.length) * 100),
    total: values.length
  };
}

// ================================================================
// 🩺 血压管理
// ================================================================
app.get('/api/blood-pressure', (req, res) => {
  try {
    const patientId = parseInt(req.query.patient_id) || 0;
    const days = parseInt(req.query.days) || 7;
    if (!patientId) return res.status(400).json(fail('patient_id 是必填参数', 400));
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const rows = db.prepare(
      'SELECT * FROM blood_pressure_records WHERE patient_id = ? AND record_time >= ? ORDER BY record_time DESC'
    ).all(patientId, sinceStr);

    res.json(ok({
      list: rows.map(r => ({
        id: r.id, patientId: r.patient_id,
        systolic: r.systolic, diastolic: r.diastolic, heartRate: r.heart_rate,
        recordTime: r.record_time, notes: r.notes, createdAt: r.created_at
      })),
      total: rows.length,
      stats: computeBPStats(rows)
    }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.post('/api/blood-pressure', (req, res) => {
  try {
    if (DEMO_MODE || req.user?.role === 'judge') return res.status(403).json(fail('演示模式下不可操作', 403));
    const { patientId, systolic, diastolic, heartRate, recordTime, notes } = req.body;
    if (!patientId || !systolic || !diastolic) {
      return res.status(400).json(fail('patient_id, systolic, diastolic 是必填参数', 400));
    }
    db.prepare(
      'INSERT INTO blood_pressure_records (patient_id, systolic, diastolic, heart_rate, record_time, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(patientId, systolic, diastolic, heartRate || 0, recordTime || now(), notes || '');
    res.json(ok({ message: '血压记录已保存' }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.get('/api/blood-pressure/stats', (req, res) => {
  try {
    const patientId = parseInt(req.query.patient_id) || 0;
    if (!patientId) return res.status(400).json(fail('patient_id 是必填参数', 400));
    const rows = db.prepare(
      'SELECT * FROM blood_pressure_records WHERE patient_id = ? ORDER BY record_time DESC'
    ).all(patientId);
    res.json(ok(computeBPStats(rows)));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

function computeBPStats(rows) {
  if (!rows.length) return { avgSystolic: 0, avgDiastolic: 0, minSystolic: 0, maxSystolic: 0, normalRate: 0, total: 0 };
  const systs = rows.map(r => r.systolic);
  const diasts = rows.map(r => r.diastolic);
  const normal = rows.filter(r => r.systolic < 140 && r.diastolic < 90);
  return {
    avgSystolic: Math.round(systs.reduce((a, b) => a + b, 0) / systs.length),
    avgDiastolic: Math.round(diasts.reduce((a, b) => a + b, 0) / diasts.length),
    minSystolic: Math.min(...systs), maxSystolic: Math.max(...systs),
    normalRate: Math.round((normal.length / rows.length) * 100),
    total: rows.length
  };
}

function maskPhone(phone) {
  const s = String(phone || '');
  if (s.length < 7) return s ? '****' : '';
  return `${s.slice(0, 3)}****${s.slice(-4)}`;
}

function normalizePatient(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    age: row.age,
    phoneMasked: maskPhone(row.phone),
    chronicTags: JSON.parse(row.chronic_tags || '[]'),
    doctorId: row.doctor_id,
    avatar: row.avatar || '',
    createdAt: row.created_at
  };
}

function getLatestPatientVitals(patientId) {
  const latestSugar = db.prepare(
    'SELECT * FROM blood_sugar_records WHERE patient_id = ? ORDER BY record_time DESC, id DESC LIMIT 1'
  ).get(patientId);
  const latestPressure = db.prepare(
    'SELECT * FROM blood_pressure_records WHERE patient_id = ? ORDER BY record_time DESC, id DESC LIMIT 1'
  ).get(patientId);
  return {
    bloodSugar: latestSugar ? {
      id: latestSugar.id,
      value: latestSugar.value,
      mealPeriod: latestSugar.meal_period,
      recordTime: latestSugar.record_time,
      notes: latestSugar.notes || ''
    } : null,
    bloodPressure: latestPressure ? {
      id: latestPressure.id,
      systolic: latestPressure.systolic,
      diastolic: latestPressure.diastolic,
      heartRate: latestPressure.heart_rate,
      recordTime: latestPressure.record_time,
      notes: latestPressure.notes || ''
    } : null
  };
}

function getRiskLevel(patientId) {
  const alerts = db.prepare(
    "SELECT alert_level FROM alerts WHERE patient_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 20"
  ).all(patientId);
  if (alerts.some(a => a.alert_level === 'danger' || a.alert_level === 'high')) return 'high';
  if (alerts.some(a => a.alert_level === 'warning' || a.alert_level === 'medium')) return 'medium';
  const vitals = getLatestPatientVitals(patientId);
  if (vitals.bloodPressure && (vitals.bloodPressure.systolic >= 160 || vitals.bloodPressure.diastolic >= 100)) return 'high';
  if (vitals.bloodSugar && vitals.bloodSugar.value >= 11.1) return 'high';
  if (vitals.bloodPressure && (vitals.bloodPressure.systolic >= 140 || vitals.bloodPressure.diastolic >= 90)) return 'medium';
  if (vitals.bloodSugar && vitals.bloodSugar.value > 7.0) return 'medium';
  return 'low';
}

function createAlertIfNeeded({ patientId, type, value, systolic, diastolic, mealPeriod, source }) {
  let alertLevel = '';
  let content = '';
  if (type === 'blood_sugar') {
    const n = Number(value);
    const upper = mealPeriod === 'fasting' ? 7.0 : 10.0;
    if (n >= 11.1) {
      alertLevel = 'danger';
      content = `血糖 ${n} mmol/L 达到高危阈值，请尽快复测并联系社区医生。`;
    } else if (n > upper) {
      alertLevel = 'warning';
      content = `血糖 ${n} mmol/L 偏高，建议记录饮食并安排随访。`;
    }
  }
  if (type === 'blood_pressure') {
    const sys = Number(systolic);
    const dia = Number(diastolic);
    if (sys >= 160 || dia >= 100) {
      alertLevel = 'danger';
      content = `血压 ${sys}/${dia} mmHg 达到高危阈值，请尽快复测并联系社区医生。`;
    } else if (sys >= 140 || dia >= 90) {
      alertLevel = 'warning';
      content = `血压 ${sys}/${dia} mmHg 偏高，建议继续监测并安排随访。`;
    }
  }
  if (!alertLevel) return null;
  const result = db.prepare(
    'INSERT INTO alerts (patient_id, alert_type, alert_level, content, status) VALUES (?, ?, ?, ?, ?)'
  ).run(patientId, type, alertLevel, `${content}${source ? ` 来源：${source}` : ''}`, 'pending');
  return { id: result.lastInsertRowid, alertLevel, content };
}

// ================================================================
// 📱 设备管理
// ================================================================
app.get('/api/devices', (req, res) => {
  try {
    const patientId = parseInt(req.query.patient_id) || 0;
    let rows;
    if (patientId) {
      rows = db.prepare('SELECT * FROM devices WHERE patient_id = ? ORDER BY bind_time DESC').all(patientId);
    } else {
      rows = db.prepare('SELECT * FROM devices ORDER BY bind_time DESC').all();
    }
    res.json(ok(rows.map(d => ({
      id: d.id, patientId: d.patient_id, deviceName: d.device_name,
      deviceType: d.device_type, deviceSn: d.device_sn,
      bindTime: d.bind_time, lastSyncTime: d.last_sync_time, status: d.status
    }))));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.post('/api/devices/bind', (req, res) => {
  try {
    if (DEMO_MODE || req.user?.role === 'judge') return res.status(403).json(fail('演示模式下不可操作', 403));
    const { patientId, deviceName, deviceType, deviceSn } = req.body;
    if (!patientId || !deviceName || !deviceType) {
      return res.status(400).json(fail('patient_id, device_name, device_type 是必填参数', 400));
    }
    const result = db.prepare(
      'INSERT INTO devices (patient_id, device_name, device_type, device_sn) VALUES (?, ?, ?, ?)'
    ).run(patientId, deviceName, deviceType, deviceSn || '');
    res.json(ok({ id: result.lastInsertRowid, message: '绑定成功' }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.post('/api/devices/:id/sync', (req, res) => {
  try {
    if (DEMO_MODE || req.user?.role === 'judge') return res.status(403).json(fail('演示模式下不可操作', 403));
    db.prepare("UPDATE devices SET last_sync_time = datetime('now','localtime') WHERE id = ?")
      .run(req.params.id);
    res.json(ok({ message: '同步成功' }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

// ================================================================
// ⚠️ 预警管理
// ================================================================
app.get('/api/alerts', (req, res) => {
  try {
    const status = req.query.status || '';
    const patientId = parseInt(req.query.patient_id) || 0;
    let sql = 'SELECT a.*, p.name as patient_name FROM alerts a LEFT JOIN patients p ON a.patient_id = p.id WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND a.status = ?'; params.push(status); }
    if (patientId) { sql += ' AND a.patient_id = ?'; params.push(patientId); }
    sql += ' ORDER BY a.created_at DESC';
    const rows = db.prepare(sql).all(...params);
    res.json(ok(rows.map(r => ({
      id: r.id, patientId: r.patient_id, patientName: r.patient_name,
      alertType: r.alert_type, alertLevel: r.alert_level,
      content: r.content, status: r.status,
      createdAt: r.created_at, processedAt: r.processed_at
    }))));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.post('/api/alerts/:id/process', (req, res) => {
  try {
    if (DEMO_MODE || req.user?.role === 'judge') return res.status(403).json(fail('演示模式下不可操作', 403));
    const { processorId, result } = req.body;
    db.prepare(
      "UPDATE alerts SET status='processed', processed_at=datetime('now','localtime'), processor_id=? WHERE id=?"
    ).run(processorId || 'doctor-1001', req.params.id);
    res.json(ok({ message: '预警已处理' }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

// Alert rules endpoint (placeholder for now - returning static safety thresholds)
app.get('/api/alerts/rules', (req, res) => {
  res.json(ok({
    bloodPressure: { systolicUpper: 140, diastolicUpper: 90, dangerSystolic: 160, dangerDiastolic: 100 },
    bloodSugar: { fastingUpper: 7.0, afterMealUpper: 10.0, dangerUpper: 11.1 },
    heartRate: { min: 60, max: 100 }
  }));
});

// ================================================================
// 📞 回访管理
// ================================================================
app.get('/api/followups', (req, res) => {
  try {
    const status = req.query.status || '';
    const patientId = parseInt(req.query.patient_id) || 0;
    let sql = 'SELECT f.*, p.name as patient_name, p.phone as patient_phone FROM followups f LEFT JOIN patients p ON f.patient_id = p.id WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND f.status = ?'; params.push(status); }
    if (patientId) { sql += ' AND f.patient_id = ?'; params.push(patientId); }
    sql += ' ORDER BY f.created_at DESC';
    const rows = db.prepare(sql).all(...params);
    res.json(ok(rows.map(r => ({
      id: r.id, patientId: r.patient_id, patientName: r.patient_name, patientPhone: r.patient_phone,
      followupType: r.followup_type, status: r.status,
      scheduledTime: r.scheduled_time, completedTime: r.completed_time,
      result: r.result, notes: r.notes, createdAt: r.created_at
    }))));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.post('/api/followups', (req, res) => {
  try {
    if (DEMO_MODE || req.user?.role === 'judge') return res.status(403).json(fail('演示模式下不可操作', 403));
    const { patientId, followupType, scheduledTime, notes } = req.body;
    if (!patientId) return res.status(400).json(fail('patient_id 是必填参数', 400));
    const result = db.prepare(
      'INSERT INTO followups (patient_id, followup_type, scheduled_time, notes) VALUES (?, ?, ?, ?)'
    ).run(patientId, followupType || 'phone', scheduledTime || '', notes || '');
    res.json(ok({ id: result.lastInsertRowid, message: '回访已创建' }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.post('/api/followups/:id/complete', (req, res) => {
  try {
    if (DEMO_MODE || req.user?.role === 'judge') return res.status(403).json(fail('演示模式下不可操作', 403));
    const { result, notes } = req.body;
    db.prepare(
      "UPDATE followups SET status='completed', completed_time=datetime('now','localtime'), result=?, notes=? WHERE id=?"
    ).run(result || '', notes || '', req.params.id);
    res.json(ok({ message: '回访已完成' }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

// AI 外呼（placeholder - would integrate with real call center API）
app.post('/api/followups/ai-call', (req, res) => {
  try {
    if (DEMO_MODE || req.user?.role === 'judge') return res.status(403).json(fail('演示模式下不可操作', 403));
    const { patientId, template } = req.body;
    if (!patientId) return res.status(400).json(fail('patient_id 是必填参数', 400));
    // Create a followup record with AI call type
    const result = db.prepare(
      "INSERT INTO followups (patient_id, followup_type, status, notes) VALUES (?, 'ai_call', 'pending', ?)"
    ).run(patientId, template || 'AI 自动外呼回访');
    res.json(ok({ id: result.lastInsertRowid, message: 'AI外呼任务已创建' }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

// ================================================================
// 🔌 Coze 专用业务接口（供 Coze 页面 / 工作流调用）
// ================================================================
app.get('/api/coze/status', (req, res) => {
  const publicApiBaseUrl = (process.env.PUBLIC_API_BASE_URL || '').trim();
  const coze = getCozeStatus();
  const ready = coze.tokenConfigured && coze.botConfigured && coze.workflowConfigured && !coze.workflowIdNeedsConfig;
  res.json(cozeOk({
    service: 'community-chronic-disease-backend',
    ready,
    demoMode: DEMO_MODE,
    publicApiReadonly: String(process.env.PUBLIC_API_READONLY || '').toLowerCase() === 'true',
    publicApiBaseUrl,
    coze: {
      tokenConfigured: coze.tokenConfigured,
      botConfigured: coze.botConfigured,
      workflowConfigured: coze.workflowConfigured,
      workflowIdNeedsConfig: coze.workflowIdNeedsConfig
    },
    availableEndpoints: [
      'GET /api/coze/overview',
      'GET /api/coze/patients',
      'GET /api/coze/patient/:id/summary',
      'POST /api/coze/health-data',
      'POST /api/coze/alerts',
      'POST /api/coze/followup-result',
      'POST /api/coze/workflow-callback'
    ],
    note: publicApiBaseUrl
      ? 'Coze 可通过 PUBLIC_API_BASE_URL 调用后端。'
      : 'Coze 云端不能主动访问 localhost，请部署公网 API 或配置内网穿透地址。'
  }));
});

app.get('/api/coze/overview', (req, res) => {
  try {
    const patientCount = db.prepare('SELECT COUNT(*) as c FROM patients').get().c;
    const todayCheckinCount = db.prepare('SELECT COUNT(*) as c FROM checkins WHERE date = ?').get(today()).c;
    const pendingAlertCount = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE status='pending'").get().c;
    const pendingFollowupCount = db.prepare("SELECT COUNT(*) as c FROM followups WHERE status='pending'").get().c;
    const latestWorkflow = db.prepare('SELECT created_at FROM workflow_runs ORDER BY created_at DESC LIMIT 1').get();
    const recentAlerts = db.prepare(`
      SELECT a.*, p.name as patient_name
      FROM alerts a
      LEFT JOIN patients p ON p.id = a.patient_id
      ORDER BY a.created_at DESC
      LIMIT 5
    `).all();
    const recentFollowups = db.prepare(`
      SELECT f.*, p.name as patient_name
      FROM followups f
      LEFT JOIN patients p ON p.id = f.patient_id
      ORDER BY f.scheduled_time DESC, f.created_at DESC
      LIMIT 5
    `).all();
    const chronicDist = {};
    for (const row of db.prepare('SELECT chronic_tags FROM patients').all()) {
      for (const tag of JSON.parse(row.chronic_tags || '[]')) {
        chronicDist[tag] = (chronicDist[tag] || 0) + 1;
      }
    }
    const chronicDistribution = Object.entries(chronicDist)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const stats = {
      patientCount,
      todayCheckinCount,
      pendingAlertCount,
      pendingFollowupCount
    };
    res.json(cozeOk({
      patientCount,
      todayCheckinCount,
      pendingAlertCount,
      pendingFollowupCount,
      stats,
      recentAlerts,
      recentFollowups,
      chronicDistribution,
      latestSyncTime: latestWorkflow?.created_at || '',
      demoMode: DEMO_MODE
    }));
  } catch (err) {
    res.status(500).json(cozeFail(err.message, 500));
  }
});

app.get('/api/coze/patients', (req, res) => {
  try {
    const keyword = String(req.query.keyword || '').trim();
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    let sql = 'SELECT * FROM patients';
    const params = [];
    if (keyword) {
      sql += ' WHERE name LIKE ? OR phone LIKE ? OR address LIKE ?';
      const like = `%${keyword}%`;
      params.push(like, like, like);
    }
    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(limit);
    const rows = db.prepare(sql).all(...params);
    res.json(cozeOk({
      list: rows.map(row => ({
        ...normalizePatient(row),
        riskLevel: getRiskLevel(row.id)
      }))
    }));
  } catch (err) {
    res.status(500).json(cozeFail(err.message, 500));
  }
});

app.get('/api/coze/patient/:id/summary', (req, res) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) return res.status(404).json(cozeFail('患者不存在', 404));

    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceStr = since.toISOString().slice(0, 10);
    const sugars = db.prepare(
      'SELECT * FROM blood_sugar_records WHERE patient_id = ? AND record_time >= ? ORDER BY record_time DESC'
    ).all(patientId, sinceStr);
    const pressures = db.prepare(
      'SELECT * FROM blood_pressure_records WHERE patient_id = ? AND record_time >= ? ORDER BY record_time DESC'
    ).all(patientId, sinceStr);
    const alerts = db.prepare(
      "SELECT * FROM alerts WHERE patient_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 10"
    ).all(patientId);
    const followups = db.prepare(
      'SELECT * FROM followups WHERE patient_id = ? ORDER BY created_at DESC LIMIT 5'
    ).all(patientId);
    const latestAi = db.prepare(
      'SELECT response_text, created_at FROM ai_consultations WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(patientId);

    res.json(cozeOk({
      patient: normalizePatient(patient),
      riskLevel: getRiskLevel(patientId),
      latestVitals: getLatestPatientVitals(patientId),
      sevenDayStats: {
        bloodSugar: computeSugarStats(sugars),
        bloodPressure: computeBPStats(pressures)
      },
      pendingAlerts: alerts.map(a => ({
        id: a.id,
        alertType: a.alert_type,
        alertLevel: a.alert_level,
        content: a.content,
        createdAt: a.created_at
      })),
      recentFollowups: followups.map(f => ({
        id: f.id,
        followupType: f.followup_type,
        status: f.status,
        scheduledTime: f.scheduled_time || '',
        completedTime: f.completed_time || '',
        result: f.result || '',
        notes: f.notes || '',
        createdAt: f.created_at
      })),
      aiSuggestion: latestAi?.response_text || generateHealthSummary(patient, sugars, pressures)
    }));
  } catch (err) {
    res.status(500).json(cozeFail(err.message, 500));
  }
});

app.post('/api/coze/health-data', requireCozeWebhookSecret, (req, res) => {
  try {
    const patientId = parseInt(firstDefined(req.body.patientId, req.body.patient_id), 10);
    const type = String(firstDefined(req.body.type, req.body.dataType, req.body.data_type) || '');
    const recordTime = firstDefined(req.body.recordTime, req.body.record_time) || `${today()} ${now()}`;
    const notes = firstDefined(req.body.notes, req.body.note) || '';
    const source = firstDefined(req.body.source, 'coze') || 'coze';
    if (!patientId) return res.status(400).json(cozeFail('patientId 是必填参数', 400));
    const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(patientId);
    if (!patient) return res.status(404).json(cozeFail('患者不存在', 404));

    let recordId;
    if (type === 'blood_sugar') {
      const value = Number(firstDefined(req.body.value, req.body.bloodSugar, req.body.blood_sugar));
      if (!Number.isFinite(value)) return res.status(400).json(cozeFail('血糖 value 是必填数字', 400));
      const mealPeriod = firstDefined(req.body.mealPeriod, req.body.meal_period) || 'fasting';
      const result = db.prepare(
        'INSERT INTO blood_sugar_records (patient_id, value, record_time, meal_period, notes) VALUES (?, ?, ?, ?, ?)'
      ).run(patientId, value, recordTime, mealPeriod, notes);
      recordId = result.lastInsertRowid;
      const alert = createAlertIfNeeded({ patientId, type, value, mealPeriod, source });
      return res.json(cozeOk({
        saved: true,
        recordId,
        alertCreated: Boolean(alert),
        alertId: alert?.id || null,
        alertLevel: alert?.alertLevel || '',
        message: '健康数据已保存'
      }));
    }

    if (type === 'blood_pressure') {
      const systolic = Number(firstDefined(req.body.systolic, req.body.sbp));
      const diastolic = Number(firstDefined(req.body.diastolic, req.body.dbp));
      const heartRate = Number(firstDefined(req.body.heartRate, req.body.heart_rate, 0));
      if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
        return res.status(400).json(cozeFail('血压 systolic/diastolic 是必填数字', 400));
      }
      const result = db.prepare(
        'INSERT INTO blood_pressure_records (patient_id, systolic, diastolic, heart_rate, record_time, notes) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(patientId, systolic, diastolic, Number.isFinite(heartRate) ? heartRate : 0, recordTime, notes);
      recordId = result.lastInsertRowid;
      const alert = createAlertIfNeeded({ patientId, type, systolic, diastolic, source });
      return res.json(cozeOk({
        saved: true,
        recordId,
        alertCreated: Boolean(alert),
        alertId: alert?.id || null,
        alertLevel: alert?.alertLevel || '',
        message: '健康数据已保存'
      }));
    }

    res.status(400).json(cozeFail('type 仅支持 blood_sugar 或 blood_pressure', 400));
  } catch (err) {
    res.status(500).json(cozeFail(err.message, 500));
  }
});

app.post('/api/coze/alerts', requireCozeWebhookSecret, (req, res) => {
  try {
    const patientId = parseInt(firstDefined(req.body.patientId, req.body.patient_id), 10);
    const alertType = firstDefined(req.body.alertType, req.body.alert_type) || 'coze';
    const alertLevel = firstDefined(req.body.alertLevel, req.body.alert_level) || 'warning';
    const content = firstDefined(req.body.content, req.body.message) || 'Coze 工作流创建预警';
    const source = firstDefined(req.body.source, 'coze_workflow') || 'coze_workflow';
    if (!patientId) return res.status(400).json(cozeFail('patientId 是必填参数', 400));
    const result = db.prepare(
      'INSERT INTO alerts (patient_id, alert_type, alert_level, content, status) VALUES (?, ?, ?, ?, ?)'
    ).run(patientId, alertType, alertLevel, `${content}${source ? ` 来源：${source}` : ''}`, 'pending');
    res.json(cozeOk({ saved: true, id: result.lastInsertRowid, message: '预警已创建' }));
  } catch (err) {
    res.status(500).json(cozeFail(err.message, 500));
  }
});

app.post('/api/coze/followup-result', requireCozeWebhookSecret, (req, res) => {
  try {
    const patientId = parseInt(firstDefined(req.body.patientId, req.body.patient_id), 10);
    const followupId = parseInt(firstDefined(req.body.followupId, req.body.followup_id), 10);
    const followupType = firstDefined(req.body.followupType, req.body.followup_type) || 'ai_call';
    const status = firstDefined(req.body.status, 'completed') || 'completed';
    const resultText = firstDefined(req.body.result, req.body.summary) || '';
    const notes = firstDefined(req.body.notes, req.body.note) || 'Coze AI 回访生成';
    if (!patientId && !followupId) return res.status(400).json(cozeFail('patientId 或 followupId 至少填写一个', 400));

    if (followupId) {
      db.prepare(
        "UPDATE followups SET status=?, completed_time=datetime('now','localtime'), result=?, notes=? WHERE id=?"
      ).run(status, resultText, notes, followupId);
      return res.json(cozeOk({ saved: true, id: followupId, message: '回访结果已入库' }));
    }

    const inserted = db.prepare(
      "INSERT INTO followups (patient_id, followup_type, status, completed_time, result, notes) VALUES (?, ?, ?, datetime('now','localtime'), ?, ?)"
    ).run(patientId, followupType, status, resultText, notes);
    res.json(cozeOk({ saved: true, id: inserted.lastInsertRowid, message: '回访结果已入库' }));
  } catch (err) {
    res.status(500).json(cozeFail(err.message, 500));
  }
});

app.post('/api/coze/workflow-callback', requireCozeWebhookSecret, (req, res) => {
  try {
    const patientId = parseInt(firstDefined(req.body.patientId, req.body.patient_id), 10) || null;
    const workflowType = firstDefined(req.body.workflowType, req.body.workflow_type) || 'default';
    const workflowId = firstDefined(req.body.workflowId, req.body.workflow_id, process.env.COZE_WORKFLOW_ID) || '';
    const input = firstDefined(req.body.input, req.body.inputJson, req.body.input_json, {});
    const output = firstDefined(req.body.output, req.body.outputJson, req.body.output_json, {});
    const status = firstDefined(req.body.status, 'success') || 'success';
    const errorMessage = firstDefined(req.body.errorMessage, req.body.error_message) || '';
    const inserted = db.prepare(
      'INSERT INTO workflow_runs (patient_id, workflow_type, workflow_id, input_json, output_json, status, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(patientId, workflowType, workflowId, safeJson(input), safeJson(output), status, errorMessage);
    res.json(cozeOk({ saved: true, id: inserted.lastInsertRowid, message: '工作流回调已入库' }));
  } catch (err) {
    res.status(500).json(cozeFail(err.message, 500));
  }
});

// ================================================================
// 🤖 AI 服务（Coze 对接）
// ================================================================

app.get('/api/ai/coze/status', (req, res) => {
  res.json(ok(getCozeStatus()));
});

// AI 健康咨询
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, agentType, patientId } = req.body;
    if (!message) return res.status(400).json(fail('message 是必填参数', 400));
    const cozeStatus = getCozeStatus();
    const result = cozeStatus.botConfigured
      ? await callCozeBot(message, agentType || 'doctor', { patientId })
      : await callCozeChat(message, agentType || 'doctor');

    // Log to followups if patientId provided
    if (patientId) {
      db.prepare(
        "INSERT INTO followups (patient_id, followup_type, status, notes, result) VALUES (?, 'ai_call', 'completed', ?, ?)"
      ).run(patientId, `AI咨询(${result.agent_name})`, result.reply);
    }

    insertAiConsultation({
      patientId,
      agentType: agentType || 'doctor',
      conversationId: result.conversation_id || '',
      chatId: result.chat_id || '',
      requestText: String(message || ''),
      responseText: String(result.reply || ''),
      requestJson: safeJson(req.body),
      responseJson: safeJson(result),
      status: 'success',
      errorMessage: ''
    });

    res.json(ok(result));
  } catch (err) {
    // Fallback: return local response if Coze is unreachable
    const fallback = {
      conversation_id: 'local',
      reply: getLocalFallback(req.body.message || '', req.body.agentType || 'doctor'),
      agent_type: req.body.agentType || 'doctor',
      agent_name: AGENT_MAP[req.body.agentType]?.name || '健康助手',
      note: 'Coze API unavailable, using local fallback'
    };

    insertAiConsultation({
      patientId: req.body.patientId,
      agentType: req.body.agentType || 'doctor',
      conversationId: fallback.conversation_id,
      chatId: '',
      requestText: String(req.body.message || ''),
      responseText: String(fallback.reply || ''),
      requestJson: safeJson(req.body),
      responseJson: safeJson(fallback),
      status: 'fallback',
      errorMessage: String(err.message || '')
    });

    res.json(ok(fallback));
  }
});

// 体质辨识
app.post('/api/ai/constitution', async (req, res) => {
  try {
    const { symptoms, patientId } = req.body;
    const prompt = `请根据以下症状进行中医体质辨识：${symptoms || '无特定症状'}\n请分析属于哪种体质类型并给出建议。`;
    const cozeStatus = getCozeStatus();
    const result = cozeStatus.botConfigured
      ? await callCozeBot(prompt, 'doctor', { patientId })
      : await callCozeChat(prompt, 'doctor');
    res.json(ok(result));
  } catch (err) {
    res.json(ok({
      reply: '根据您描述的症状，建议您到社区医院进行详细体质辨识评估。请注意休息，保持规律作息。',
      agent_type: 'constitution',
      note: 'local fallback'
    }));
  }
});

// 健康报告
app.get('/api/ai/report/:patientId', (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) return res.status(404).json(fail('患者不存在', 404));

    const sugars = db.prepare(
      'SELECT * FROM blood_sugar_records WHERE patient_id = ? ORDER BY record_time DESC LIMIT 30'
    ).all(patientId);
    const pressures = db.prepare(
      'SELECT * FROM blood_pressure_records WHERE patient_id = ? ORDER BY record_time DESC LIMIT 30'
    ).all(patientId);

    res.json(ok({
      patient: { name: patient.name, age: patient.age, chronicTags: JSON.parse(patient.chronic_tags || '[]') },
      period: '最近30天',
      bloodSugar: computeSugarStats(sugars),
      bloodPressure: computeBPStats(pressures),
      summary: generateHealthSummary(patient, sugars, pressures),
      generatedAt: new Date().toISOString()
    }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

// 智能体（多智能体调度 - 核心的 /api/ai/agent 接口）
app.post('/api/ai/agent', async (req, res) => {
  try {
    const { agentType, patientId, task, params } = req.body;

    if (!agentType) return res.status(400).json(fail('agentType 是必填参数', 400));
    if (!AGENT_MAP[agentType]) {
      return res.status(400).json(fail(`不支持的智能体类型: ${agentType}，可选: ${Object.keys(AGENT_MAP).join(', ')}`, 400));
    }

    // Gather patient context if available
    let patientContext = '';
    if (patientId) {
      const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
      if (patient) {
        patientContext = `患者信息：${patient.name}，${patient.age}岁，${patient.gender}，慢病标签：${patient.chronic_tags}`;
      }
    }

    const userMessage = `${patientContext}\n任务类型：${task || 'general'}\n参数：${JSON.stringify(params || {})}\n请给出专业建议。`;

    const cozeStatus = getCozeStatus();
    const result = cozeStatus.botConfigured
      ? await callCozeBot(userMessage, agentType, { patientId })
      : await callCozeChat(userMessage, agentType);

    const payload = {
      agentType,
      agentName: result.agent_name,
      conversationId: result.conversation_id,
      reply: result.reply,
      timestamp: new Date().toISOString()
    };

    insertAiConsultation({
      patientId,
      agentType,
      conversationId: result.conversation_id || '',
      chatId: result.chat_id || '',
      requestText: String(userMessage || ''),
      responseText: String(result.reply || ''),
      requestJson: safeJson(req.body),
      responseJson: safeJson({ ...result, payload }),
      status: 'success',
      errorMessage: ''
    });

    res.json(ok(payload));
  } catch (err) {
    const fallback = {
      agentType: req.body.agentType || 'doctor',
      agentName: AGENT_MAP[req.body.agentType]?.name || '健康助手',
      reply: getLocalFallback(JSON.stringify(req.body), req.body.agentType),
      note: 'Coze API unavailable, using local fallback'
    };

    insertAiConsultation({
      patientId: req.body.patientId,
      agentType: req.body.agentType || 'doctor',
      conversationId: 'local',
      chatId: '',
      requestText: safeJson(req.body),
      responseText: String(fallback.reply || ''),
      requestJson: safeJson(req.body),
      responseJson: safeJson(fallback),
      status: 'fallback',
      errorMessage: String(err.message || '')
    });

    res.json(ok(fallback));
  }
});

app.post('/api/ai/workflow/run', async (req, res) => {
  try {
    const { patientId, workflowType, parameters } = req.body;
    const input = { ...(parameters || {}), patientId, workflowType };

    if (patientId) {
      const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
      if (patient) {
        input.patient = {
          id: patient.id,
          name: patient.name,
          gender: patient.gender,
          age: patient.age,
          phone: patient.phone,
          chronicTags: JSON.parse(patient.chronic_tags || '[]')
        };
      }
    }

    const cozeStatus = getCozeStatus();
    const result = await runCozeWorkflow(input);
    const payload = {
      workflowType: workflowType || 'default',
      result,
      timestamp: new Date().toISOString()
    };

    insertWorkflowRun({
      patientId,
      workflowType: workflowType || 'default',
      workflowId: cozeStatus.workflowConfigured ? (process.env.COZE_WORKFLOW_ID || '') : '',
      inputJson: safeJson(input),
      outputJson: safeJson(payload),
      status: 'success',
      errorMessage: ''
    });

    res.json(ok(payload));
  } catch (err) {
    const fallback = {
      workflowType: req.body.workflowType || 'default',
      result: {
        summary: 'Coze 工作流暂未配置或调用失败，已使用本地兜底结果。',
        detail: getLocalFallback(JSON.stringify(req.body || {}), 'supervisor')
      },
      note: err.message
    };

    insertWorkflowRun({
      patientId: req.body.patientId,
      workflowType: req.body.workflowType || 'default',
      workflowId: '',
      inputJson: safeJson(req.body),
      outputJson: safeJson(fallback),
      status: 'fallback',
      errorMessage: String(err.message || '')
    });

    res.json(ok(fallback));
  }
});

// ================================================================
// 🤖 AI 记录查询（评委可查看）
// ================================================================
app.get('/api/ai/consultations', (req, res) => {
  try {
    const patientId = parseInt(req.query.patient_id) || 0;
    const rows = patientId
      ? db.prepare('SELECT * FROM ai_consultations WHERE patient_id=? ORDER BY created_at DESC LIMIT 50').all(patientId)
      : db.prepare('SELECT * FROM ai_consultations ORDER BY created_at DESC LIMIT 50').all();
    res.json(ok(rows));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.get('/api/ai/workflow-runs', (req, res) => {
  try {
    const patientId = parseInt(req.query.patient_id) || 0;
    const rows = patientId
      ? db.prepare('SELECT * FROM workflow_runs WHERE patient_id=? ORDER BY created_at DESC LIMIT 50').all(patientId)
      : db.prepare('SELECT * FROM workflow_runs ORDER BY created_at DESC LIMIT 50').all();
    res.json(ok(rows));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

// ================================================================
// 📊 仪表盘
// ================================================================
app.get('/api/dashboard/overview', (req, res) => {
  try {
    const patientCount = db.prepare('SELECT COUNT(*) as c FROM patients').get().c;
    const alertCount = db.prepare("SELECT COUNT(*) as c FROM alerts WHERE status='pending'").get().c;
    const followupCount = db.prepare("SELECT COUNT(*) as c FROM followups WHERE status='pending'").get().c;
    const todayCheckinCount = db.prepare(
      'SELECT COUNT(*) as c FROM checkins WHERE date = ?'
    ).get(today()).c;

    res.json(ok({
      patientCount, alertCount, followupCount, todayCheckinCount,
      stats: {
        totalPatients: patientCount,
        pendingAlerts: alertCount,
        pendingFollowups: followupCount,
        todayCheckins: todayCheckinCount
      }
    }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.get('/api/dashboard/chronic-distribution', (req, res) => {
  try {
    const patients = db.prepare('SELECT chronic_tags FROM patients').all();
    const dist = {};
    for (const p of patients) {
      const tags = JSON.parse(p.chronic_tags || '[]');
      for (const tag of tags) {
        dist[tag] = (dist[tag] || 0) + 1;
      }
    }
    res.json(ok({ distribution: Object.entries(dist).map(([name, count]) => ({ name, count })) }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.get('/api/dashboard/trends', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const checkinTrend = db.prepare(
      "SELECT date, COUNT(*) as count FROM checkins WHERE date >= ? GROUP BY date ORDER BY date"
    ).all(sinceStr);

    res.json(ok({ checkinTrend }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

// ================================================================
// 🔔 消息通知
// ================================================================
app.get('/api/notifications', (req, res) => {
  try {
    const userId = req.query.user_id || 'user-1001';
    const rows = db.prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(userId);
    res.json(ok(rows.map(n => ({
      id: n.id, title: n.title, content: n.content,
      isRead: !!n.is_read, createdAt: n.created_at
    }))));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.post('/api/notifications/read', (req, res) => {
  try {
    if (DEMO_MODE || req.user?.role === 'judge') return res.status(403).json(fail('演示模式下不可操作', 403));
    const { ids } = req.body;
    if (ids && Array.isArray(ids)) {
      for (const id of ids) {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
      }
    } else {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0').run();
    }
    res.json(ok({ message: '已标记为已读' }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.post('/api/notifications/send', (req, res) => {
  try {
    if (DEMO_MODE || req.user?.role === 'judge') return res.status(403).json(fail('演示模式下不可操作', 403));
    const { userId, title, content } = req.body;
    if (!title) return res.status(400).json(fail('title 是必填参数', 400));
    const result = db.prepare(
      'INSERT INTO notifications (user_id, title, content) VALUES (?, ?, ?)'
    ).run(userId || 'user-1001', title, content || '');
    res.json(ok({ id: result.lastInsertRowid, message: '消息已发送' }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

// ================================================================
// 🏠 首页接口（原有）
// ================================================================
app.get('/api/home/banners', (req, res) => {
  try {
    const banners = db.prepare('SELECT * FROM banners ORDER BY id').all();
    res.json(ok({
      list: banners.map(b => ({ id: b.id, title: b.title, image: b.image || '', link: b.link || '' }))
    }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.get('/api/home/quick-stats', (req, res) => {
  try {
    const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE is_read=0').get().c;
    res.json(ok({
      unreadMessageCount: Math.min(unread, 9),
      weather: { city: '上海', temperature: '24', condition: '多云' }
    }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.get('/api/news', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10));
    const keyword = (req.query.keyword || '').trim();
    let countSql = 'SELECT COUNT(*) as total FROM news';
    let dataSql = 'SELECT * FROM news';
    const params = [];
    if (keyword) {
      const like = `%${keyword}%`;
      const where = ' WHERE (title LIKE ? OR summary LIKE ?)';
      countSql += where; dataSql += where;
      params.push(like, like);
    }
    dataSql += ' ORDER BY publish_time DESC LIMIT ? OFFSET ?';
    const total = db.prepare(countSql).get(...params).total;
    const rows = db.prepare(dataSql).all(...params, pageSize, (page - 1) * pageSize);
    res.json(ok({
      list: rows.map(r => ({
        id: r.id, title: r.title, summary: r.summary || '',
        coverImage: r.cover_image || '', author: r.author || '',
        publishTime: r.publish_time || '', views: r.views || 0
      })),
      total
    }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.get('/api/checkin/today', (req, res) => {
  try {
    const record = db.prepare('SELECT * FROM checkins WHERE user_id=? AND date=?').get('user-1001', today());
    if (!record) {
      return res.json(ok({ date: today(), checked: false, checkinTime: '', items: {
        bloodPressure: { value: '', status: 'normal' },
        bloodSugar: { value: '', status: 'normal' },
        weight: { value: '', status: 'normal' }
      }}));
    }
    res.json(ok({
      date: record.date, checked: true, checkinTime: record.checkin_time || '',
      items: {
        bloodPressure: { value: record.blood_pressure || '', status: bpStatus(record.blood_pressure) },
        bloodSugar: { value: record.blood_sugar || '', status: bsStatus(record.blood_sugar) },
        weight: { value: record.weight ? `${record.weight}kg` : '', status: 'normal' }
      }
    }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

app.post('/api/checkin/one-click', (req, res) => {
  try {
    if (DEMO_MODE || req.user?.role === 'judge') return res.status(403).json(fail('演示模式下不可操作', 403));
    const existing = db.prepare('SELECT id FROM checkins WHERE user_id=? AND date=?').get('user-1001', today());
    if (existing) {
      db.prepare('UPDATE checkins SET checkin_time=? WHERE id=?').run(now(), existing.id);
    } else {
      db.prepare('INSERT INTO checkins (user_id,date,checkin_time,blood_pressure,blood_sugar,weight) VALUES (?,?,?,?,?,?)')
        .run('user-1001', today(), now(), '126/82', '5.8', '65');
    }
    res.json(ok({ success: true }));
  } catch (err) { res.status(500).json(fail(err.message)); }
});

// ================================================================
// 🩺 健康检查
// ================================================================
app.get('/api/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json(ok({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeMs: Date.now() - BOOT_AT,
    memory: {
      rssMB: mb(mem.rss),
      heapUsedMB: mb(mem.heapUsed),
      heapTotalMB: mb(mem.heapTotal)
    }
  }));
});

// ================================================================
// Helpers
// ================================================================
function bpStatus(val) {
  if (!val) return 'normal';
  const p = val.split('/').map(Number);
  if (p.length !== 2 || isNaN(p[0]) || isNaN(p[1])) return 'normal';
  if (p[0] >= 160 || p[1] >= 100) return 'danger';
  if (p[0] >= 140 || p[1] >= 90) return 'warning';
  return 'normal';
}
function bsStatus(val) {
  if (!val) return 'normal';
  const n = parseFloat(val);
  if (isNaN(n)) return 'normal';
  if (n > 10) return 'danger';
  if (n > 7) return 'warning';
  return 'normal';
}

function getLocalFallback(message, agentType) {
  const msg = message.toLowerCase();
  if (agentType === 'nutritionist' || msg.includes('饮食') || msg.includes('吃')) {
    return '建议控制盐摄入（每日<5g），增加蔬菜水果比例，减少高脂高糖食物。保持规律三餐，避免暴饮暴食。';
  }
  if (agentType === 'exercise_coach' || msg.includes('运动')) {
    return '建议每天进行30分钟中等强度有氧运动，如快走、太极拳。运动前后监测血压血糖，避免空腹运动。';
  }
  if (msg.includes('血压') || msg.includes('高血压')) {
    return '高血压患者应定期监测血压，遵医嘱服药，低盐饮食，保持规律作息。建议血压控制在140/90mmHg以下。';
  }
  if (msg.includes('血糖') || msg.includes('糖尿病')) {
    return '糖尿病患者应控制碳水化合物摄入，定期监测血糖，遵医嘱用药。空腹血糖目标4.4-7.0mmol/L。';
  }
  return '您好，我是您的健康助手。如有健康问题，请详细描述您的情况，我会尽力为您提供专业建议。';
}

function generateHealthSummary(patient, sugars, pressures) {
  const parts = [];
  parts.push(`${patient.name}，${patient.age}岁。`);
  const tags = JSON.parse(patient.chronic_tags || '[]');
  if (tags.length) parts.push(`慢病标签：${tags.join('、')}。`);

  if (sugars.length) {
    const s = computeSugarStats(sugars);
    parts.push(`近30天血糖均值${s.avg}mmol/L，正常率${s.normalRate}%。`);
  }
  if (pressures.length) {
    const bp = computeBPStats(pressures);
    parts.push(`近30天血压均值${bp.avgSystolic}/${bp.avgDiastolic}mmHg，正常率${bp.normalRate}%。`);
  }
  parts.push('请继续保持规律监测和健康生活方式。');
  return parts.join('');
}

// ================================================================
// 🚀 启动
// ================================================================
const server = app.listen(PORT, HOST, () => {
  console.log(`🏥 社区慢病管理系统后端 v2.0 已启动`);
  console.log(`📡 地址: http://${HOST}:${PORT}`);
  console.log(`📋 接口: 认证(3) 患者(5) 血糖(3) 血压(3) 设备(3) 预警(3) 回访(4) AI(4) 仪表盘(4) 通知(3) 首页(5)`);
  console.log(`🔗 Coze: ${require('./coze-client').AGENT_MAP ? '已配置' : '未配置'}`);
});

// ================================================================
// 🧯 稳定性增强：心跳与优雅退出
// ================================================================

const HEARTBEAT_MS = Number(process.env.HEARTBEAT_MS || 60_000);
const heartbeatTimer = setInterval(logHeartbeat, HEARTBEAT_MS);
heartbeatTimer.unref?.();

async function shutdown(signal) {
  console.log(`[shutdown] signal=${signal} uptime=${formatUptime(Date.now() - BOOT_AT)}`);

  clearInterval(heartbeatTimer);

  await new Promise((resolve) => {
    server.close(() => resolve());
    // Force close after grace period
    setTimeout(resolve, 3_000).unref?.();
  });

  try {
    db.close?.();
  } catch (err) {
    console.warn('[shutdown] db.close failed:', err.message);
  }

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException:', err?.message || err);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection:', reason?.message || reason);
  shutdown('unhandledRejection');
});
