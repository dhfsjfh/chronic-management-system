/*
 * 功能：社区慢病管理系统-模拟数据层
 * 用途：正式运行
 * AI辅助：Cursor生成，已人工理解、修改并优化
 */

// AI辅助生成：Cursor，已人工修改适配
var MockData = (function () {
  var STORAGE_KEY = 'cdm_complete_data';

  /**
   * 初始化或读取本地数据
   * @returns {object}
   */
  function getOrInit() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return generateInitialData();
  }

  /**
   * 生成初始模拟数据
   * @returns {object}
   */
  function generateInitialData() {
    var now = Date.now();
    var day = 86400000;
    var bpList = [];
    var bsList = [];
    var wtList = [];

    // 最近7天血压数据
    for (var i = 6; i >= 0; i--) {
      var date = new Date(now - i * day);
      bpList.push({
        date: formatShortDate(date),
        systolic: Math.round(120 + Math.random() * 30),
        diastolic: Math.round(75 + Math.random() * 20)
      });
    }

    // 最近7天血糖数据
    for (var i = 6; i >= 0; i--) {
      var date = new Date(now - i * day);
      bsList.push({
        date: formatShortDate(date),
        value: (5.0 + Math.random() * 3).toFixed(1),
        type: Math.random() > 0.5 ? '空腹' : '餐后'
      });
    }

    // 最近7天体重数据
    for (var i = 6; i >= 0; i--) {
      var date = new Date(now - i * day);
      wtList.push({
        date: formatShortDate(date),
        value: (65 + Math.random() * 5).toFixed(1)
      });
    }

    var data = {
      userInfo: {
        nickName: '李建国',
        avatarUrl: '',
        cardNo: 'CDM20260001',
        age: 65,
        gender: '男',
        diagnosis: '2型糖尿病、高血压'
      },
      healthData: {
        bloodPressures: bpList,
        bloodSugars: bsList,
        weights: wtList
      },
      checkinRecords: [],
      aiMessages: [],
      syncLogs: generateSyncLogs(),
      syncStats: {
        totalUploads: 42,
        totalDownloads: 38,
        dataSize: '2.4 MB'
      },
      lastSyncTime: '2026-04-28 19:00'
    };

    saveToStorage(data);
    return data;
  }

  /**
   * 格式化为 MM-dd
   */
  function formatShortDate(date) {
    var m = (date.getMonth() + 1).toString().padStart(2, '0');
    var d = date.getDate().toString().padStart(2, '0');
    return m + '-' + d;
  }

  /**
   * 生成模拟同步日志
   * @returns {object[]}
   */
  function generateSyncLogs() {
    return [
      { time: '2026-04-28 19:00', type: 'upload', status: 'success', detail: '健康打卡数据同步成功 (血压/血糖/体重)' },
      { time: '2026-04-28 15:30', type: 'download', status: 'success', detail: '获取医生随访计划更新' },
      { time: '2026-04-28 09:15', type: 'upload', status: 'success', detail: 'AI咨询记录同步' },
      { time: '2026-04-27 22:00', type: 'upload', status: 'success', detail: '健康打卡数据同步成功' },
      { time: '2026-04-27 15:00', type: 'download', status: 'success', detail: '获取健康资讯更新' },
      { time: '2026-04-27 09:00', type: 'upload', status: 'warning', detail: '部分数据同步延迟 (网络波动)' },
      { time: '2026-04-26 20:00', type: 'upload', status: 'success', detail: '健康打卡数据同步成功' }
    ];
  }

  /**
   * 保存数据到 localStorage
   */
  function saveToStorage(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * 获取用户信息
   * @returns {object}
   */
  function getUserInfo() {
    return getOrInit().userInfo;
  }

  /**
   * 获取最新健康数据摘要
   * @returns {{bloodPressure: string, bloodSugar: string, weight: string}}
   */
  function getLatestHealth() {
    var data = getOrInit();
    var bp = data.healthData.bloodPressures;
    var bs = data.healthData.bloodSugars;
    var w = data.healthData.weights;

    return {
      bloodPressure: bp.length > 0 ? bp[bp.length - 1].systolic + '/' + bp[bp.length - 1].diastolic : '--/--',
      bloodSugar: bs.length > 0 ? bs[bs.length - 1].value : '--',
      weight: w.length > 0 ? w[w.length - 1].value : '--'
    };
  }

  /**
   * 获取所有健康数据
   * @returns {object}
   */
  function getHealthData() {
    return getOrInit().healthData;
  }

  /**
   * 添加打卡记录
   * @param {object} record - { date, bloodPressure, bloodSugar, weight }
   */
  function addCheckinRecord(record) {
    var data = getOrInit();
    data.checkinRecords.unshift(record);
    saveToStorage(data);
  }

  /**
   * 获取打卡记录
   * @param {number} [limit=20] - 获取条数
   * @returns {object[]}
   */
  function getCheckinRecords(limit) {
    var data = getOrInit();
    limit = limit || 20;
    return (data.checkinRecords || []).slice(0, limit);
  }

  /**
   * 添加AI聊天消息
   * @param {object} message - { id, role, content, time }
   */
  function addAiMessage(message) {
    var data = getOrInit();
    if (!data.aiMessages) data.aiMessages = [];
    data.aiMessages.push(message);
    saveToStorage(data);
  }

  /**
   * 获取AI聊天历史
   * @returns {object[]}
   */
  function getAiMessages() {
    return getOrInit().aiMessages || [];
  }

  /**
   * 获取同步日志
   * @returns {object[]}
   */
  function getSyncLogs() {
    return getOrInit().syncLogs || [];
  }

  /**
   * 获取同步统计
   * @returns {object}
   */
  function getSyncStats() {
    return getOrInit().syncStats || { totalUploads: 0, totalDownloads: 0, dataSize: '0 KB' };
  }

  /**
   * 获取上次同步时间
   * @returns {string}
   */
  function getLastSyncTime() {
    return getOrInit().lastSyncTime || '从未同步';
  }

  /**
   * 添加同步日志
   * @param {object} log - { time, type, status, detail }
   */
  function addSyncLog(log) {
    var data = getOrInit();
    if (!data.syncLogs) data.syncLogs = [];
    data.syncLogs.unshift(log);
    data.lastSyncTime = log.time;
    data.syncStats.totalUploads += 1;
    saveToStorage(data);
  }

  /**
   * 重置所有数据
   */
  function resetData() {
    localStorage.removeItem(STORAGE_KEY);
    generateInitialData();
  }

  return {
    getUserInfo: getUserInfo,
    getLatestHealth: getLatestHealth,
    getHealthData: getHealthData,
    addCheckinRecord: addCheckinRecord,
    getCheckinRecords: getCheckinRecords,
    addAiMessage: addAiMessage,
    getAiMessages: getAiMessages,
    getSyncLogs: getSyncLogs,
    getSyncStats: getSyncStats,
    getLastSyncTime: getLastSyncTime,
    addSyncLog: addSyncLog,
    resetData: resetData
  };
})();
