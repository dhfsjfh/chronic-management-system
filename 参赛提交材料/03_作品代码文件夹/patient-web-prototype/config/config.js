/*
 * 功能：社区慢病管理系统-应用全局配置
 * 用途：正式运行
 * AI辅助：Cursor生成，已人工理解、修改并优化
 */

// AI辅助生成：Cursor，已人工修改适配
var AppConfig = (function () {

  var config = {
    // 应用信息
    appName: '社区慢病管理系统',
    version: '2.0.0',
    buildDate: '2026-04',

    // API配置
    apiBaseUrl: localStorage.getItem('cdm_api_base') || 'https://api.example.com/v1',
    requestTimeout: 10000,

    // 模拟数据开关（生产环境关闭）
    useMockData: localStorage.getItem('cdm_use_mock') !== 'false',

    // Coze平台配置（占位）
    coze: {
      patToken: '',
      workspaceId: '',
      botId: ''
    },

    // 健康指标阈值
    thresholds: {
      bloodPressure: {
        systolic: { normal: 120, warning: 140 },
        diastolic: { normal: 80, warning: 90 }
      },
      bloodSugar: {
        fasting: { normal: 6.1, warning: 7.0 },
        postprandial: { normal: 7.8, warning: 11.1 }
      },
      weight: {
        min: 20,
        max: 300
      }
    },

    // UI配置
    ui: {
      pageSize: 20,
      chartPoints: 30,
      toastDuration: 2000
    }
  };

  /**
   * 获取完整配置
   * @returns {object}
   */
  function getConfig() {
    return config;
  }

  /**
   * 更新配置项
   * @param {string} key - 配置键
   * @param {*} value - 配置值
   */
  function setConfig(key, value) {
    var keys = key.split('.');
    var target = config;
    for (var i = 0; i < keys.length - 1; i++) {
      if (target[keys[i]] === undefined) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
  }

  return {
    getConfig: getConfig,
    setConfig: setConfig
  };
})();
