/*
 * 功能：社区慢病管理系统-Node.js后端服务入口
 * 用途：正式运行
 * AI辅助：Cursor生成，已人工理解、修改并优化
 */

// AI辅助生成：Cursor，已人工修改适配
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '../..');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

/**
 * 创建HTTP服务器，提供静态文件服务和REST API
 */
const server = http.createServer(function (req, res) {
  var url = req.url;

  // CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // REST API路由
  if (url.startsWith('/api/')) {
    handleApiRequest(req, res);
    return;
  }

  // 静态文件服务
  serveStaticFile(url, res);
});

/**
 * 提供静态文件
 */
function serveStaticFile(url, res) {
  var filePath = url === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, url);
  var ext = path.extname(filePath);

  fs.readFile(filePath, function (err, content) {
    if (err) {
      // 如果是页面路由，回退到index.html
      if (!ext) {
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), function (err2, indexContent) {
          if (err2) {
            res.writeHead(500);
            res.end('500 Internal Server Error');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(indexContent);
        });
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

/**
 * 处理API请求
 */
function handleApiRequest(req, res) {
  var body = '';

  req.on('data', function (chunk) {
    body += chunk;
  });

  req.on('end', function () {
    var data = {};
    try {
      data = body ? JSON.parse(body) : {};
    } catch (e) {
      data = {};
    }

    var url = req.url;
    var method = req.method;

    // API路由分发
    // AI辅助生成：Cursor，已人工修改适配
    var result;

    if (url === '/api/user/login' && method === 'POST') {
      result = { code: 0, data: { token: 'demo_token_' + Date.now(), userInfo: { nickName: '李建国', cardNo: 'CDM20260001' } } };
    } else if (url === '/api/health/submit' && method === 'POST') {
      result = { code: 0, data: { message: '健康数据提交成功' } };
    } else if (url === '/api/health/records' && method === 'GET') {
      result = { code: 0, data: { records: [] } };
    } else if (url === '/api/ai/chat' && method === 'POST') {
      var reply = getMockAiReply(data.content || '');
      result = { code: 0, data: { reply: reply } };
    } else if (url === '/api/msg/list' && method === 'GET') {
      result = { code: 0, data: { messages: [] } };
    } else if (url === '/api/sync' && method === 'POST') {
      result = { code: 0, data: { message: '同步成功', syncTime: new Date().toISOString() } };
    } else if (url === '/api/health' && method === 'GET') {
      result = { code: 0, data: { status: 'ok', uptime: process.uptime() } };
    } else {
      result = { code: 404, msg: '接口不存在' };
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(result));
  });
}

/**
 * 获取模拟AI回复
 */
function getMockAiReply(text) {
  if (text.indexOf('血糖') !== -1) {
    return '根据你的近几次记录，血糖呈持续上升趋势。建议控制主食摄入量，餐后适当走动。';
  }
  if (text.indexOf('吃') !== -1 || text.indexOf('饮食') !== -1) {
    return '糖尿病的饮食原则：🥦 多吃绿叶蔬菜、全谷物，❌ 少吃精米白面、含糖饮料。';
  }
  if (text.indexOf('运动') !== -1) {
    return '适合的运动建议：🚶 快走每天30分钟，🧘 太极拳锻炼平衡。';
  }
  return '感谢你的提问！建议联系社区医生获取更详细指导。';
}

server.listen(PORT, function () {
  console.log('========================================');
  console.log('  社区慢病管理系统 - 后端服务已启动');
  console.log('  http://localhost:' + PORT);
  console.log('========================================');
});
