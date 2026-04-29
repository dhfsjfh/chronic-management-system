const STORAGE_KEY = 'loginUserInfo';

function getLoginUserInfo() {
  return wx.getStorageSync(STORAGE_KEY) || {
    id: 'guest-user',
    name: '居民用户'
  };
}

function checkLogin() {
  return Boolean(wx.getStorageSync(STORAGE_KEY));
}

function login() {
  const mockUser = {
    id: 'user-1001',
    name: '张阿姨'
  };
  wx.setStorageSync(STORAGE_KEY, mockUser);
  wx.showToast({
    title: '已使用演示账号登录',
    icon: 'none'
  });
}

module.exports = {
  getLoginUserInfo,
  checkLogin,
  login
};
