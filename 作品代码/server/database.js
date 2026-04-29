const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
let db;

function initDatabase() {
  const demoMode = String(process.env.DEMO_MODE || '').toLowerCase() === 'true';
  try {
    db = demoMode ? new Database(':memory:') : new Database(DB_PATH);
  } catch (err) {
    console.warn('SQLite file open failed, fallback to in-memory database:', err.message);
    db = new Database(':memory:');
  }

  // Prefer WAL, but keep the demo server bootable on restricted filesystems.
  try {
    db.pragma('journal_mode = WAL');
  } catch (err) {
    console.warn('SQLite WAL mode unavailable, fallback to default journal mode:', err.message);
  }

  try {
    db.pragma('foreign_keys = ON');
    createTables();
    seedData();
    return db;
  } catch (err) {
    if (DB_PATH !== ':memory:') {
      console.warn('SQLite file unusable, recreating demo data in memory:', err.message);
      db = new Database(':memory:');
      db.pragma('foreign_keys = ON');
      createTables();
      seedData();
      return db;
    }
    throw err;
  }
}

function getDatabase() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

function createTables() {
  db.exec(`
    -- 用户（医生/管理员）
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      age INTEGER DEFAULT 0,
      chronic_tags TEXT DEFAULT '[]',
      role TEXT DEFAULT 'patient',
      phone TEXT DEFAULT '',
      department TEXT DEFAULT ''
    );

    -- 患者信息
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gender TEXT DEFAULT '',
      age INTEGER DEFAULT 0,
      phone TEXT DEFAULT '',
      id_card TEXT DEFAULT '',
      address TEXT DEFAULT '',
      chronic_tags TEXT DEFAULT '[]',
      doctor_id TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 血糖记录
    CREATE TABLE IF NOT EXISTS blood_sugar_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      value REAL NOT NULL,
      record_time TEXT NOT NULL,
      meal_period TEXT DEFAULT 'fasting',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 血压记录
    CREATE TABLE IF NOT EXISTS blood_pressure_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      systolic INTEGER NOT NULL,
      diastolic INTEGER NOT NULL,
      heart_rate INTEGER DEFAULT 0,
      record_time TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 设备管理
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      device_name TEXT NOT NULL,
      device_type TEXT NOT NULL,
      device_sn TEXT DEFAULT '',
      bind_time TEXT DEFAULT (datetime('now','localtime')),
      last_sync_time TEXT DEFAULT '',
      status TEXT DEFAULT 'active'
    );

    -- 预警管理
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      alert_type TEXT NOT NULL,
      alert_level TEXT DEFAULT 'warning',
      content TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      processed_at TEXT,
      processor_id TEXT
    );

    -- 回访管理
    CREATE TABLE IF NOT EXISTS followups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      followup_type TEXT DEFAULT 'phone',
      status TEXT DEFAULT 'pending',
      scheduled_time TEXT,
      completed_time TEXT,
      result TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 消息通知
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'user-1001',
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 打卡记录（原有）
    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      checkin_time TEXT DEFAULT '',
      blood_pressure TEXT DEFAULT '',
      blood_sugar TEXT DEFAULT '',
      weight TEXT DEFAULT '',
      UNIQUE(user_id, date)
    );

    -- Banner（原有）
    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      image TEXT DEFAULT '',
      link TEXT DEFAULT ''
    );

    -- 资讯（原有）
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      author TEXT DEFAULT '',
      publish_time TEXT DEFAULT '',
      views INTEGER DEFAULT 0
    );

    -- AI 咨询记录（新增）
    CREATE TABLE IF NOT EXISTS ai_consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      agent_type TEXT DEFAULT 'doctor',
      conversation_id TEXT DEFAULT '',
      chat_id TEXT DEFAULT '',
      request_text TEXT DEFAULT '',
      response_text TEXT DEFAULT '',
      request_json TEXT DEFAULT '',
      response_json TEXT DEFAULT '',
      status TEXT DEFAULT 'success',
      error_message TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    -- 工作流执行记录（新增）
    CREATE TABLE IF NOT EXISTS workflow_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      workflow_type TEXT DEFAULT 'default',
      workflow_id TEXT DEFAULT '',
      input_json TEXT DEFAULT '',
      output_json TEXT DEFAULT '',
      status TEXT DEFAULT 'success',
      error_message TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
}

function seedData() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (count.c > 0) return;

  // Users
  db.prepare(`INSERT INTO users (id, name, age, chronic_tags, role, phone, department) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run('user-1001', '张阿姨', 67, JSON.stringify(['高血压', '糖尿病']), 'patient', '13800138001', '');
  db.prepare(`INSERT INTO users (id, name, role, phone, department) VALUES (?, ?, ?, ?, ?)`)
    .run('doctor-1001', '李医生', 'doctor', '13900139001', '全科');
  db.prepare(`INSERT INTO users (id, name, role, phone, department) VALUES (?, ?, ?, ?, ?)`)
    .run('admin-1001', '系统管理员', 'admin', '13700137001', '管理');

  // Judge user (read-only demo account)
  const judgePhone = process.env.JUDGE_ACCOUNT_PHONE || '13800138001';
  db.prepare(`INSERT INTO users (id, name, role, phone, department) VALUES (?, ?, ?, ?, ?)`)
    .run('judge-1001', '评委账号', 'judge', judgePhone, '演示');

  // Patients
  const patients = [
    ['王大爷', '男', 72, '13800138002', '上海市静安区南京西路100号', JSON.stringify(['高血压', '冠心病']), 'doctor-1001'],
    ['刘奶奶', '女', 68, '13800138003', '上海市静安区南京西路102号', JSON.stringify(['糖尿病']), 'doctor-1001'],
    ['陈叔叔', '男', 65, '13800138004', '上海市静安区南京西路104号', JSON.stringify(['高血压', '糖尿病', '高血脂']), 'doctor-1001'],
    ['赵阿姨', '女', 71, '13800138005', '上海市静安区南京西路106号', JSON.stringify(['糖尿病', '骨质疏松']), 'doctor-1001'],
  ];
  const insPatient = db.prepare(
    `INSERT INTO patients (name, gender, age, phone, address, chronic_tags, doctor_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const p of patients) insPatient.run(...p);

  // Blood sugar records (last 7 days for patients)
  const insSugar = db.prepare(
    `INSERT INTO blood_sugar_records (patient_id, value, record_time, meal_period) VALUES (?, ?, ?, ?)`
  );
  const sugarData = [
    [1, 5.8, getDateStr(-6) + ' 07:00', 'fasting'],
    [1, 7.2, getDateStr(-6) + ' 09:30', 'after_breakfast'],
    [1, 6.1, getDateStr(-4) + ' 07:00', 'fasting'],
    [1, 5.5, getDateStr(-2) + ' 07:00', 'fasting'],
    [1, 6.8, getDateStr(-2) + ' 11:30', 'before_lunch'],
    [1, 5.9, getDateStr(0) + ' 07:00', 'fasting'],
    [2, 7.8, getDateStr(-5) + ' 07:00', 'fasting'],
    [2, 11.2, getDateStr(-5) + ' 10:00', 'after_breakfast'],
    [2, 6.5, getDateStr(-3) + ' 07:00', 'fasting'],
    [2, 6.0, getDateStr(0) + ' 07:00', 'fasting'],
  ];
  for (const s of sugarData) insSugar.run(...s);

  // Blood pressure records
  const insBP = db.prepare(
    `INSERT INTO blood_pressure_records (patient_id, systolic, diastolic, heart_rate, record_time) VALUES (?, ?, ?, ?, ?)`
  );
  const bpData = [
    [1, 142, 88, 78, getDateStr(-6) + ' 07:00'],
    [1, 138, 85, 76, getDateStr(-4) + ' 07:00'],
    [1, 135, 82, 75, getDateStr(-2) + ' 07:00'],
    [1, 126, 80, 72, getDateStr(0) + ' 07:00'],
    [3, 155, 95, 82, getDateStr(-3) + ' 08:00'],
    [3, 148, 90, 80, getDateStr(-1) + ' 08:00'],
  ];
  for (const b of bpData) insBP.run(...b);

  // Devices
  const insDevice = db.prepare(
    `INSERT INTO devices (patient_id, device_name, device_type, device_sn, last_sync_time) VALUES (?, ?, ?, ?, ?)`
  );
  insDevice.run(1, '上臂式电子血压计', 'blood_pressure', 'BP-2024-001', getDateStr(0) + ' 07:05');
  insDevice.run(1, '血糖仪', 'blood_sugar', 'BS-2024-001', getDateStr(0) + ' 07:02');
  insDevice.run(2, '血糖仪', 'blood_sugar', 'BS-2024-002', getDateStr(-1) + ' 07:10');

  // Alerts
  const insAlert = db.prepare(
    `INSERT INTO alerts (patient_id, alert_type, alert_level, content, status) VALUES (?, ?, ?, ?, ?)`
  );
  insAlert.run(1, 'blood_pressure', 'warning', '今日血压偏高（135/85），建议复测并记录。', 'pending');
  insAlert.run(2, 'blood_sugar', 'danger', '空腹血糖11.2mmol/L，超出危险阈值，请及时就医。', 'pending');
  insAlert.run(3, 'blood_pressure', 'danger', '血压155/95mmHg，达到高血压3级标准，建议立即就医。', 'pending');

  // Followups
  const insFollowup = db.prepare(
    `INSERT INTO followups (patient_id, followup_type, status, scheduled_time, notes) VALUES (?, ?, ?, ?, ?)`
  );
  insFollowup.run(1, 'phone', 'pending', getDateStr(1) + ' 09:00', '张阿姨常规回访，了解近期血压控制情况。');
  insFollowup.run(2, 'phone', 'pending', getDateStr(2) + ' 10:00', '刘奶奶血糖偏高，需电话了解用药情况。');
  insFollowup.run(1, 'visit', 'completed', getDateStr(-7) + ' 14:00', '上门随访，血压控制良好，继续维持当前方案。');

  // Notifications
  const insNotif = db.prepare(
    `INSERT INTO notifications (user_id, title, content) VALUES (?, ?, ?)`
  );
  insNotif.run('user-1001', '明日复诊提醒', '您预约的复诊时间是明天上午9:00，请携带近期血压记录。');
  insNotif.run('user-1001', '血压预警', '今日血压检测结果为135/85mmHg，较前偏高，请注意休息。');
  insNotif.run('doctor-1001', '患者预警通知', '您的患者 王大爷 血压155/95mmHg，请及时关注。');
  insNotif.run('doctor-1001', '回访提醒', '今日有 2 位患者待回访。');

  // Banners
  db.prepare(`INSERT INTO banners (title, image, link) VALUES (?, ?, ?)`)
    .run('健康知识', '', '/pages/index/index');
  db.prepare(`INSERT INTO banners (title, image, link) VALUES (?, ?, ?)`)
    .run('名医义诊', '', '/pages/index/index');
  db.prepare(`INSERT INTO banners (title, image, link) VALUES (?, ?, ?)`)
    .run('健康打卡', '', '/pages/index/index');

  // News
  const insNews = db.prepare(
    `INSERT INTO news (title, summary, author, publish_time, views) VALUES (?, ?, ?, ?, ?)`
  );
  const newsData = [
    ['高血压患者日常饮食需要注意什么？', '高血压患者建议控制盐摄入、增加蔬果比例，每天盐摄入量控制在5克以下。', '李医生', '2026-04-20 10:30', 1256],
    ['糖尿病患者如何正确监测血糖？', '建议固定监测时间，空腹血糖控制在4.4-7.0mmol/L，餐后2小时血糖<10.0mmol/L。', '张医生', '2026-04-18 15:20', 2341],
    ['适合慢病患者的居家运动有哪些？', '低强度步行、弹力带训练和拉伸训练适合大多数慢病患者循序开展。', '康复师', '2026-04-17 09:15', 1890],
    ['老年人如何预防心脑血管疾病？', '关注血压、血糖、体重和睡眠，坚持复诊与长期随访。', '王医生', '2026-04-16 14:00', 3456],
    ['春季慢病管理注意事项', '春季气温变化大，慢病患者应注意保暖、规律作息、合理饮食。', '李医生', '2026-04-14 11:20', 892],
    ['慢病患者用药安全指南', '遵医嘱用药，不随意增减剂量或停药。建立用药记录本。', '药剂师', '2026-04-12 08:45', 1678],
    ['社区家庭医生签约服务介绍', '家庭医生可为慢病患者提供长期健康管理服务。', '社区卫生中心', '2026-04-10 16:30', 2103],
    ['老年人跌倒预防与居家安全', '保持居家通道畅通，卫生间安装扶手，地面做好防滑处理。', '康复师', '2026-04-08 10:00', 1456],
  ];
  const insTx = db.transaction(items => { for (const item of items) insNews.run(...item); });
  insTx(newsData);

  // Checkins (last 7 days)
  const insCheckin = db.prepare(
    `INSERT OR IGNORE INTO checkins (user_id, date, checkin_time, blood_pressure, blood_sugar, weight) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (i % 2 === 0) {
      insCheckin.run('user-1001', ds, '08:30', '126/82', '5.8', '65');
    } else {
      insCheckin.run('user-1001', ds, '08:15', '130/85', '6.1', '65.5');
    }
  }
}

function getDateStr(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

module.exports = { initDatabase, getDatabase };
