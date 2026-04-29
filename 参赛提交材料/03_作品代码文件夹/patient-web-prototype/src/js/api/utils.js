/*
 * 功能：社区慢病管理系统-工具函数模块
 * 用途：正式运行
 * AI辅助：Cursor生成，已人工理解、修改并优化
 */

// AI辅助生成：Cursor，已人工修改适配
var AppUtils = (function () {

  /**
   * 格式化日期
   * @param {Date|string|number} date - 日期对象/字符串/时间戳
   * @param {string} [fmt='yyyy-MM-dd HH:mm:ss'] - 格式模板
   * @returns {string}
   */
  function formatDate(date, fmt) {
    if (!date) return '';
    if (typeof date === 'string' || typeof date === 'number') {
      date = new Date(date);
    }
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    fmt = fmt || 'yyyy-MM-dd HH:mm:ss';

    var o = {
      'M+': date.getMonth() + 1,
      'd+': date.getDate(),
      'H+': date.getHours(),
      'm+': date.getMinutes(),
      's+': date.getSeconds()
    };

    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
      if (new RegExp('(' + k + ')').test(fmt)) {
        fmt = fmt.replace(RegExp.$1, RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length));
      }
    }
    return fmt;
  }

  /**
   * 获取今日日期字符串 yyyy-MM-dd
   * @returns {string}
   */
  function getToday() {
    return formatDate(new Date(), 'yyyy-MM-dd');
  }

  /**
   * 获取当前时间 HH:mm
   * @returns {string}
   */
  function getNowTime() {
    return formatDate(new Date(), 'HH:mm');
  }

  /**
   * 生成随机ID
   * @returns {string}
   */
  function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  /**
   * 校验血压值
   * @param {number} systolic - 收缩压
   * @param {number} diastolic - 舒张压
   * @returns {{valid: boolean, errors: string[]}}
   */
  function validateBloodPressure(systolic, diastolic) {
    var errors = [];
    if (!systolic || isNaN(systolic) || systolic < 60 || systolic > 250) {
      errors.push('收缩压范围：60-250 mmHg');
    }
    if (!diastolic || isNaN(diastolic) || diastolic < 30 || diastolic > 180) {
      errors.push('舒张压范围：30-180 mmHg');
    }
    return { valid: errors.length === 0, errors: errors };
  }

  /**
   * 校验血糖值
   * @param {number} value - 血糖值
   * @returns {{valid: boolean, errors: string[]}}
   */
  function validateBloodSugar(value) {
    if (!value || isNaN(value) || value < 1.0 || value > 33.0) {
      return { valid: false, errors: ['血糖范围：1.0-33.0 mmol/L'] };
    }
    return { valid: true, errors: [] };
  }

  /**
   * 校验体重值
   * @param {number} value - 体重值
   * @returns {{valid: boolean, errors: string[]}}
   */
  function validateWeight(value) {
    if (!value || isNaN(value) || value < 20 || value > 300) {
      return { valid: false, errors: ['体重范围：20-300 kg'] };
    }
    return { valid: true, errors: [] };
  }

  /**
   * 血压自动分级判定
   * @param {number} systolic - 收缩压
   * @param {number} diastolic - 舒张压
   * @returns {string} '正常'|'偏高'|'高'
   */
  function getBloodPressureLevel(systolic, diastolic) {
    if (systolic < 120 && diastolic < 80) return '正常';
    if (systolic < 140 && diastolic < 90) return '偏高';
    return '高';
  }

  /**
   * 血糖分级判定
   * @param {number} value - 血糖值
   * @param {string} type - '空腹' 或 '餐后'
   * @returns {string}
   */
  function getBloodSugarLevel(value, type) {
    if (type === '空腹') {
      if (value < 6.1) return '正常';
      if (value < 7.0) return '偏高';
      return '高';
    }
    if (value < 7.8) return '正常';
    if (value < 11.1) return '偏高';
    return '高';
  }

  /**
   * 健康状态对应样式class
   * @param {string} level - 分级结果
   * @returns {string}
   */
  function getStatusClass(level) {
    var map = {
      '正常': 'status-normal',
      '偏高': 'status-warning',
      '高': 'status-danger'
    };
    return map[level] || 'status-normal';
  }

  /**
   * 显示Toast提示
   * @param {string} message - 提示内容
   * @param {number} [duration=2000] - 显示时长(ms)
   */
  function toast(message, duration) {
    duration = duration || 2000;
    var el = document.getElementById('app-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'app-toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.display = 'block';
    clearTimeout(el._timer);
    el._timer = setTimeout(function () {
      el.style.display = 'none';
    }, duration);
  }

  /**
   * 显示确认弹窗
   * @param {string} title - 标题
   * @param {string} content - 内容
   * @param {string} [confirmText='确定'] - 确认按钮文字
   * @param {function} onConfirm - 确认回调
   */
  function confirm(title, content, confirmText, onConfirm) {
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML =
      '<div class="modal-box">' +
      '<div class="modal-title">' + escapeHtml(title) + '</div>' +
      '<div class="modal-content">' + escapeHtml(content) + '</div>' +
      '<div class="modal-actions">' +
      '<button class="btn btn-secondary" id="modal-cancel">取消</button>' +
      '<button class="btn btn-primary" id="modal-confirm">' + (confirmText || '确定') + '</button>' +
      '</div></div>';
    document.body.appendChild(mask);

    document.getElementById('modal-cancel').onclick = function () {
      mask.remove();
    };
    document.getElementById('modal-confirm').onclick = function () {
      mask.remove();
      if (typeof onConfirm === 'function') onConfirm();
    };
    mask.onclick = function (e) {
      if (e.target === mask) mask.remove();
    };
  }

  /**
   * 显示信息弹窗（无取消按钮）
   * @param {string} title - 标题
   * @param {string} content - 内容
   * @param {function} onClose - 关闭回调
   */
  function alert(title, content, onClose) {
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML =
      '<div class="modal-box">' +
      '<div class="modal-title">' + escapeHtml(title) + '</div>' +
      '<div class="modal-content">' + escapeHtml(content) + '</div>' +
      '<div class="modal-actions">' +
      '<button class="btn btn-primary" id="modal-ok">知道了</button>' +
      '</div></div>';
    document.body.appendChild(mask);

    document.getElementById('modal-ok').onclick = function () {
      mask.remove();
      if (typeof onClose === 'function') onClose();
    };
    mask.onclick = function (e) {
      if (e.target === mask) mask.remove();
    };
  }

  /**
   * HTML实体转义
   * @param {string} str - 原始字符串
   * @returns {string}
   */
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  return {
    formatDate: formatDate,
    getToday: getToday,
    getNowTime: getNowTime,
    generateId: generateId,
    validateBloodPressure: validateBloodPressure,
    validateBloodSugar: validateBloodSugar,
    validateWeight: validateWeight,
    getBloodPressureLevel: getBloodPressureLevel,
    getBloodSugarLevel: getBloodSugarLevel,
    getStatusClass: getStatusClass,
    toast: toast,
    confirm: confirm,
    alert: alert,
    escapeHtml: escapeHtml
  };
})();
