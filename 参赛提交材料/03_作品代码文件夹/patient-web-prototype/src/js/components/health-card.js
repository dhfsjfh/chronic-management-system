/*
 * 功能：社区慢病管理系统-健康指标卡片组件
 * 用途：正式运行
 * AI辅助：Cursor生成，已人工理解、修改并优化
 */

// AI辅助生成：Cursor，已人工修改适配

/**
 * 创建健康指标卡片HTML
 * @param {object} options - 配置项
 * @param {string} options.title - 卡片标题
 * @param {string} options.value - 数值
 * @param {string} options.unit - 单位
 * @param {string} options.status - 状态（正常/偏高/高）
 * @param {string} [options.color='#1a73e8'] - 数值颜色
 * @returns {string} HTML字符串
 */
function createHealthCard(options) {
  var title = options.title || '';
  var value = options.value || '--';
  var unit = options.unit || '';
  var status = options.status || '正常';
  var color = options.color || '#1a73e8';
  var statusClass = getStatusClassForCard(status);

  return [
    '<div class="health-card">',
    '  <span class="hc-title">' + title + '</span>',
    '  <span class="hc-value" style="color:' + color + '">' + value + '</span>',
    '  <span class="hc-unit">' + unit + '</span>',
    '  <span class="hc-status ' + statusClass + '">' + status + '</span>',
    '</div>'
  ].join('\n');
}

/**
 * 创建一行健康卡片组
 * @param {Array} cards - 卡片配置数组
 * @returns {string} HTML字符串
 */
function createHealthCardRow(cards) {
  var html = '<div class="health-card-row">';
  cards.forEach(function (card) {
    html += createHealthCard(card);
  });
  html += '</div>';
  return html;
}

/**
 * 状态到样式映射
 */
function getStatusClassForCard(status) {
  var map = {
    '正常': 'status-normal',
    '偏高': 'status-warning',
    '高': 'status-danger'
  };
  return map[status] || 'status-normal';
}
