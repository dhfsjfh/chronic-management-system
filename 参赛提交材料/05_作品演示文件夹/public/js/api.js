(function (w) {
  var mockCache = null;

  function isStatic() {
    return Boolean(w.__DEMO_STATIC__) === true;
  }

  function apiBase() {
    var b = typeof w.__API_BASE_PATH__ === 'string' ? w.__API_BASE_PATH__.replace(/\/+$/, '') : '';
    var origin = typeof w.__API_ORIGIN__ === 'string' ? w.__API_ORIGIN__.replace(/\/+$/, '') : '';
    var base = b === '' ? '/api' : b + '/api';
    return origin ? origin + base : base;
  }

  /** 将 '/api/patients' 或 'patients' 统一为远端路径 */
  function apiUrl(rest) {
    rest = typeof rest === 'string' ? rest : '';
    rest = rest.replace(/^\/?api\/?/, '').replace(/^\/+/, '');
    var base = apiBase().replace(/\/+$/, '');
    return rest === '' ? base || '/api' : base + '/' + rest;
  }

  function headers() {
    var h = { 'Content-Type': 'application/json' };
    var t = token();
    if (t) h.Authorization = 'Bearer ' + t;
    return h;
  }

  function token() {
    return sessionStorage.getItem('demo_token');
  }

  async function loadMockOnce() {
    if (mockCache) return mockCache;
    var u = new URL('data/mock.json', w.location.href);
    var r = await fetch(u.href);
    if (!r.ok) throw new Error('无法加载 data/mock.json');
    mockCache = await r.json();
    return mockCache;
  }

  async function staticFetch(pathLike) {
    var rel = String(pathLike || '').replace(/^\/?api\/?/, '').replace(/^\/+/, '');
    var m = await loadMockOnce();
    if (rel === 'patients') return { list: m.patients };
    var pm = rel.match(/^patient\/(\d+)$/);
    if (pm) {
      var id = Number(pm[1]);
      var patient = (m.patients || []).find(function (x) {
        return x.id === id;
      });
      if (!patient) throw new Error('未找到患者');
      return { patient: patient };
    }
    var vm = rel.match(/^vitals\/(\d+)$/);
    if (vm) {
      var pid = Number(vm[1]);
      var block = m.vitals[pid] || m.vitals[String(pid)];
      if (!block) throw new Error('无监测数据');
      return block;
    }
    throw new Error('未找到接口');
  }

  w.DemoApi = {
    token: token,

    headers: headers,

    login: async function (phone, password) {
      if (isStatic()) {
        var mj = await loadMockOnce();
        var acc = (mj.accounts || []).find(function (x) {
          return (
            String(x.phone || '').trim() === String(phone || '').trim() &&
            String(x.password || '') === String(password || '')
          );
        });
        if (!acc) throw new Error('账号或密码错误');
        var tok =
          'demo-' +
          btoa(unescape(encodeURIComponent(acc.phone + '|' + acc.name + '|' + String(Date.now()))));
        sessionStorage.setItem('demo_token', tok);
        sessionStorage.setItem('demo_user', JSON.stringify({ name: acc.name, role: acc.role }));
        return { token: tok, user: { name: acc.name, role: acc.role } };
      }

      var r = await fetch(apiUrl('/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone, password: password })
      });
      var j = await r.json().catch(function () {
        throw new Error('登录接口返回了非 JSON 内容，请检查 API 地址');
      });
      var ok = j && (j.ok === true || j.code === 200);
      if (!ok) throw new Error((j && j.message) || '登录失败');
      var data = j.data || {};
      sessionStorage.setItem('demo_token', data.token);
      sessionStorage.setItem('demo_user', JSON.stringify(data.user));
      return data;
    },

    logout: function () {
      sessionStorage.removeItem('demo_token');
      sessionStorage.removeItem('demo_user');
      w.location.href = 'login.html';
    },

    requireAuth: function () {
      if (!token()) {
        w.location.href = 'login.html';
        return false;
      }
      return true;
    },

    fetch: async function (pathLike) {
      if (isStatic()) {
        if (!token()) {
          w.location.href = 'login.html';
          throw new Error('请先登录');
        }
        return staticFetch(pathLike);
      }

      var r = await fetch(apiUrl(pathLike), { headers: { Authorization: 'Bearer ' + token() } });
      var j = await r.json().catch(function () {
        throw new Error('接口返回了非 JSON 内容，请检查 API 地址');
      });
      var ok = j && (j.ok === true || j.code === 200);
      if (!ok) {
        if (r.status === 401) w.location.href = 'login.html';
        throw new Error((j && j.message) || '请求失败');
      }
      return j.data;
    }
  };
})(window);
