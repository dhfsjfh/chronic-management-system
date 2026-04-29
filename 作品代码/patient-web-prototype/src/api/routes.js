/*
 * 功能：社区慢病管理系统-后端API路由定义
 * 用途：正式运行
 * AI辅助：Cursor生成，已人工理解、修改并优化
 */

// AI辅助生成：Cursor，已人工修改适配

/**
 * 后端API路由配置表
 * 定义所有REST API接口的路径、方法和处理函数映射
 */
var ApiRoutes = {
  // 用户相关
  user: {
    login:       { path: '/api/user/login',      method: 'POST',   auth: false },
    info:        { path: '/api/user/info',        method: 'GET',    auth: true  },
    update:      { path: '/api/user/update',      method: 'PUT',    auth: true  }
  },

  // 健康数据
  health: {
    submit:      { path: '/api/health/submit',    method: 'POST',   auth: true  },
    records:     { path: '/api/health/records',   method: 'GET',    auth: true  },
    trend:       { path: '/api/health/trend',     method: 'GET',    auth: true  }
  },

  // AI咨询
  ai: {
    chat:        { path: '/api/ai/chat',          method: 'POST',   auth: true  },
    questions:   { path: '/api/ai/quick-questions', method: 'GET',  auth: false }
  },

  // 消息通知
  msg: {
    list:        { path: '/api/msg/list',         method: 'GET',    auth: true  },
    read:        { path: '/api/msg/read',         method: 'PUT',    auth: true  }
  },

  // 数据同步
  sync: {
    trigger:     { path: '/api/sync',             method: 'POST',   auth: true  },
    status:      { path: '/api/sync/status',      method: 'GET',    auth: true  },
    logs:        { path: '/api/sync/logs',        method: 'GET',    auth: true  }
  },

  // 系统
  system: {
    health:      { path: '/api/health',           method: 'GET',    auth: false }
  }
};

module.exports = ApiRoutes;
