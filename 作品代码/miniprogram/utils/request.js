const BASE_URL = 'https://chronic-management-system.onrender.com';
const TIMEOUT = 10000;

function request({ url, method = 'GET', data = {}, header = {} }) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      timeout: TIMEOUT,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...header
      },
      success(res) {
        const { statusCode, data: responseData } = res;
        if (statusCode >= 200 && statusCode < 300) {
          if (responseData && typeof responseData === 'object' && 'code' in responseData) {
            if (responseData.code >= 200 && responseData.code < 300) {
              resolve(responseData.data);
              return;
            }

            reject(new Error(responseData.message || '业务请求失败'));
            return;
          }

          resolve(responseData);
          return;
        }

        reject(new Error(responseData.message || '请求失败'));
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

function get(url, data, header) {
  return request({ url, method: 'GET', data, header });
}

function post(url, data, header) {
  return request({ url, method: 'POST', data, header });
}

module.exports = {
  request,
  get,
  post
};
