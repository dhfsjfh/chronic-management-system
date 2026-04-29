/**
 * @fileOverview 首页 JS 逻辑
 * @description 社区慢病管理平台首页，包含功能入口、轮播图、资讯、刷新与分享
 */

const util = require('../../utils/util.js');
const api = require('../../utils/api.js');
const auth = require('../../utils/auth.js');

const app = getApp();

const DEFAULT_MENU_LIST = [
  {
    id: 'checkin',
    title: '今日打卡',
    iconText: '卡',
    color: '#1890ff',
    badge: 0,
    path: '/pages/index/index',
    action: 'goToCheckin'
  },
  {
    id: 'record',
    title: '我的档案',
    iconText: '档',
    color: '#52c41a',
    badge: 0,
    path: '/pages/index/index',
    action: 'goToRecord'
  },
  {
    id: 'doctor',
    title: '预约医生',
    iconText: '医',
    color: '#faad14',
    path: '/pages/index/index',
    fallback: '医生预约功能开发中'
  },
  {
    id: 'medicine',
    title: '用药提醒',
    iconText: '药',
    color: '#ff4d4f',
    path: '/pages/index/index',
    fallback: '用药提醒功能开发中'
  },
  {
    id: 'exercise',
    title: '运动记录',
    iconText: '动',
    color: '#722ed1',
    path: '/pages/index/index',
    fallback: '运动记录功能开发中'
  },
  {
    id: 'diet',
    title: '饮食记录',
    iconText: '食',
    color: '#eb2f96',
    path: '/pages/index/index',
    fallback: '饮食记录功能开发中'
  }
];

const DEFAULT_QUICK_ACTIONS = [
  { id: 1, title: '血压监测', iconText: '压', color: '#ff6b6b' },
  { id: 2, title: '血糖监测', iconText: '糖', color: '#4ecdc4' },
  { id: 3, title: '健康报告', iconText: '报', color: '#45b7d1' },
  { id: 4, title: '医生咨询', iconText: '询', color: '#96ceb4' }
];

