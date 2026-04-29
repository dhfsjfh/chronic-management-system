/*
 * 功能：社区慢病管理系统-Coze平台客户端
 * 用途：正式运行
 * AI辅助：Cursor生成，已人工理解、修改并优化
 */

// AI辅助生成：Cursor，已人工修改适配

/**
 * Coze API配置接口
 * 用于与Coze多智能体平台进行数据同步
 */
var CozeClient = (function () {
  var CONFIG = {
    baseUrl: 'https://api.coze.cn/v1',
    pat: '',
    workspaceId: '',
    botId: '',
    workflowId: ''
  };

  /**
   * 加载配置
   */
  function loadConfig() {
    var stored = localStorage.getItem('cdm_coze_config');
    if (stored) {
      try {
        var cfg = JSON.parse(stored);
        CONFIG.pat = cfg.patToken || CONFIG.pat;
        CONFIG.workspaceId = cfg.workspaceId || CONFIG.workspaceId;
        CONFIG.botId = cfg.botId || CONFIG.botId;
        CONFIG.workflowId = cfg.workflowId || CONFIG.workflowId;
      } catch (e) {
        // 使用默认配置
      }
    }
  }

  /**
   * 更新Coze配置
   * @param {object} config - { patToken, workspaceId, botId, workflowId }
   */
  function updateConfig(config) {
    if (config.patToken) CONFIG.pat = config.patToken;
    if (config.workspaceId) CONFIG.workspaceId = config.workspaceId;
    if (config.botId) CONFIG.botId = config.botId;
    if (config.workflowId) CONFIG.workflowId = config.workflowId;
    localStorage.setItem('cdm_coze_config', JSON.stringify(CONFIG));
  }

  /**
   * 获取当前配置
   * @returns {object}
   */
  function getConfig() {
    loadConfig();
    return {
      patToken: CONFIG.pat ? CONFIG.pat.substr(0, 10) + '...' : '',
      workspaceId: CONFIG.workspaceId,
      botId: CONFIG.botId,
      workflowId: CONFIG.workflowId
    };
  }

  /**
   * 检测配置是否完整
   * @returns {boolean}
   */
  function isConfigured() {
    loadConfig();
    return !!(CONFIG.pat && CONFIG.workspaceId && CONFIG.botId);
  }

  /**
   * 提交健康数据到Coze
   * @param {object} healthData - { type, value, date, userId }
   * @returns {Promise}
   */
  function submitHealthData(healthData) {
    if (!isConfigured()) {
      return Promise.reject(new Error('Coze配置未完成，请先在设置中配置'));
    }

    return fetch(CONFIG.baseUrl + '/workflow/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CONFIG.pat
      },
      body: JSON.stringify({
        workflow_id: CONFIG.workflowId,
        parameters: {
          user_id: healthData.userId || 'CDM20260001',
          data_type: healthData.type || 'checkin',
          content: JSON.stringify(healthData),
          source: 'patient_app'
        }
      })
    }).then(function (res) {
      return res.json();
    });
  }

  /**
   * 从Coze获取最新数据
   * @param {string} userId - 用户ID
   * @returns {Promise}
   */
  function getLatestData(userId) {
    if (!isConfigured()) {
      return Promise.reject(new Error('Coze配置未完成'));
    }

    return fetch(CONFIG.baseUrl + '/workflow/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CONFIG.pat
      },
      body: JSON.stringify({
        workflow_id: CONFIG.workflowId,
        parameters: {
          user_id: userId || 'CDM20260001',
          action: 'get_latest'
        }
      })
    }).then(function (res) {
      return res.json();
    });
  }

  /**
   * 发送消息到Coze Bot
   * @param {string} message - 用户消息
   * @returns {Promise}
   */
  function sendBotMessage(message) {
    if (!isConfigured()) {
      return Promise.reject(new Error('Coze配置未完成'));
    }

    return fetch(CONFIG.baseUrl + '/bot/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CONFIG.pat
      },
      body: JSON.stringify({
        bot_id: CONFIG.botId,
        user_id: 'user_' + Date.now(),
        query: message,
        stream: false
      })
    }).then(function (res) {
      return res.json();
    });
  }

  // 初始化加载
  loadConfig();

  return {
    updateConfig: updateConfig,
    getConfig: getConfig,
    isConfigured: isConfigured,
    submitHealthData: submitHealthData,
    getLatestData: getLatestData,
    sendBotMessage: sendBotMessage
  };
})();
