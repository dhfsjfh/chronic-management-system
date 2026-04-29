'use strict';

const { Buffer } = require('buffer');
const MOCK = require('./mock-data');

exports.loginBody = async function loginBody(body) {
  const acc = MOCK.accounts.find(
    (x) => x.phone === String(body.phone || '').trim() && x.password === String(body.password || '')
  );
  if (!acc)
    return { statusCode: 401, body: { ok: false, message: '账号或密码错误' } };
  const token = Buffer.from(`${acc.phone}:${acc.name}:${Date.now()}`).toString('base64url');
  return {
    statusCode: 200,
    body: {
      ok: true,
      data: {
        token,
        user: { name: acc.name, role: acc.role }
      }
    }
  };
};

exports.getPatients = function getPatients(authHeader) {
  if (!normalizeAuth(authHeader))
    return { statusCode: 401, body: { ok: false, message: '请先登录' } };
  return { statusCode: 200, body: { ok: true, data: { list: MOCK.patients } } };
};

exports.getPatientById = function getPatientById(authHeader, id) {
  if (!normalizeAuth(authHeader))
    return { statusCode: 401, body: { ok: false, message: '请先登录' } };
  const patient = MOCK.patients.find((p) => p.id === id);
  if (!patient)
    return { statusCode: 404, body: { ok: false, message: '未找到患者' } };
  return { statusCode: 200, body: { ok: true, data: { patient } } };
};

exports.getVitalsForPatient = function getVitalsForPatient(authHeader, patientId) {
  if (!normalizeAuth(authHeader))
    return { statusCode: 401, body: { ok: false, message: '请先登录' } };
  const block = MOCK.vitals[patientId];
  if (!block)
    return { statusCode: 404, body: { ok: false, message: '无监测数据' } };
  return { statusCode: 200, body: { ok: true, data: block } };
};

function normalizeAuth(h) {
  return typeof h === 'string' && /^Bearer\s+\S+/i.test(h.trim());
}
