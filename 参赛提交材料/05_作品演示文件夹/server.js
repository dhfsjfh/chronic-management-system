#!/usr/bin/env node
/**
 * 本地零依赖调试：静态页 + 与 lib/handlers 一致的 API
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const readBody = require('./lib/read-body-node');
const handlers = require('./lib/handlers');
const sendJson = require('./lib/send-json-http');

const PORT = Number(process.env.PORT) || 8890;
const ROOT = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function serve404(res) {
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(
    '<!DOCTYPE html><meta charset="utf-8">' +
      '<title>页面不存在</title><body style="font-family:sans-serif;padding:2rem">' +
      '页面不存在。<a href="/index.html">返回首页</a></body>'
  );
}

function safeFile(urlPathname) {
  const clean = decodeURIComponent(urlPathname).replace(/^\/+/, '');
  if (clean.includes('..')) return null;
  let file = path.join(ROOT, clean);
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(ROOT)) return null;
    return fs.existsSync(file) ? file : null;
  } catch {
    return null;
  }
}

function serveStatic(req, res) {
  const u = new URL(req.url || '/', `http://${req.headers.host}`);
  let pathname = u.pathname === '/' ? '/index.html' : u.pathname;
  const file = safeFile(pathname);
  if (!file) {
    serve404(res);
    return;
  }
  const ext = path.extname(file);
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(500);
      return res.end();
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(buf);
  });
}

async function api(req, res, pathname) {
  if (req.method === 'POST' && pathname === '/api/login') {
    const b = await readBody(req);
    const out = await handlers.loginBody(b);
    return sendJson(res, out);
  }

  const auth =
    typeof req.headers.authorization === 'string' ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '';
  const authHeader = auth ? `Bearer ${auth}` : '';

  if (req.method === 'GET' && pathname === '/api/patients') {
    const out = handlers.getPatients(authHeader);
    return sendJson(res, out);
  }

  const mPid = pathname.match(/^\/api\/patient\/(\d+)\/?$/);
  if (req.method === 'GET' && mPid) {
    const id = Number(mPid[1]);
    const out = handlers.getPatientById(authHeader, id);
    return sendJson(res, out);
  }

  if (req.method === 'GET' && pathname.startsWith('/api/vitals/')) {
    const pid = Number(pathname.split('/')[3]);
    const out = handlers.getVitalsForPatient(authHeader, pid);
    return sendJson(res, out);
  }

  sendJson(res, { statusCode: 404, body: { ok: false, message: '未找到接口' } });
}

function normPath(req) {
  const u = new URL(req.url || '/', `http://${req.headers.host}`);
  let p = u.pathname.replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = normPath(req);
    if (pathname.startsWith('/api')) await api(req, res, pathname);
    else serveStatic(req, res);
  } catch {
    sendJson(res, { statusCode: 500, body: { ok: false, message: '服务异常' } });
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log(`  演示服务已启动  http://127.0.0.1:${PORT}`);
  console.log(`  关闭请按 Ctrl+C`);
  console.log('');
});
