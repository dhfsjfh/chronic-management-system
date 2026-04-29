'use strict';

const readBody = require('../lib/read-body-node');
const handlers = require('../lib/handlers');
const sendJson = require('../lib/send-json-http');

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.end('');
  }
  if (req.method !== 'POST') {
    return sendJson(res, { statusCode: 405, body: { ok: false, message: 'Method Not Allowed' } });
  }
  const body = await readBody(req);
  const out = await handlers.loginBody(body);
  return sendJson(res, out);
}

module.exports = handler;
