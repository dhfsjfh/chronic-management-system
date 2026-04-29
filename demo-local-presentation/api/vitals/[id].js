'use strict';

const handlers = require('../../lib/handlers');
const sendJson = require('../../lib/send-json-http');

function handler(req, res) {
  const pid = Number(req.query && req.query.id);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.end('');
  }
  if (req.method !== 'GET' || !(pid >= 1)) {
    return sendJson(res, { statusCode: 405, body: { ok: false, message: 'Method Not Allowed' } });
  }
  const auth =
    typeof req.headers.authorization === 'string' ? req.headers.authorization.trim() : '';
  const out = handlers.getVitalsForPatient(auth, pid);
  return sendJson(res, out);
}

module.exports = handler;
