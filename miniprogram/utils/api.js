const request = require('./request.js');

// 说明：
// - 本文件只负责“前端 -> 后端”的 API 方法封装
// - 不再提供 mock fallback（由后端负责必要的演示兜底）

// =========================
// Health / Auth / User
// =========================
function health() {
  return request.get('/api/health');
}

function login({ phone, password } = {}) {
  return request.post('/api/login', { phone, password });
}

function refreshToken() {
  return request.get('/api/auth/refresh');
}

function getUserProfile() {
  return request.get('/api/user/profile');
}

// =========================
// Home / News / Checkin
// =========================
function getHomeBanners() {
  return request.get('/api/home/banners').then((data) => data.list || []);
}

async function getHomeSummary() {
  const [userInfo, summary] = await Promise.all([
    request.get('/api/user/profile'),
    request.get('/api/home/quick-stats')
  ]);

  return {
    userInfo,
    unreadMessageCount: summary.unreadMessageCount || 0,
    weather: summary.weather || null
  };
}

function getNewsList({ page = 1, pageSize = 10, keyword = '' } = {}) {
  return request.get('/api/news', {
    page: Number(page || 1),
    pageSize: Number(pageSize || 10),
    keyword: String(keyword || '').trim()
  });
}

function getTodayCheckin() {
  return request.get('/api/checkin/today');
}

function oneKeyCheckin() {
  return request.post('/api/checkin/one-click', {});
}

// =========================
// Patients
// =========================
function listPatients({ page = 1, pageSize = 20, keyword = '' } = {}) {
  return request.get('/api/patients', {
    page: Number(page || 1),
    pageSize: Number(pageSize || 20),
    keyword: String(keyword || '').trim()
  });
}

function getPatient(id) {
  return request.get(`/api/patients/${encodeURIComponent(id)}`);
}

function createPatient(payload) {
  return request.post('/api/patients', payload || {});
}

function updatePatient(id, payload) {
  return request.request({
    url: `/api/patients/${encodeURIComponent(id)}`,
    method: 'PUT',
    data: payload || {}
  });
}

function deletePatient(id) {
  return request.request({
    url: `/api/patients/${encodeURIComponent(id)}`,
    method: 'DELETE',
    data: {}
  });
}

// =========================
// Vitals: blood sugar / pressure
// =========================
function listBloodSugar({ patientId, days = 7 } = {}) {
  return request.get('/api/blood-sugar', {
    patient_id: patientId,
    days: Number(days || 7)
  });
}

function createBloodSugar(payload) {
  return request.post('/api/blood-sugar', payload || {});
}

function getBloodSugarStats({ patientId } = {}) {
  return request.get('/api/blood-sugar/stats', { patient_id: patientId });
}

function listBloodPressure({ patientId, days = 7 } = {}) {
  return request.get('/api/blood-pressure', {
    patient_id: patientId,
    days: Number(days || 7)
  });
}

function createBloodPressure(payload) {
  return request.post('/api/blood-pressure', payload || {});
}

function getBloodPressureStats({ patientId } = {}) {
  return request.get('/api/blood-pressure/stats', { patient_id: patientId });
}

// =========================
// Devices
// =========================
function listDevices({ patientId } = {}) {
  return request.get('/api/devices', patientId ? { patient_id: patientId } : {});
}

function bindDevice(payload) {
  return request.post('/api/devices/bind', payload || {});
}

function syncDevice(id) {
  return request.post(`/api/devices/${encodeURIComponent(id)}/sync`, {});
}

// =========================
// Alerts / Followups / Notifications
// =========================
function listAlerts({ status, patientId } = {}) {
  const data = {};
  if (status) data.status = status;
  if (patientId) data.patient_id = patientId;
  return request.get('/api/alerts', data);
}

function processAlert(id, payload) {
  return request.post(`/api/alerts/${encodeURIComponent(id)}/process`, payload || {});
}

function getAlertRules() {
  return request.get('/api/alerts/rules');
}

function listFollowups({ status, patientId } = {}) {
  const data = {};
  if (status) data.status = status;
  if (patientId) data.patient_id = patientId;
  return request.get('/api/followups', data);
}

function createFollowup(payload) {
  return request.post('/api/followups', payload || {});
}

function completeFollowup(id, payload) {
  return request.post(`/api/followups/${encodeURIComponent(id)}/complete`, payload || {});
}

function createAiCallFollowup(payload) {
  return request.post('/api/followups/ai-call', payload || {});
}

function listNotifications({ userId } = {}) {
  return request.get('/api/notifications', userId ? { user_id: userId } : {});
}

function markNotificationsRead(payload) {
  return request.post('/api/notifications/read', payload || {});
}

function sendNotification(payload) {
  return request.post('/api/notifications/send', payload || {});
}

// =========================
// Dashboard
// =========================
function getDashboardOverview() {
  return request.get('/api/dashboard/overview');
}

function getChronicDistribution() {
  return request.get('/api/dashboard/chronic-distribution');
}

function getDashboardTrends({ days = 7 } = {}) {
  return request.get('/api/dashboard/trends', { days: Number(days || 7) });
}

// =========================
// AI / Coze
// =========================
function getCozeStatus() {
  return request.get('/api/ai/coze/status');
}

function aiChat(payload) {
  return request.post('/api/ai/chat', payload || {});
}

function aiAgent(payload) {
  return request.post('/api/ai/agent', payload || {});
}

function aiWorkflowRun(payload) {
  return request.post('/api/ai/workflow/run', payload || {});
}

function aiConstitution(payload) {
  return request.post('/api/ai/constitution', payload || {});
}

function getAiReport(patientId) {
  return request.get(`/api/ai/report/${encodeURIComponent(patientId)}`);
}

module.exports = {
  // base
  health,
  login,
  refreshToken,
  getUserProfile,

  // home
  getHomeBanners,
  getHomeSummary,
  getNewsList,
  getTodayCheckin,
  oneKeyCheckin,

  // patients
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,

  // vitals
  listBloodSugar,
  createBloodSugar,
  getBloodSugarStats,
  listBloodPressure,
  createBloodPressure,
  getBloodPressureStats,

  // devices
  listDevices,
  bindDevice,
  syncDevice,

  // alerts/followups/notifs
  listAlerts,
  processAlert,
  getAlertRules,
  listFollowups,
  createFollowup,
  completeFollowup,
  createAiCallFollowup,
  listNotifications,
  markNotificationsRead,
  sendNotification,

  // dashboard
  getDashboardOverview,
  getChronicDistribution,
  getDashboardTrends,

  // ai
  getCozeStatus,
  aiChat,
  aiAgent,
  aiWorkflowRun,
  aiConstitution,
  getAiReport
};
