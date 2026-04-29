/*
 * 功能：社区慢病管理系统-加载动画组件
 * 用途：正式运行
 * AI辅助：Cursor生成，已人工理解、修改并优化
 */

// AI辅助生成：Cursor，已人工修改适配

/**
 * 加载动画管理器
 */
var Loading = (function () {

  var overlay = null;

  /**
   * 显示加载动画
   * @param {string} [text='加载中...'] - 加载提示文字
   */
  function show(text) {
    hide();
    text = text || '加载中...';
    overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = [
      '<div class="loading-box">',
      '  <div class="spinner"></div>',
      '  <div style="font-size:16px;color:#666;">' + text + '</div>',
      '</div>'
    ].join('\n');
    document.body.appendChild(overlay);
  }

  /**
   * 隐藏加载动画
   */
  function hide() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      overlay = null;
    }
  }

  return {
    show: show,
    hide: hide
  };
})();
