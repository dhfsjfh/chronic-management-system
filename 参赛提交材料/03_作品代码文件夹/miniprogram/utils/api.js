const request = require('./request.js');
const util = require('./util.js');

const app = getApp();

function setMockMode(enabled) {
  app.globalData = app.globalData || {};
  app.globalData.usingMockData = enabled;
}

function buildMockNewsList(page, pageSize, keyword) {
  const source = [
    {
      id: 1,
      title: '高血压患者日常饮食需要注意什么？',
      summary: '高血压患者建议控制盐摄入、增加蔬果比例，并建立规律饮食习惯。',
      coverImage: '',
      author: '李医生',
      publishTime: '2026-04-20 10:30',
      views: 1256
    },
    {
      id: 2,
      title: '糖尿病患者如何正确监测血糖？',
      summary: '建议固定监测时间，结合饮食、运动与药物记录一起观察变化。',
      coverImage: '',
      author: '张医生',
      publishTime: '2026-04-18 15:20',
      views: 2341
    },
    {
      id: 3,
      title: '适合慢病患者的居家运动有哪些？',
      summary: '低强度步行、弹力带训练和拉伸训练适合大多数慢病患者循序开展。',
      coverImage: '',
      author: '康复师',
      publishTime: '2026-04-17 09:15',
      views: 1890
    },
    {
      id: 4,
      title: '老年人如何预防心脑血管疾病？',
      summary: '关注血压、血糖、体重和睡眠，坚持复诊与长期随访。',
      coverImage: '',
      author: '王医生',
      publishTime: '2026-04-16 14:00',
      views: 3456
    }
  ];

  const filtered = keyword
    ? source.filter((item) => item.title.includes(keyword) || item.summary.includes(keyword))
    : source;
  const start = (page - 1) * pageSize;
  const list = filtered.slice(start, start + pageSize);

  return {
    list,
    total: filtered.length
  };
}

async function withMockFallback(requester, fallback) {
  try {
    const data = await requester();
    setMockMode(false);
    return data;
  } catch (err) {
    setMockMode(true);
    return fallback(err);
  }
}

function getUserProfile() {
  return withMockFallback(
    () => request.get('/api/user/profile'),
    () => ({
      id: 'mock-user-1',
      name: '王阿姨',
      avatar: '',
      age: 67,
      chronicTags: ['高血压', '糖尿病']
    })
  );
}

function getHomeBanners() {
  return withMockFallback(
    async () => {
      const data = await request.get('/api/home/banners');
      return data.list || [];
    },
    () => ([
      {
        id: 1,
        title: '健康知识',
        image: '',
        link: '/pages/index/index'
      },
      {
        id: 2,
        title: '名医义诊',
        image: '',
        link: '/pages/index/index'
      },
      {
        id: 3,
        title: '健康打卡',
        image: '',
        link: '/pages/index/index'
      }
    ])
  );
}

function getHomeSummary() {
  return withMockFallback(
    async () => {
      const [userInfo, summary] = await Promise.all([
        request.get('/api/user/profile'),
        request.get('/api/home/quick-stats')
      ]);

      return {
        userInfo,
        unreadMessageCount: summary.unreadMessageCount || 0,
        weather: summary.weather || null
      };
    },
    async () => ({
      userInfo: await getUserProfile(),
      unreadMessageCount: 2,
      weather: {
        city: '上海',
        temperature: '24',
        condition: '多云'
      }
    })
  );
}

function getNewsList(params = {}) {
  const page = Number(params.page || 1);
  const pageSize = Number(params.pageSize || 10);
  const keyword = (params.keyword || '').trim();

  return withMockFallback(
    async () => {
      const data = await request.get('/api/news', { page, pageSize, keyword });
      return {
        list: data.list || [],
        total: Number(data.total || 0)
      };
    },
    () => buildMockNewsList(page, pageSize, keyword)
  );
}

function getTodayCheckin() {
  return withMockFallback(
    () => request.get('/api/checkin/today'),
    () => ({
      date: util.formatDate(new Date(), 'YYYY-MM-DD'),
      checked: true,
      checkinTime: '08:30',
      items: {
        bloodPressure: { value: '126/82', status: 'normal' },
        bloodSugar: { value: '5.8', status: 'normal' },
        weight: { value: '65kg', status: 'normal' }
      }
    })
  );
}

function oneKeyCheckin() {
  return withMockFallback(
    () => request.post('/api/checkin/one-click', {}),
    () => Promise.resolve({ success: true })
  );
}

function demoStatus() {
  return request.get('/api/demo/status');
}

function judgeLogin(phone, password) {
  return request.post('/api/auth/login', { phone, password });
}

module.exports = {
  getUserProfile,
  getHomeBanners,
  getHomeSummary,
  getNewsList,
  getTodayCheckin,
  oneKeyCheckin,
  demoStatus,
  judgeLogin
};