Page({
  data: {
    loading: true,
    refreshing: false,
    loadingMore: false,
    hasMore: true,
    loadError: false,
    usingMockData: false,

    userInfo: null,
    greeting: '',
    unreadMessageCount: 0,

    searchKey: '',
    searchHistory: [],

    bannerList: [],
    currentBanner: 0,
    dataSourceText: '实时数据',

    menuList: DEFAULT_MENU_LIST,
    newsList: [],
    newsPage: 1,
    newsPageSize: 10,

    quickActions: DEFAULT_QUICK_ACTIONS,
    todayCheckin: null,
    checkinStatusText: '待打卡',
    checkinStatusClass: 'warning',
    weather: null
    ,
    demoMode: false,
    judgeAccountEnabled: false
  },

  onLoad(options) {
    if (options.scene) {
      this.handleScene(options);
    }

    this.restoreSearchHistory();
    this.getUserInfo();
    this.setGreeting();
    this.loadDemoStatus();
    this.initPage();
  },

  async loadDemoStatus() {
    try {
      const s = await api.demoStatus();
      this.setData({
        demoMode: !!s.demoMode,
        judgeAccountEnabled: !!s.judgeAccountEnabled
      });
    } catch (err) {
      // ignore
    }
  },

  async onJudgeLoginTap() {
    try {
      const phone = '13800138001';
      const password = '123';
      const res = await api.judgeLogin(phone, password);
      if (res && res.token) {
        wx.setStorageSync('token', res.token);
        wx.setStorageSync('user', res.user || {});
        wx.showToast({ title: '已进入评委演示账号', icon: 'none' });
        this.getUserInfo();
        this.setGreeting();
        this.initPage();
      } else {
        wx.showToast({ title: '登录失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '登录失败', icon: 'none' });
    }
  },

  onShow() {
    this.checkLoginStatus();
    this.getTodayCheckinStatus();
  },

  onReady() {
    wx.setNavigationBarTitle({
      title: '社区慢病管理'
    });
  },

  onPullDownRefresh() {
    this.refreshHomeData();
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loadingMore) {
      return;
    }
    this.loadMoreNews();
  },

  onShareAppMessage() {
    return {
      title: '社区慢病管理 - 守护您的健康',
      path: '/pages/index/index'
    };
  },

  onShareTimeline() {
    return {
      title: '社区慢病管理 - 守护您的健康',
      query: ''
    };
  },

  handleScene(options) {
    if (options.q) {
      const query = util.paramsToObject(decodeURIComponent(options.q));
      console.log('扫码参数:', query);
    }

    if (options.inviter) {
      console.log('邀请人:', options.inviter);
    }
  },

  restoreSearchHistory() {
    const searchHistory = wx.getStorageSync('searchHistory') || [];
    this.setData({ searchHistory });
  },

  getUserInfo() {
    const userInfo = auth.getLoginUserInfo();
    this.setData({ userInfo });
  },

  checkLoginStatus() {
    if (auth.checkLogin()) {
      return;
    }

    wx.showModal({
      title: '温馨提示',
      content: '登录后可享受完整功能，是否立即登录？',
      confirmText: '去登录',
      cancelText: '稍后',
      success: (res) => {
        if (res.confirm) {
          auth.login();
        }
      }
    });
  },

  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '您好';

    if (hour >= 5 && hour < 9) {
      greeting = '早上好';
    } else if (hour < 12) {
      greeting = '上午好';
    } else if (hour < 14) {
      greeting = '中午好';
    } else if (hour < 18) {
      greeting = '下午好';
    } else if (hour < 22) {
      greeting = '晚上好';
    } else {
      greeting = '夜深了，注意休息';
    }

    const userInfo = this.data.userInfo;
    if (userInfo && userInfo.name) {
      greeting += `，${userInfo.name}`;
    }

    this.setData({ greeting });
  },

  async initPage() {
    this.setData({ loading: true, loadError: false });

    try {
      await Promise.all([
        this.loadBanners(),
        this.loadNewsList({ reset: true }),
        this.getTodayCheckinStatus(),
        this.loadHomeSummary()
      ]);
    } catch (err) {
      console.error('初始化首页失败:', err);
      this.setData({ loadError: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadHomeSummary() {
    try {
      const summary = await api.getHomeSummary();
      this.setData({
        unreadMessageCount: summary.unreadMessageCount || 0,
        weather: summary.weather || null,
        dataSourceText: app.globalData.usingMockData ? '演示数据' : '实时数据'
      });

      if (summary.userInfo) {
        this.setData({ userInfo: summary.userInfo });
        this.setGreeting();
      }
    } catch (err) {
      console.warn('获取首页摘要失败，改用本地信息:', err);
      this.setData({ usingMockData: true, dataSourceText: '演示数据' });
    }
  },

  async refreshHomeData() {
    this.setData({
      refreshing: true,
      hasMore: true,
      newsPage: 1
    });

    try {
      await Promise.all([
        this.loadBanners(),
        this.loadNewsList({ reset: true }),
        this.getTodayCheckinStatus(),
        this.loadHomeSummary()
      ]);
      wx.showToast({ title: '刷新成功', icon: 'success' });
    } catch (err) {
      console.error('刷新首页失败:', err);
      wx.showToast({ title: '刷新失败', icon: 'none' });
    } finally {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    }
  },

  async loadBanners() {
    const bannerList = await api.getHomeBanners();
    this.setData({
      bannerList,
      usingMockData: app.globalData.usingMockData,
      dataSourceText: app.globalData.usingMockData ? '演示数据' : '实时数据'
    });
  },

  async loadNewsList({ reset = false } = {}) {
    if (this.data.loadingMore && !reset) {
      return;
    }

    const nextPage = reset ? 1 : this.data.newsPage;
    this.setData({ loadingMore: true });

    try {
      const res = await api.getNewsList({
        page: nextPage,
        pageSize: this.data.newsPageSize,
        keyword: this.data.searchKey
      });

      const previousList = reset ? [] : this.data.newsList;
      const list = previousList.concat(res.list || []);
      const total = Number(res.total || list.length);

      this.setData({
        newsList: list,
        newsPage: nextPage,
        hasMore: list.length < total,
        usingMockData: app.globalData.usingMockData,
        dataSourceText: app.globalData.usingMockData ? '演示数据' : '实时数据'
      });
    } finally {
      this.setData({ loadingMore: false });
    }
  },

  loadMoreNews() {
    this.setData({ newsPage: this.data.newsPage + 1 });
    this.loadNewsList();
  },

  async getTodayCheckinStatus() {
    const todayCheckin = await api.getTodayCheckin();
    const menuList = this.data.menuList.map((item) => {
      if (item.id === 'checkin') {
        return { ...item, badge: todayCheckin.checked ? 0 : 1 };
      }
      return item;
    });

    this.setData({
      todayCheckin,
      menuList,
      usingMockData: app.globalData.usingMockData,
      dataSourceText: app.globalData.usingMockData ? '演示数据' : '实时数据',
      checkinStatusText: todayCheckin.checked ? '已打卡' : '待打卡',
      checkinStatusClass: todayCheckin.checked ? 'normal' : 'warning'
    });
  },

  onBannerChange(e) {
    this.setData({
      currentBanner: e.detail.current
    });
  },

  onBannerTap(e) {
    const { index } = e.currentTarget.dataset;
    const banner = this.data.bannerList[index];

    if (!banner || !banner.link) {
      return;
    }

    if (banner.link.startsWith('/pages/')) {
      wx.navigateTo({
        url: banner.link,
        fail: () => {
          wx.showToast({ title: '页面暂未开放', icon: 'none' });
        }
      });
      return;
    }

    wx.showToast({ title: '外部链接暂不支持', icon: 'none' });
  },

  onSearchInput(e) {
    this.setData({
      searchKey: e.detail.value
    });
  },

  async onSearchConfirm(e) {
    const keyword = (e.detail.value || this.data.searchKey || '').trim();
    if (!keyword) {
      return;
    }

    this.saveSearchHistory(keyword);
    this.setData({
      searchKey: keyword,
      newsPage: 1,
      hasMore: true
    });

    try {
      await this.loadNewsList({ reset: true });
    } catch (err) {
      console.error('搜索资讯失败:', err);
      wx.showToast({ title: '搜索失败', icon: 'none' });
    }
  },

  onSearchClear() {
    this.setData({ searchKey: '' });
  },

  onSearchHistoryTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ searchKey: keyword });
    this.onSearchConfirm({ detail: { value: keyword } });
  },

  saveSearchHistory(keyword) {
    let history = this.data.searchHistory.filter((item) => item !== keyword);
    history.unshift(keyword);
    history = history.slice(0, 10);

    this.setData({ searchHistory: history });
    wx.setStorageSync('searchHistory', history);
  },

  onMenuTap(e) {
    const { index } = e.currentTarget.dataset;
    const menu = this.data.menuList[index];

    if (!menu) {
      return;
    }

    if (menu.action && typeof this[menu.action] === 'function') {
      this[menu.action]();
      return;
    }

    if (menu.needLogin && !auth.checkLogin()) {
      auth.login();
      return;
    }

    wx.showToast({
      title: menu.fallback || '功能开发中',
      icon: 'none'
    });
  },

  onQuickActionTap(e) {
    const { index } = e.currentTarget.dataset;
    const action = this.data.quickActions[index];

    if (!action) {
      return;
    }

    switch (action.id) {
      case 1:
        this.goToCheckin();
        break;
      case 2:
        this.goToCheckin();
        break;
      case 3:
        this.goToRecord();
        break;
      case 4:
        wx.showToast({ title: '医生咨询功能开发中', icon: 'none' });
        break;
      default:
        wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  },

  onNewsTap(e) {
    const { index } = e.currentTarget.dataset;
    const news = this.data.newsList[index];

    if (!news) {
      return;
    }

    wx.showModal({
      title: news.title,
      content: news.summary || '内容详情页待接入',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  goToCheckin() {
    wx.showToast({ title: '打卡页面待接入', icon: 'none' });
  },

  goToRecord() {
    wx.showToast({ title: '档案页面待接入', icon: 'none' });
  },

  goToMessage() {
    wx.showToast({ title: '消息页面待接入', icon: 'none' });
  },

  async oneKeyCheckin() {
    if (this.data.todayCheckin && this.data.todayCheckin.checked) {
      wx.showToast({ title: '今日已打卡', icon: 'success' });
      return;
    }

    wx.showModal({
      title: '一键打卡',
      content: '确认使用上次数据完成今日打卡？',
      confirmText: '确认',
      success: async (res) => {
        if (res.confirm) {
          await this.performCheckin();
        }
      }
    });
  },

  async performCheckin() {
    wx.showLoading({ title: '打卡中...' });

    try {
      await api.oneKeyCheckin();
      await this.getTodayCheckinStatus();
      wx.showToast({ title: '打卡成功', icon: 'success' });
    } catch (err) {
      console.error('一键打卡失败:', err);
      wx.showToast({ title: '打卡失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  viewAllNews() {
    wx.pageScrollTo({ scrollTop: 600, duration: 300 });
  },

  retryLoad() {
    this.initPage();
  }
});
