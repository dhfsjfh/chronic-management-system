/**
 * 部署说明见仓库根目录 DEPLOY.md
 *
 * __DEMO_STATIC__ = true  —— 纯静态（GitHub Pages 等无 Serverless 场景），数据来自 data/mock.json
 * __DEMO_STATIC__ = false —— 使用 /api/*（Vercel 或本地 node server.js）
 *
 * GitHub Pages 若仓库为 https://user.github.io/repo-name/ ，请设置 __API_BASE_PATH__ 为 '/repo-name'（无尾部斜杠）
 */
(function (w) {
  w.__DEMO_STATIC__ = false;
  w.__API_BASE_PATH__ = '';
})(window);
