'use strict';

/** Node http.Response 或 Vercel Serverless Response 通用写 JSON */

module.exports = function sendHttpJson(res, out) {
  const bodyObj = typeof out.body === 'string' ? JSON.parse(out.body) : out.body;
  const bodyStr = JSON.stringify(bodyObj);
  const statusCode = typeof out.statusCode === 'number' ? out.statusCode : 200;
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(bodyStr);
};
