-- ============================================
-- 社区慢病管理系统 - 数据库表结构定义
-- 用途：正式运行
-- AI辅助：Cursor生成，已人工理解、修改并优化
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nick_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500) DEFAULT '',
    card_no VARCHAR(50) NOT NULL UNIQUE,
    age INTEGER,
    gender VARCHAR(10),
    diagnosis TEXT,
    phone VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 健康打卡记录表
CREATE TABLE IF NOT EXISTS health_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    record_date DATE NOT NULL,
    systolic INTEGER,
    diastolic INTEGER,
    blood_sugar DECIMAL(4,1),
    blood_sugar_type VARCHAR(10),
    weight DECIMAL(5,1),
    bp_level VARCHAR(10),
    bs_level VARCHAR(10),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- AI对话记录表
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 消息通知表
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 数据同步日志表
CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    sync_type VARCHAR(20) NOT NULL,
    sync_status VARCHAR(20) NOT NULL,
    detail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 索引
CREATE INDEX idx_health_records_user_date ON health_records(user_id, record_date);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_sync_logs_user ON sync_logs(user_id, created_at);

-- 插入演示数据
INSERT INTO users (username, password, nick_name, card_no, age, gender, diagnosis)
VALUES ('admin', '123', '李建国', 'CDM20260001', 65, '男', '2型糖尿病、高血压');
