/*
 * 功能：社区慢病管理系统-应用入口与页面路由
 * 用途：正式运行
 * AI辅助：Cursor生成，已人工理解、修改并优化
 */

// AI辅助生成：Cursor，已人工修改适配
(function () {
  var app = document.getElementById('app');

  /**
   * 渲染页面到 #app 容器
   * @param {string} html - 页面HTML内容
   */
  function render(html) {
    app.innerHTML = html;
  }

  /**
   * 检查登录状态，未登录则跳转登录
   * @returns {boolean}
   */
  function requireAuth() {
    if (!sessionStorage.getItem('cdm_logged_in')) {
      showLogin();
      return false;
    }
    return true;
  }

  // ======================== 页面：登录 ========================

  /**
   * 显示登录页
   */
  window.showLogin = function () {
    render([
      '<div class="login-page">',
      '  <div class="login-card">',
      '    <div style="text-align:center;margin-bottom:28px;">',
      '      <div style="font-size:48px;margin-bottom:8px;">🏥</div>',
      '      <div style="font-size:22px;font-weight:700;color:#1a73e8;">社区慢病管理系统</div>',
      '      <div style="font-size:14px;color:#999;margin-top:4px;">请输入账号密码登录</div>',
      '    </div>',
      '    <div class="login-error" id="loginError"></div>',
      '    <div class="form-group">',
      '      <label class="form-label">👤 用户名</label>',
      '      <input class="input-field" type="text" id="username" placeholder="请输入用户名" value="admin">',
      '    </div>',
      '    <div class="form-group">',
      '      <label class="form-label">🔒 密码</label>',
      '      <input class="input-field" type="password" id="password" placeholder="请输入密码" value="123">',
      '    </div>',
      '    <button class="btn btn-primary" onclick="handleLogin()" style="margin-top:8px;">✅ 登录系统</button>',
      '    <div class="login-tip">演示账号：admin / 123</div>',
      '  </div>',
      '</div>'
    ].join('\n'));

    document.getElementById('password').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleLogin();
    });
  };

  /**
   * 处理登录
   */
  window.handleLogin = function () {
    var username = document.getElementById('username').value.trim();
    var password = document.getElementById('password').value.trim();
    var errorEl = document.getElementById('loginError');

    if (!username || !password) {
      errorEl.textContent = '请输入用户名和密码';
      errorEl.style.display = 'block';
      return;
    }

    ApiService.login(username, password).then(function (result) {
      sessionStorage.setItem('cdm_logged_in', 'true');
      sessionStorage.setItem('cdm_username', username);
      if (result.token) {
        localStorage.setItem('cdm_token', result.token);
      }
      showHome();
    }).catch(function (err) {
      errorEl.textContent = '用户名或密码错误（演示账号：admin / 123）';
      errorEl.style.display = 'block';
    });
  };

  // ======================== 页面：首页 ========================

  /**
   * 显示首页
   */
  window.showHome = function () {
    if (!requireAuth()) return;

    var userInfo = MockData.getUserInfo();
    var health = MockData.getLatestHealth();

    render([
      '<div class="page">',
      '  <div class="user-header">',
      '    <div class="user-avatar">👤</div>',
      '    <div class="user-info-area">',
      '      <span class="user-name">' + userInfo.nickName + '</span>',
      '      <span class="user-cardno">就诊卡号：' + userInfo.cardNo + '</span>',
      '    </div>',
      '    <div style="cursor:pointer;font-size:14px;opacity:0.85;" onclick="handleLogout()">退出</div>',
      '  </div>',
      '  <div class="health-overview">',
      '    <div class="overview-item"><span class="ov-label">❤️ 血压</span><span class="ov-value">' + health.bloodPressure + '</span><span class="ov-unit">mmHg</span></div>',
      '    <div class="overview-divider"></div>',
      '    <div class="overview-item"><span class="ov-label">🩸 血糖</span><span class="ov-value">' + health.bloodSugar + '</span><span class="ov-unit">mmol/L</span></div>',
      '    <div class="overview-divider"></div>',
      '    <div class="overview-item"><span class="ov-label">⚖️ 体重</span><span class="ov-value">' + health.weight + '</span><span class="ov-unit">kg</span></div>',
      '  </div>',
      '  <div class="menu-grid">',
      '    <div class="menu-item" onclick="showCheckin()"><div class="menu-icon-box" style="background:#e8f5e9;">📋</div><span class="menu-text">健康打卡</span></div>',
      '    <div class="menu-item" onclick="showRecord()"><div class="menu-icon-box" style="background:#e3f2fd;">📁</div><span class="menu-text">我的档案</span></div>',
      '    <div class="menu-item" onclick="showAi()"><div class="menu-icon-box" style="background:#fff3e0;">🤖</div><span class="menu-text">AI咨询</span></div>',
      '    <div class="menu-item" onclick="showMsg()"><div class="menu-icon-box" style="background:#ffebee;">🔔</div><span class="menu-text">消息通知</span></div>',
      '  </div>',
      '  <div class="news-card">',
      '    <div class="card-header" style="padding:16px 16px 0;"><span class="card-title">📰 健康资讯</span></div>',
      '    <div class="news-banner" onclick="AppUtils.toast(\'春季血压管理小贴士\')">',
      '      <div style="text-align:center;">',
      '        <div style="font-size:18px;font-weight:600;color:#1a73e8;margin-bottom:6px;">🌱 春季血压管理小贴士</div>',
      '        <div style="font-size:14px;color:#666;">定期监测，平稳度春</div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div style="margin:0 16px 24px;background:#fff;border-radius:16px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">',
      '    <div class="card-header" style="margin-bottom:0;"><span class="card-title">⚡ 快速功能</span></div>',
      '    <div style="display:flex;gap:12px;margin-top:12px;">',
      '      <div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:16px;background:#f8f9fe;border-radius:12px;cursor:pointer;" onclick="showRecord()">',
      '        <span style="font-size:28px;margin-bottom:8px;">📊</span><span style="font-size:14px;font-weight:500;">历史记录</span>',
      '      </div>',
      '      <div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:16px;background:#f8f9fe;border-radius:12px;cursor:pointer;" onclick="showAi()">',
      '        <span style="font-size:28px;margin-bottom:8px;">🤖</span><span style="font-size:14px;font-weight:500;">健康咨询</span>',
      '      </div>',
      '      <div style="flex:1;display:flex;flex-direction:column;align-items:center;padding:16px;background:#f8f9fe;border-radius:12px;cursor:pointer;" onclick="showCheckin()">',
      '        <span style="font-size:28px;margin-bottom:8px;">📋</span><span style="font-size:14px;font-weight:500;">健康打卡</span>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n'));
  };

  // ======================== 数据同步页面 ========================

  /**
   * 显示数据同步页
   */
  window.showDataSync = function () {
    if (!requireAuth()) return;

    var logs = MockData.getSyncLogs();
    var stats = MockData.getSyncStats();
    var lastSync = MockData.getLastSyncTime();

    var logHtml = logs.map(function (log) {
      return [
        '<div class="msg-item" style="margin:0;border-radius:0;border-bottom:1px solid #f0f2f5;">',
        '  <div style="font-size:16px;margin-right:10px;">' + (log.type === 'upload' ? '📤' : '📥') + '</div>',
        '  <div class="msg-body">',
        '    <div style="font-size:13px;color:#1a2332;">' + log.detail + '</div>',
        '    <span style="font-size:11px;color:#b0b8c4;margin-top:4px;display:block;">' + log.time + '</span>',
        '  </div>',
        '  <div style="width:24px;text-align:center;color:' + (log.status === 'success' ? '#4caf50' : '#ff9800') + ';">' + (log.status === 'success' ? '✓' : '⚠') + '</div>',
        '</div>'
      ].join('\n');
    }).join('\n');

    render([
      '<div class="page">',
      '  <div class="nav-bar">',
      '    <div class="nav-back" onclick="showHome()">‹</div>',
      '    <div class="nav-title">📤 数据同步</div>',
      '    <div></div>',
      '  </div>',
      '  <div class="sync-status-card">',
      '    <div class="sync-status-icon">🔄</div>',
      '    <span class="sync-status-title">数据同步</span>',
      '    <span class="sync-status-subtitle">上次同步：' + lastSync + '</span>',
      '    <button class="btn btn-primary btn-sm" onclick="manualSync()" style="margin-top:16px;width:auto;padding:0 32px;">🔄 立即同步</button>',
      '  </div>',
      '  <div class="sync-stats-grid">',
      '    <div class="sync-stat-item"><span class="sync-stat-num">' + stats.totalUploads + '</span><span class="sync-stat-label">上传次数</span></div>',
      '    <div class="sync-stat-item"><span class="sync-stat-num">' + stats.totalDownloads + '</span><span class="sync-stat-label">下载次数</span></div>',
      '    <div class="sync-stat-item"><span class="sync-stat-num">' + stats.dataSize + '</span><span class="sync-stat-label">数据量</span></div>',
      '  </div>',
      '  <div class="card" style="margin-top:0;">',
      '    <div class="card-header"><span class="card-title">🔗 Coze平台对接</span></div>',
      '    <p style="font-size:13px;color:#5a6a7e;margin-bottom:12px;">通过Coze工作流API，实现与社区慢病管理系统数据互通</p>',
      '    <div style="font-size:12px;color:#7a8699;padding:12px;background:#f8f9fb;border-radius:8px;font-family:monospace;">',
      '      工作流ID: 7621844767555026944<br>',
      '      Bot ID: 7633758824825946155',
      '    </div>',
      '  </div>',
      '  <div class="card" style="margin-top:0;">',
      '    <div class="card-header"><span class="card-title">📋 同步日志</span></div>',
      '    ' + logHtml + '</div>',
      '</div>'
    ].join('\n'));
  };

  /**
   * 手动同步（模拟）
   */
  window.manualSync = function () {
    AppUtils.toast('同步中...');
    setTimeout(function () {
      var now = AppUtils.formatDate(new Date(), 'yyyy-MM-dd HH:mm');
      MockData.addSyncLog({
        time: now,
        type: 'upload',
        status: 'success',
        detail: '手动同步成功 (血压/血糖/体重 + 所有待同步数据)'
      });
      AppUtils.toast('✅ 同步成功');
      showDataSync();
    }, 2000);
  };

  // ======================== 页面：健康打卡 ========================

  /**
   * 显示健康打卡页
   */
  window.showCheckin = function () {
    if (!requireAuth()) return;

    render([
      '<div class="page">',
      '  <div class="nav-bar">',
      '    <div class="nav-back" onclick="showHome()">‹</div>',
      '    <div class="nav-title">📋 健康打卡</div>',
      '    <div class="nav-action" id="resetCheckinBtn">重置</div>',
      '  </div>',
      '  <div class="card" style="display:flex;justify-content:space-between;align-items:center;">',
      '    <span style="font-size:18px;font-weight:500;">打卡日期</span>',
      '    <span style="font-size:18px;color:#1a73e8;font-weight:500;" id="checkinDate">' + AppUtils.getToday() + '</span>',
      '  </div>',
      '  <div class="card">',
      '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">',
      '      <span style="font-size:18px;font-weight:600;">❤️ 血压</span>',
      '      <span class="status-tag" id="bpStatusTag" style="display:none;"></span>',
      '    </div>',
      '    <div style="display:flex;align-items:center;">',
      '      <div style="flex:1;">',
      '        <span style="display:block;font-size:14px;color:#888;margin-bottom:8px;">收缩压（高压）</span>',
      '        <div style="display:flex;align-items:center;">',
      '          <input class="input-field" type="number" id="systolic" placeholder="60-250" oninput="updateBpStatus()">',
      '          <span style="font-size:14px;color:#999;margin-left:8px;white-space:nowrap;">mmHg</span>',
      '        </div>',
      '      </div>',
      '      <div style="width:1px;height:50px;background:#e8e8e8;margin:0 16px;"></div>',
      '      <div style="flex:1;">',
      '        <span style="display:block;font-size:14px;color:#888;margin-bottom:8px;">舒张压（低压）</span>',
      '        <div style="display:flex;align-items:center;">',
      '          <input class="input-field" type="number" id="diastolic" placeholder="30-180" oninput="updateBpStatus()">',
      '          <span style="font-size:14px;color:#999;margin-left:8px;white-space:nowrap;">mmHg</span>',
      '        </div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="card">',
      '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">',
      '      <span style="font-size:18px;font-weight:600;">🩸 血糖</span>',
      '      <span class="status-tag" id="bsStatusTag" style="display:none;"></span>',
      '    </div>',
      '    <div style="display:inline-flex;align-items:center;background:#f5f7fa;padding:8px 16px;border-radius:10px;margin-bottom:12px;cursor:pointer;" onclick="toggleBsTypeOptions()">',
      '      <span id="bsTypeLabel" style="font-size:16px;color:#1a73e8;font-weight:500;margin-right:6px;">空腹</span>',
      '      <span style="font-size:12px;color:#999;">▼</span>',
      '    </div>',
      '    <div id="bsTypeOptions" style="display:none;background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:12px;">',
      '      <div style="padding:10px 16px;cursor:pointer;background:#e3f2fd;color:#1a73e8;font-weight:500;" onclick="selectBsType(\'空腹\')">空腹</div>',
      '      <div style="padding:10px 16px;cursor:pointer;" onclick="selectBsType(\'餐后\')">餐后</div>',
      '    </div>',
      '    <div style="display:flex;align-items:center;">',
      '      <input class="input-field" type="number" id="bsValue" placeholder="1.0-33.0" step="0.1" oninput="updateBsStatus()">',
      '      <span style="font-size:14px;color:#999;margin-left:8px;white-space:nowrap;">mmol/L</span>',
      '    </div>',
      '  </div>',
      '  <div class="card">',
      '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">',
      '      <span style="font-size:18px;font-weight:600;">⚖️ 体重</span>',
      '    </div>',
      '    <div style="display:flex;align-items:center;">',
      '      <input class="input-field" type="number" id="weight" placeholder="20-300" step="0.1">',
      '      <span style="font-size:14px;color:#999;margin-left:8px;white-space:nowrap;">kg</span>',
      '    </div>',
      '  </div>',
      '  <div class="card" style="text-align:center;">',
      '    <button class="btn btn-primary" onclick="submitCheckin()">✅ 提交打卡</button>',
      '    <span style="font-size:14px;color:#999;display:block;margin-top:8px;">请确保数据准确后再提交</span>',
      '  </div>',
      '</div>',
      '<div class="checkin-result-overlay" id="checkinResult">',
      '  <div class="checkin-result-card">',
      '    <span style="font-size:48px;margin-bottom:12px;">🎉</span>',
      '    <span style="font-size:22px;font-weight:700;color:#4caf50;margin-bottom:20px;">打卡成功</span>',
      '    <div style="display:flex;justify-content:space-between;width:100%;padding:8px 0;border-bottom:1px solid #f5f5f5;"><span style="font-size:16px;color:#888;">日期</span><span style="font-size:16px;font-weight:500;" id="rDate"></span></div>',
      '    <div style="display:flex;justify-content:space-between;width:100%;padding:8px 0;border-bottom:1px solid #f5f5f5;"><span style="font-size:16px;color:#888;">血压</span><span style="font-size:16px;font-weight:500;" id="rBP"></span></div>',
      '    <div style="display:flex;justify-content:space-between;width:100%;padding:8px 0;border-bottom:1px solid #f5f5f5;"><span style="font-size:16px;color:#888;">血糖</span><span style="font-size:16px;font-weight:500;" id="rBS"></span></div>',
      '    <div style="display:flex;justify-content:space-between;width:100%;padding:8px 0;border-bottom:1px solid #f5f5f5;"><span style="font-size:16px;color:#888;">体重</span><span style="font-size:16px;font-weight:500;" id="rWeight"></span></div>',
      '    <button class="btn btn-secondary" onclick="closeCheckinResult()" style="margin-top:16px;">继续记录</button>',
      '  </div>',
      '</div>'
    ].join('\n'));

    // 挂载重置事件
    document.getElementById('resetCheckinBtn').onclick = resetCheckinForm;
  };

  window.updateBpStatus = function () {
    var systolic = document.getElementById('systolic').value;
    var diastolic = document.getElementById('diastolic').value;
    var el = document.getElementById('bpStatusTag');
    if (systolic && diastolic) {
      var s = parseFloat(systolic);
      var d = parseFloat(diastolic);
      if (!isNaN(s) && !isNaN(d)) {
        var level = AppUtils.getBloodPressureLevel(s, d);
        el.textContent = level;
        el.className = 'status-tag ' + AppUtils.getStatusClass(level);
        el.style.display = 'inline-block';
        return;
      }
    }
    el.style.display = 'none';
  };

  window.toggleBsTypeOptions = function () {
    var el = document.getElementById('bsTypeOptions');
    el.style.display = el.style.display === 'block' ? 'none' : 'block';
  };

  window.selectBsType = function (type) {
    document.getElementById('bsTypeLabel').textContent = type;
    document.getElementById('bsTypeOptions').style.display = 'none';
    updateBsStatus();
  };

  window.updateBsStatus = function () {
    var value = document.getElementById('bsValue').value;
    var type = document.getElementById('bsTypeLabel').textContent;
    var el = document.getElementById('bsStatusTag');
    if (value) {
      var v = parseFloat(value);
      if (!isNaN(v)) {
        var level = AppUtils.getBloodSugarLevel(v, type);
        el.textContent = level;
        el.className = 'status-tag ' + AppUtils.getStatusClass(level);
        el.style.display = 'inline-block';
        return;
      }
    }
    el.style.display = 'none';
  };

  window.submitCheckin = function () {
    var systolic = document.getElementById('systolic').value;
    var diastolic = document.getElementById('diastolic').value;
    var bsValue = document.getElementById('bsValue').value;
    var bsType = document.getElementById('bsTypeLabel').textContent;
    var weight = document.getElementById('weight').value;

    if (!systolic && !diastolic && !bsValue && !weight) {
      AppUtils.toast('请至少填写一项健康数据');
      return;
    }
    if ((systolic || diastolic) && (!systolic || !diastolic)) {
      AppUtils.toast('收缩压和舒张压需同时填写');
      return;
    }

    var errors = [];
    if (systolic && diastolic) {
      var bpCheck = AppUtils.validateBloodPressure(parseFloat(systolic), parseFloat(diastolic));
      if (!bpCheck.valid) errors = errors.concat(bpCheck.errors);
    }
    if (bsValue) {
      var bsCheck = AppUtils.validateBloodSugar(parseFloat(bsValue));
      if (!bsCheck.valid) errors = errors.concat(bsCheck.errors);
    }
    if (weight) {
      var wCheck = AppUtils.validateWeight(parseFloat(weight));
      if (!wCheck.valid) errors = errors.concat(wCheck.errors);
    }

    if (errors.length > 0) {
      AppUtils.alert('数据异常', errors.join('\n'));
      return;
    }

    var today = AppUtils.getToday();
    document.getElementById('rDate').textContent = today;
    document.getElementById('rBP').textContent = systolic ? systolic + '/' + diastolic + ' mmHg' : '未记录';
    document.getElementById('rBS').textContent = bsValue ? bsValue + ' mmol/L (' + bsType + ')' : '未记录';
    document.getElementById('rWeight').textContent = weight ? weight + ' kg' : '未记录';
    document.getElementById('checkinResult').classList.add('show');

    MockData.addCheckinRecord({
      date: today,
      bloodPressure: systolic ? systolic + '/' + diastolic : '--',
      bloodSugar: bsValue ? bsValue + ' (' + bsType + ')' : '--',
      weight: weight || '--'
    });

    AppUtils.toast('✅ 打卡成功');
  };

  window.closeCheckinResult = function () {
    document.getElementById('checkinResult').classList.remove('show');
    resetCheckinForm();
  };

  function resetCheckinForm() {
    var ids = ['systolic', 'diastolic', 'bsValue', 'weight'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    var bpTag = document.getElementById('bpStatusTag');
    var bsTag = document.getElementById('bsStatusTag');
    if (bpTag) bpTag.style.display = 'none';
    if (bsTag) bsTag.style.display = 'none';
    selectBsType('空腹');
  }

  // ======================== 页面：档案记录 ========================

  /**
   * 显示档案记录页
   */
  window.showRecord = function () {
    if (!requireAuth()) return;

    var health = MockData.getLatestHealth();

    render([
      '<div class="page">',
      '  <div class="nav-bar">',
      '    <div class="nav-back" onclick="showHome()">‹</div>',
      '    <div class="nav-title">📁 我的档案</div>',
      '    <div></div>',
      '  </div>',
      '  <div class="health-card-row">',
      '    <div class="health-card"><span class="hc-title">血糖</span><span class="hc-value" style="color:#f44336;">' + health.bloodSugar + '</span><span class="hc-unit">mmol/L</span></div>',
      '    <div class="health-card"><span class="hc-title">血压</span><span class="hc-value" style="color:#ff9800;">' + health.bloodPressure + '</span><span class="hc-unit">mmHg</span></div>',
      '    <div class="health-card"><span class="hc-title">体重</span><span class="hc-value" style="color:#4caf50;">' + health.weight + '</span><span class="hc-unit">kg</span></div>',
      '  </div>',
      '  <div class="tab-group">',
      '    <div class="tab-item active" onclick="switchRecordTab(\'week\', this)">周</div>',
      '    <div class="tab-item" onclick="switchRecordTab(\'month\', this)">月</div>',
      '  </div>',
      '  <div class="chart-card"><div class="chart-card-header"><span class="chart-card-title">💉 血糖趋势</span></div><div class="chart-canvas-wrapper"><canvas id="sugarChart"></canvas></div></div>',
      '  <div class="chart-card"><div class="chart-card-header"><span class="chart-card-title">🩸 血压趋势</span></div><div class="chart-canvas-wrapper"><canvas id="bpChart"></canvas></div></div>',
      '  <div class="chart-card"><div class="chart-card-header"><span class="chart-card-title">⚖️ 体重趋势</span></div><div class="chart-canvas-wrapper"><canvas id="weightChart"></canvas></div></div>',
      '  <div style="margin:0 16px 24px;background:#fff;border-radius:12px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">',
      '    <div style="margin-bottom:10px;font-size:15px;font-weight:600;">📋 打卡记录</div>',
      '    <div id="recordListContainer">暂无数据</div>',
      '  </div>',
      '</div>'
    ].join('\n'));

    drawAllCharts('week');
  };

  var recordTab = 'week';

  /**
   * 切换档案Tab
   */
  window.switchRecordTab = function (tab, el) {
    recordTab = tab;
    document.querySelectorAll('.tab-item').forEach(function (t) { t.classList.remove('active'); });
    if (el) el.classList.add('active');
    drawAllCharts(tab);
  };

  /**
   * 绘制所有图表
   */
  function drawAllCharts(tab) {
    var days = tab === 'week' ? 7 : 30;
    var now = Date.now();
    var day = 86400000;

    var sugarData = [];
    var bpData = [];
    var weightData = [];
    var records = [];

    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(now - i * day);
      var label = (d.getMonth() + 1) + '/' + d.getDate();
      var sugarVal = parseFloat((6.0 + Math.random() * 4).toFixed(1));
      var sbp = 130 + Math.floor(Math.random() * 30);
      var dbp = 80 + Math.floor(Math.random() * 15);

      sugarData.push({ label: label, value: sugarVal });
      bpData.push({ label: label, systolic: sbp });
      weightData.push({ label: label, value: parseFloat((68 + Math.random() * 4).toFixed(1)) });
      records.push({
        date: label,
        bloodSugar: sugarVal.toFixed(1),
        bloodPressure: sbp + '/' + dbp,
        weight: (68 + Math.random() * 4).toFixed(1)
      });
    }

    drawSingleChart('sugarChart', sugarData, '#f44336');
    drawSingleChart('bpChart', bpData, '#ff9800');
    drawSingleChart('weightChart', weightData, '#4caf50');

    // 渲染记录列表
    var listHtml = records.slice(0, 10).map(function (rec) {
      var sugarBad = parseFloat(rec.bloodSugar) > 7.0;
      var bpVal = parseInt(rec.bloodPressure);
      var bpBad = bpVal >= 140;
      return [
        '<div class="record-item">',
        '  <span class="record-date">' + rec.date + '</span>',
        '  <div class="record-values">',
        '    <span class="record-value-item">💉 ' + rec.bloodSugar + ' <span class="record-tag ' + (sugarBad ? 'warn' : 'good') + '">' + (sugarBad ? '偏高' : '正常') + '</span></span>',
        '    <span class="record-value-item">🩸 ' + rec.bloodPressure + ' <span class="record-tag ' + (bpBad ? 'warn' : 'good') + '">' + (bpBad ? '偏高' : '正常') + '</span></span>',
        '    <span class="record-value-item">⚖️ ' + rec.weight + 'kg</span>',
        '  </div>',
        '</div>'
      ].join('\n');
    }).join('\n');

    var listContainer = document.getElementById('recordListContainer');
    if (listContainer) listContainer.innerHTML = listHtml || '暂无数据';
  }

  /**
   * 绘制单值折线图（Canvas）
   */
  function drawSingleChart(canvasId, data, color) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;

    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.parentElement.getBoundingClientRect();
    if (rect.width === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var w = rect.width;
    var h = rect.height;
    var pad = { top: 20, right: 10, bottom: 30, left: 35 };
    var chartW = w - pad.left - pad.right;
    var chartH = h - pad.top - pad.bottom;

    if (!data || data.length === 0) {
      ctx.fillStyle = '#ccc';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据', w / 2, h / 2);
      return;
    }

    var values = data.map(function (d) { return d.value; });
    var labels = data.map(function (d) { return d.label; });
    var minVal = Math.min.apply(null, values);
    var maxVal = Math.max.apply(null, values);
    var range = maxVal - minVal || 1;
    var paddingY = range * 0.15;
    var yMin = Math.max(0, minVal - paddingY);
    var yMax = maxVal + paddingY;

    // 网格线
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (var i = 0; i <= 4; i++) {
      var y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      var val = (yMax - (yMax - yMin) * i / 4).toFixed(1);
      ctx.fillStyle = '#999';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(val, pad.left - 5, y + 4);
    }

    // 计算坐标点
    var points = values.map(function (v, i) {
      return {
        x: pad.left + (chartW / (values.length - 1 || 1)) * i,
        y: pad.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH
      };
    });

    // 填充区域
    ctx.beginPath();
    ctx.moveTo(points[0].x, pad.top + chartH);
    points.forEach(function (p) { ctx.lineTo(p.x, p.y); });
    ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = color + '1a';
    ctx.fill();

    // 绘制折线
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) {
      if (i < points.length - 1) {
        var xc = (points[i].x + points[i + 1].x) / 2;
        var yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      } else {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 数据点
    points.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    });

    // X轴标签
    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    var labelStep = Math.max(1, Math.floor(labels.length / 6));
    labels.forEach(function (label, i) {
      if (i % labelStep === 0 || i === labels.length - 1) {
        ctx.fillText(label, pad.left + (chartW / (labels.length - 1 || 1)) * i, h - 6);
      }
    });
  }

  // ======================== 页面：AI咨询 ========================

  /**
   * 显示AI咨询页
   */
  window.showAi = function () {
    if (!requireAuth()) return;

    render([
      '<div class="page ai-container">',
      '  <div class="nav-bar">',
      '    <div class="nav-back" onclick="showHome()">‹</div>',
      '    <div class="nav-title">🤖 AI健康咨询</div>',
      '    <div></div>',
      '  </div>',
      '  <div class="ai-body" id="aiBody">',
      '    <div id="quickQuestions">',
      '      <div class="quick-title">💡 快速提问</div>',
      '      <div class="question-list">',
      '        <div class="question-item" onclick="askQuick(\'📊 我的血糖正常吗？\')">📊 我的血糖正常吗？</div>',
      '        <div class="question-item" onclick="askQuick(\'🍎 糖尿病怎么吃？\')">🍎 糖尿病怎么吃？</div>',
      '        <div class="question-item" onclick="askQuick(\'🏃 适合什么运动？\')">🏃 适合什么运动？</div>',
      '        <div class="question-item" onclick="askQuick(\'💊 用药提醒\')">💊 用药提醒</div>',
      '      </div>',
      '    </div>',
      '    <div id="aiMessageList"></div>',
      '  </div>',
      '  <div class="chat-input-bar">',
      '    <input type="text" id="aiInput" placeholder="输入你的问题..." onkeydown="onAiInputKeydown(event)" oninput="toggleAiSendBtn()">',
      '    <button class="chat-send-btn" id="aiSendBtn" onclick="sendAiMessage()">➤</button>',
      '  </div>',
      '</div>'
    ].join('\n'));

    // 显示欢迎消息
    addAiChatMessage('assistant', '你好！我是你的AI健康助手 🤖\n\n有什么关于健康的问题都可以问我，比如：\n• 查看我的血糖/血压分析\n• 饮食和运动建议\n• 用药咨询\n• 报告解读');
  };

  var mockReplies = {
    '血糖': '根据你的近几次记录：\n\n4月26日空腹9.2，4月27日9.8，今日10.1mmol/L，呈持续上升趋势。\n\n建议：\n1️⃣ 控制主食摄入量\n2️⃣ 餐后适当走动15-20分钟\n3️⃣ 联系社区医生评估是否需要调整药物',
    '吃': '糖尿病的饮食原则：\n\n🥦 多吃：绿叶蔬菜、全谷物\n❌ 少吃：精米白面、含糖饮料\n⏰ 定时定量，少食多餐\n🥩 优质蛋白：鱼、鸡胸肉、豆制品',
    '运动': '适合的运动建议：\n\n🚶 快走：每天30分钟\n🧘 太极拳：锻炼平衡\n🏊 游泳：保护关节\n\n⚠️ 运动前测血糖，<5.6mmol/L先加餐',
    '用药': '当前用药方案：\n\n1️⃣ 格列美脲 2mg 早餐前\n2️⃣ 二甲双胍 500mg 三餐后\n3️⃣ 氨氯地平 5mg 晨起\n\n氨氯地平即将用完，记得联系医生续方。'
  };

  /**
   * 添加AI聊天消息
   */
  function addAiChatMessage(role, content) {
    var container = document.getElementById('aiMessageList');
    if (!container) return;

    var now = AppUtils.getNowTime();
    var avatarText = role === 'assistant' ? '🤖' : '👤';
    var avatarClass = role === 'assistant' ? 'ai' : 'user-ava';

    var div = document.createElement('div');
    div.className = 'chat-message ' + role;
    div.innerHTML = [
      '<div class="chat-avatar ' + avatarClass + '">' + avatarText + '</div>',
      '<div class="chat-content">',
      '  <div class="chat-bubble">' + content + '</div>',
      '  <span class="chat-time">' + now + '</span>',
      '</div>'
    ].join('\n');

    container.appendChild(div);

    // 隐藏快捷问题
    var qq = document.getElementById('quickQuestions');
    if (qq) qq.style.display = 'none';

    // 滚动到底部
    var body = document.getElementById('aiBody');
    if (body) body.scrollTop = body.scrollHeight;
  }

  /**
   * 快捷提问
   */
  window.askQuick = function (text) {
    addAiChatMessage('user', text);
    setTimeout(function () {
      var reply = getMockReply(text);
      addAiChatMessage('assistant', reply);
    }, 600 + Math.random() * 400);
  };

  /**
   * 发送消息
   */
  window.sendAiMessage = function () {
    var input = document.getElementById('aiInput');
    var text = input.value.trim();
    if (!text) return;

    input.value = '';
    document.getElementById('aiSendBtn').classList.remove('active');

    addAiChatMessage('user', text);
    setTimeout(function () {
      addAiChatMessage('assistant', getMockReply(text));
    }, 800 + Math.random() * 600);
  };

  /**
   * AI输入框按键
   */
  window.onAiInputKeydown = function (e) {
    if (e.key === 'Enter') sendAiMessage();
  };

  window.toggleAiSendBtn = function () {
    var input = document.getElementById('aiInput');
    var btn = document.getElementById('aiSendBtn');
    if (input && btn) {
      btn.classList.toggle('active', input.value.trim().length > 0);
    }
  };

  function getMockReply(text) {
    for (var key in mockReplies) {
      if (text.indexOf(key) !== -1) {
        return mockReplies[key];
      }
    }
    return '感谢你的提问！我已记录你的问题，建议你联系社区医生获取更详细的指导。你也可以点击上方快捷问题，查看常见健康建议。';
  }

  // ======================== 页面：消息通知 ========================

  /**
   * 显示消息通知页
   */
  window.showMsg = function () {
    if (!requireAuth()) return;

    var msgData = [
      { id: 1, icon: '📋', iconBg: '#e3f2fd', title: '随访提醒', preview: '您的下次慢病随访安排在5月5日，请按时到社区卫生中心就诊。', time: '今天 09:00', unread: true },
      { id: 2, icon: '💊', iconBg: '#e8f5e9', title: '用药提醒', preview: '您的氨氯地平即将用完，请及时续方。可在线联系家庭医生开具处方。', time: '昨天 18:30', unread: true },
      { id: 3, icon: '📊', iconBg: '#fff3e0', title: '健康周报已生成', preview: '上周您的血压控制情况：平均138/86mmHg，较前一周改善。', time: '昨天 08:00', unread: false },
      { id: 4, icon: '🎓', iconBg: '#e3f2fd', title: '健康讲座通知', preview: '本周五下午3:00 社区健康讲座：春季血糖管理要点。', time: '4月26日', unread: false },
      { id: 5, icon: '✅', iconBg: '#e8f5e9', title: '打卡提醒', preview: '您已连续打卡12天，继续保持！', time: '4月25日', unread: false },
      { id: 6, icon: '🤖', iconBg: '#f3e5f5', title: 'AI健康建议', preview: '根据您近期的血糖数据，建议控制晚餐碳水化合物摄入。', time: '4月24日', unread: false }
    ];

    var unreadCount = msgData.filter(function (m) { return m.unread; }).length;

    var listHtml = msgData.map(function (msg) {
      return [
        '<div class="msg-item" onclick="viewMessage(\'' + msg.id + '\')">',
        '  <div class="msg-icon" style="background:' + msg.iconBg + ';">' + msg.icon + '</div>',
        '  <div class="msg-body">',
        '    <div style="display:flex;justify-content:space-between;align-items:center;">',
        '      <span class="msg-title ' + (msg.unread ? 'unread' : '') + '">' + msg.title + '</span>',
        msg.unread ? '<span class="unread-dot"></span>' : '',
        '    </div>',
        '    <div class="msg-preview">' + msg.preview + '</div>',
        '    <span class="msg-time">' + msg.time + '</span>',
        '  </div>',
        '</div>'
      ].join('\n');
    }).join('\n');

    render([
      '<div class="page">',
      '  <div class="nav-bar">',
      '    <div class="nav-back" onclick="showHome()">‹</div>',
      '    <div class="nav-title">🔔 消息通知</div>',
      '    <div></div>',
      '  </div>',
      '  <div class="msg-header-actions">',
      '    <span class="msg-count">共 ' + msgData.length + ' 条消息</span>',
      unreadCount > 0 ? '<span class="msg-clear-all" onclick="AppUtils.confirm(\'提示\',\'确认全部标为已读？\',\'确定\',function(){AppUtils.toast(\'已全部标为已读\');showMsg();})">全部标为已读</span>' : '',
      '  </div>',
      listHtml,
      '</div>'
    ].join('\n'));
  };

  window.viewMessage = function (id) {
    AppUtils.alert('消息详情', '功能详情展示中...');
  };

  // ======================== 退出登录 ========================

  /**
   * 退出登录
   */
  window.handleLogout = function () {
    AppUtils.confirm('退出确认', '确定要退出登录吗？', '确定退出', function () {
      sessionStorage.removeItem('cdm_logged_in');
      sessionStorage.removeItem('cdm_username');
      showLogin();
    });
  };

  // ======================== 初始化 ========================

  // 页面加载后判断是否已登录
  if (requireAuth()) {
    showHome();
  } else {
    showLogin();
  }
})();
