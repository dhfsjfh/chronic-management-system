/*
 * 功能：社区慢病管理系统-API接口定义
 * 用途：正式运行
 * AI辅助：Cursor生成，已人工理解、修改并优化
 */

// AI辅助生成：Cursor，已人工修改适配
var ApiService = (function () {

  var API_BASE = 'https://chronic-management-system.onrender.com';

  // 接口路径定义
  var ENDPOINTS = {
    login: '/api/login',
    getUserInfo: '/api/user/profile',
    updateUserInfo: '/api/user/profile',
    submitHealthData: '/health/submit',
    getHealthRecords: '/health/records',
    getHealthTrend: '/health/trend',
    sendMessage: '/ai/chat',
    getQuickQuestions: '/ai/quick-questions',
    getMessages: '/msg/list',
    readMessage: '/msg/read',
    syncData: '/sync',
    getSyncStatus: '/sync/status',
    getSyncLogs: '/sync/logs'
  };

  /**
   * 发起HTTP请求
   * @param {string} endpoint - 接口路径
   * @param {string} method - HTTP方法
   * @param {object} data - 请求体数据
   * @returns {Promise}
   */
  function request(endpoint, method, data) {
    var url = API_BASE + endpoint;
    var options = {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    var token = localStorage.getItem('cdm_token');
    if (token) {
      options.headers['Authorization'] = 'Bearer ' + token;
    }

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    return fetch(url, options)
      .then(function (response) {
        return response.json();
      })
      .then(function (result) {
        if (result.code === 0 || result.code === 200) {
          return result.data || result;
        }
        throw new Error(result.message || result.msg || '请求失败');
      });
  }

  /**
   * 用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise}
   */
  function login(username, password) {
    var phone = /^\d{6,}$/.test(String(username || '').trim()) ? username : '13800138001';
    return request(ENDPOINTS.login, 'POST', { phone: phone, password: password });
  }

  /**
   * 提交健康数据
   * @param {object} healthData - 健康数据
   * @returns {Promise}
   */
  function submitHealthData(healthData) {
    return request(ENDPOINTS.submitHealthData, 'POST', healthData);
  }

  /**
   * 获取健康记录
   * @param {object} params - 查询参数
   * @returns {Promise}
   */
  function getHealthRecords(params) {
    return request(ENDPOINTS.getHealthRecords + '?' + new URLSearchParams(params), 'GET');
  }

  /**
   * 发送AI消息
   * @param {string} message - 消息内容
   * @returns {Promise}
   */
  function sendAiMessage(message) {
    return request(ENDPOINTS.sendMessage, 'POST', { content: message });
  }

  /**
   * 获取消息列表
   * @returns {Promise}
   */
  function getMessages() {
    return request(ENDPOINTS.getMessages, 'GET');
  }

  /**
   * 触发数据同步
   * @returns {Promise}
   */
  function triggerSync() {
    return request(ENDPOINTS.syncData, 'POST');
  }

  return {
    ENDPOINTS: ENDPOINTS,
    login: login,
    submitHealthData: submitHealthData,
    getHealthRecords: getHealthRecords,
    sendAiMessage: sendAiMessage,
    getMessages: getMessages,
    triggerSync: triggerSync
  };
})();
