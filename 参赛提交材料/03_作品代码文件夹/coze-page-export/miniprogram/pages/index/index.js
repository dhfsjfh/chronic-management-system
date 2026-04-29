/**
 * @fileOverview 首页JS逻辑
 * @description 社区慢病管理平台首页，包含功能入口、轮播图、下拉刷新等
 * 
 * 功能特性：
 * - 搜索栏
 * - 功能入口宫格
 * - 健康资讯轮播
 * - 下拉刷新、上拉加载
 * - 分享功能
 * 
 * @author 社区慢病管理平台
 * @version 1.0.0
 */

// 引入工具函数
const util = require('../../utils/util.js');
const request = require('../../utils/request.js');
const auth = require('../../utils/auth.js');

// 获取应用实例
const app = getApp();

Page({
  // 页面数据
  data: {
    // 加载状态
    loading: true,
    // 下拉刷新状态
    refreshing: false,
    // 上拉加载更多状态
    loadingMore: false,
    // 是否有更多数据
    hasMore: true,
    
    // 用户信息
    userInfo: null,
    // 问候语
    greeting: '',
    
    // 搜索关键词
    searchKey: '',
    // 搜索历史
    searchHistory: [],
    
    // 轮播图列表
    bannerList: [],
    // 当前轮播索引
    currentBanner: 0,
    
    // 功能入口列表
    menuList: [
      {
        id: 'checkin',
        title: '今日打卡',
        icon: '/assets/images/menu-checkin.png',
        color: '#1890ff',
        badge: 0,
        path: '/pages/checkin/checkin'
      },
      {
        id: 'record',
        title: '我的档案',
        icon: '/assets/images/menu-record.png',
        color: '#52c41a',
        badge: 0,
        path: '/pages/record/record'
      },
      {
        id: 'doctor',
        title: '预约医生',
        icon: '/assets/images/menu-doctor.png',
        color: '#faad14',
        badge: 0,
        path: '/pages/index/index'
      },
      {
        id: 'medicine',
        title: '用药提醒',
        icon: '/assets/images/menu-medicine.png',
        color: '#ff4d4f',
        badge: 0,
        path: '/pages/index/index'
      },
      {
        id: 'exercise',
        title: '运动记录',
        icon: '/assets/images/menu-exercise.png',
        color: '#722ed1',
        badge: 0,
        path: '/pages/index/index'
      },
      {
        id: 'diet',
        title: '饮食记录',
        icon: '/assets/images/menu-diet.png',
        color: '#eb2f96',
        badge: 0,
        path: '/pages/index/index'
      }
    ],
    
    // 健康资讯列表
    newsList: [],
    // 资讯分页
    newsPage: 1,
    newsPageSize: 10,
    
    // 快捷入口
    quickActions: [
      { id: 1, title: '血压监测', icon: 'chart', color: '#ff6b6b' },
      { id: 2, title: '血糖监测', icon: 'water', color: '#4ecdc4' },
      { id: 3, title: '健康报告', icon: 'file', color: '#45b7d1' },
      { id: 4, title: '医生咨询', icon: 'service', color: '#96ceb4' }
    ],
    
    // 今日打卡状态
    todayCheckin: null,
    
    // 天气信息
    weather: null
  },

  // 生命周期函数
  onLoad(options) {
    // 处理扫码进入等场景
    if (options.scene) {
      this.handleScene(options);
    }
    
    // 获取用户信息
    this.getUserInfo();
    
    // 获取问候语
    this.setGreeting();
    
    // 加载首页数据
    this.loadHomeData();
  },

  onShow() {
    // 检查登录状态
    this.checkLoginStatus();
    
    // 更新打卡状态
    this.getTodayCheckinStatus();
  },

  onReady() {
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: '社区慢病管理'
    });
  },

  onPullDownRefresh() {
    // 下拉刷新
    this.setData({ refreshing: true });
    this.refreshHomeData();
  },

  onReachBottom() {
    // 上拉加载更多
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMoreNews();
    }
  },

  onShareAppMessage(options) {
    // 分享给朋友
    const shareInfo = {
      title: '社区慢病管理 - 守护您的健康',
      path: '/pages/index/index',
      imageUrl: '/assets/images/share-icon.png'
    };
    return shareInfo;
  },

  onShareTimeline() {
    // 分享到朋友圈
    return {
      title: '社区慢病管理 - 守护您的健康',
      query: '',
      imageUrl: '/assets/images/share-icon.png'
    };
  },

  /**
   * 处理场景值
   * @param {Object} options 页面参数
   */
  handleScene(options) {
    console.log('场景参数:', options);
    
    // 处理扫码参数
    if (options.q) {
      const query = util.paramsToObject(decodeURIComponent(options.q));
      console.log('扫码参数:', query);
      // 可以根据参数跳转到对应页面
    }
    
    // 处理推广参数
    if (options.inviter) {
      console.log('邀请人:', options.inviter);
    }
  },

  /**
   * 获取用户信息
   */
  getUserInfo() {
    const userInfo = auth.getLoginUserInfo();
    this.setData({ userInfo });
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    if (!auth.checkLogin()) {
      // 未登录，显示登录提示
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
    }
  },

  /**
   * 设置问候语
   */
  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '您好';

    if (hour >= 5 && hour < 9) {
      greeting = '早上好';
    } else if (hour >= 9 && hour < 12) {
      greeting = '上午好';
    } else if (hour >= 12 && hour < 14) {
      greeting = '中午好';
    } else if (hour >= 14 && hour < 18) {
      greeting = '下午好';
    } else if (hour >= 18 && hour < 22) {
      greeting = '晚上好';
    } else {
      greeting = '夜深了，注意休息';
    }

    // 添加用户名称
    const userInfo = this.data.userInfo;
    if (userInfo && userInfo.name) {
      greeting += `，${userInfo.name}`;
    }

    this.setData({ greeting });
  },

  /**
   * 加载首页数据
   */
  async loadHomeData() {
    this.setData({ loading: true });

    try {
      // 并行加载多个数据
      await Promise.all([
        this.loadBanners(),
        this.loadNewsList(),
        this.getTodayCheckinStatus()
      ]);

      this.setData({ loading: false });
    } catch (err) {
      console.error('加载首页数据失败:', err);
      this.setData({ loading: false });
    }
  },

  /**
   * 刷新首页数据
   */
  async refreshHomeData() {
    this.setData({
      newsPage: 1,
      hasMore: true
    });

    try {
      await Promise.all([
        this.loadBanners(),
        this.loadNewsList(true)
      ]);

      this.setData({ refreshing: false });
      wx.showToast({ title: '刷新成功', icon: 'success' });
    } catch (err) {
      console.error('刷新数据失败:', err);
      this.setData({ refreshing: false });
    }
  },

  /**
   * 加载轮播图
   */
  async loadBanners() {
    // Mock数据
    const mockBanners = [
      {
        id: 1,
        title: '健康知识',
        image: 'https://picsum.photos/750/400?random=1',
        link: '/pages/article/article?id=1',
        type: 'article'
      },
      {
        id: 2,
        title: '名医义诊',
        image: 'https://picsum.photos/750/400?random=2',
        link: '/pages/index/index',
        type: 'activity'
      },
      {
        id: 3,
        title: '健康打卡',
        image: 'https://picsum.photos/750/400?random=3',
        link: '/pages/checkin/checkin',
        type: 'checkin'
      }
    ];

    // 实际项目中替换为真实接口
    // const res = await request.get('/banner/list', { position: 'home' });
    // this.setData({ bannerList: res.data.list });

    this.setData({ bannerList: mockBanners });
  },

  /**
   * 加载健康资讯列表
   * @param {boolean} isRefresh 是否刷新
   */
  async loadNewsList(isRefresh = false) {
    if (this.data.loadingMore) return;

    this.setData({ loadingMore: true });

    // Mock数据
    const mockNewsList = [
      {
        id: 1,
        title: '高血压患者日常饮食需要注意什么？',
        summary: '高血压是一种常见的慢性疾病，合理的饮食习惯对控制血压非常重要...',
        coverImage: 'https://picsum.photos/300/200?random=4',
        author: '李医生',
        publishTime: '2024-01-15 10:30',
        views: 1256,
        type: 'health'
      },
      {
        id: 2,
        title: '糖尿病患者如何正确监测血糖？',
        summary: '血糖监测是糖尿病管理的重要环节，正确的监测方法可以帮助患者更好...',
        coverImage: 'https://picsum.photos/300/200?random=5',
        author: '张医生',
        publishTime: '2024-01-14 15:20',
        views: 2341,
        type: 'knowledge'
      },
      {
        id: 3,
        title: '老年人如何预防心脑血管疾病？',
        summary: '心脑血管疾病是老年人健康的重大威胁，预防胜于治疗...',
        coverImage: 'https://picsum.photos/300/200?random=6',
        author: '王医生',
        publishTime: '2024-01-13 09:15',
        views: 1890,
        type: 'prevention'
      },
      {
        id: 4,
        title: '慢性病患者如何做好自我管理？',
        summary: '慢性病的治疗是一个长期过程，患者的自我管理能力直接影响治疗效果...',
        coverImage: 'https://picsum.photos/300/200?random=7',
        author: '健康管理师',
        publishTime: '2024-01-12 14:00',
        views: 3456,
        type: 'management'
      },
      {
        id: 5,
        title: '运动康复：适合慢病患者的运动方式',
        summary: '适当的运动对慢性病患者康复非常重要，但要选择适合自己的运动方式...',
        coverImage: 'https://picsum.photos/300/200?random=8',
        author: '康复师',
        publishTime: '2024-01-11 11:30',
        views: 1567,
        type: 'exercise'
      }
    ];

    // 实际项目中替换为真实接口
    // const res = await request.get('/news/list', {
    //   page: this.data.newsPage,
    //   pageSize: this.data.newsPageSize
    // });

    setTimeout(() => {
      const newList = isRefresh ? mockNewsList : [...this.data.newsList, ...mockNewsList];
      const hasMore = newList.length < 50; // 假设最多50条

      this.setData({
        newsList: newList,
        loadingMore: false,
        hasMore: hasMore
      });
    }, 500);
  },

  /**
   * 加载更多资讯
   */
  loadMoreNews() {
    this.setData({
      newsPage: this.data.newsPage + 1,
      loadingMore: true
    });
    this.loadNewsList();
  },

  /**
   * 获取今日打卡状态
   */
  async getTodayCheckinStatus() {
    // Mock数据
    const today = util.formatDate(new Date(), 'YYYY-MM-DD');
    const mockStatus = {
      date: today,
      checked: true,
      checkinTime: '08:30',
      items: {
        bloodPressure: { value: '120/80', status: 'normal' },
        bloodSugar: { value: '5.6', status: 'normal' },
        weight: { value: '65kg', status: 'normal' }
      }
    };

    this.setData({ todayCheckin: mockStatus });

    // 更新菜单徽标
    const menuList = this.data.menuList.map(item => {
      if (item.id === 'checkin') {
        return { ...item, badge: mockStatus.checked ? 0 : 1 };
      }
      return item;
    });
    this.setData({ menuList });
  },

  /**
   * 轮播图切换事件
   * @param {Object} e 事件对象
   */
  onBannerChange(e) {
    this.setData({
      currentBanner: e.detail.current
    });
  },

  /**
   * 点击轮播图
   * @param {Object} e 事件对象
   */
  onBannerTap(e) {
    const { index } = e.currentTarget.dataset;
    const banner = this.data.bannerList[index];

    if (banner && banner.link) {
      // 如果是内部页面，直接跳转
      if (banner.link.startsWith('/pages')) {
        wx.navigateTo({ url: banner.link });
      } else {
        // 其他链接可以打开webview
        wx.showToast({ title: '功能开发中', icon: 'none' });
      }
    }
  },

  /**
   * 搜索输入
   * @param {Object} e 事件对象
   */
  onSearchInput(e) {
    this.setData({
      searchKey: e.detail.value
    });
  },

  /**
   * 搜索确认
   * @param {Object} e 事件对象
   */
  onSearchConfirm(e) {
    const keyword = e.detail.value || this.data.searchKey;
    if (keyword) {
      // 保存搜索历史
      this.saveSearchHistory(keyword);
      // 跳转到搜索结果页
      wx.navigateTo({
        url: `/pages/search/search?keyword=${encodeURIComponent(keyword)}`
      });
    }
  },

  /**
   * 清空搜索
   */
  onSearchClear() {
    this.setData({ searchKey: '' });
  },

  /**
   * 保存搜索历史
   * @param {string} keyword 关键词
   */
  saveSearchHistory(keyword) {
    let history = this.data.searchHistory;
    // 去重
    history = history.filter(item => item !== keyword);
    // 添加到开头
    history.unshift(keyword);
    // 最多保存10条
    if (history.length > 10) {
      history = history.slice(0, 10);
    }
    this.setData({ searchHistory: history });
    wx.setStorageSync('searchHistory', history);
  },

  /**
   * 点击功能菜单
   * @param {Object} e 事件对象
   */
  onMenuTap(e) {
    const { index } = e.currentTarget.dataset;
    const menu = this.data.menuList[index];

    if (menu.path) {
      // 检查是否需要登录
      if (menu.needLogin && !auth.checkLogin()) {
        auth.login();
        return;
      }

      wx.navigateTo({ url: menu.path });
    }
  },

  /**
   * 点击快捷入口
   * @param {Object} e 事件对象
   */
  onQuickActionTap(e) {
    const { index } = e.currentTarget.dataset;
    const action = this.data.quickActions[index];

    switch (action.id) {
      case 1:
        // 血压监测，跳转到打卡页面
        wx.navigateTo({ url: '/pages/checkin/checkin?type=bloodPressure' });
        break;
      case 2:
        // 血糖监测，跳转到打卡页面
        wx.navigateTo({ url: '/pages/checkin/checkin?type=bloodSugar' });
        break;
      case 3:
        // 健康报告，跳转到档案页面
        wx.navigateTo({ url: '/pages/record/record' });
        break;
      case 4:
        // 医生咨询，跳转到AI咨询页面
        wx.switchTab({ url: '/pages/ai/chat' });
        break;
      default:
        wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  },

  /**
   * 点击资讯项
   * @param {Object} e 事件对象
   */
  onNewsTap(e) {
    const { index } = e.currentTarget.dataset;
    const news = this.data.newsList[index];

    if (news) {
      wx.navigateTo({
        url: `/pages/article/article?id=${news.id}`
      });
    }
  },

  /**
   * 跳转到打卡页面
   */
  goToCheckin() {
    wx.navigateTo({ url: '/pages/checkin/checkin' });
  },

  /**
   * 跳转到我的档案
   */
  goToRecord() {
    wx.switchTab({ url: '/pages/record/record' });
  },

  /**
   * 跳转到消息页面
   */
  goToMessage() {
    wx.switchTab({ url: '/pages/msg/msg' });
  },

  /**
   * 一键打卡
   */
  async oneKeyCheckin() {
    if (this.data.todayCheckin && this.data.todayCheckin.checked) {
      wx.showToast({ title: '今日已打卡', icon: 'success' });
      return;
    }

    wx.showModal({
      title: '一键打卡',
      content: '确认使用上次数据完成今日打卡？',
      confirmText: '确认',
      success: (res) => {
        if (res.confirm) {
          this.performCheckin();
        }
      }
    });
  },

  /**
   * 执行打卡
   */
  async performCheckin() {
    wx.showLoading({ title: '打卡中...' });

    // 模拟打卡请求
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '打卡成功',
        icon: 'success'
      });

      // 更新打卡状态
      this.getTodayCheckinStatus();
    }, 1000);
  },

  /**
   * 查看全部资讯
   */
  viewAllNews() {
    wx.navigateTo({
      url: '/pages/news/list'
    });
  }
});
