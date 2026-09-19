/**
 * 站内链接必须拼上 Astro 的 `base`。
 *
 * 全站原先写的是 `/${tool.slug}/` 这样的**根路径**。根路径只有在站点部署到
 * 域名根(`/`)时才成立。部署到**子路径**时——GitHub Pages 的项目站就是
 * `https://<用户>.github.io/<仓库名>/`——`/cps-test/` 会指向
 * `https://<用户>.github.io/cps-test/`,**404**。
 *
 * 危险的地方在于:**构建不会有任何报错**,`dist/` 照样生成得好好的。
 * 十条导航、favicon、站名链接全部指错,只能靠打开页面才发现。所以统一走这里。
 *
 * `import.meta.env.BASE_URL` 由 `astro.config.mjs` 的 `base` 决定。**它结尾不带斜杠**
 * (`/mouse-test`),没配 `base` 时是 `/` —— 这一点是**实测**的,不是照文档推的:
 * 最初写成 `${BASE_URL}${path}`,结果拼出 `/mouse-testcps-test/`,少了那个分隔斜杠。
 * 而构建**一声不吭**,`dist/` 照常生成,十条导航全是 404。
 *
 * 所以这里两头各归一化一次,而不是相信某个"规范形式"。
 *
 * 用法:`href('cps-test/')` → `/mouse-test/cps-test/`;`href()` → 站点根。
 */

/** 把站内路径拼到 `base` 后面。参数可带可不带开头的斜杠。 */
export function href(path = ''): string {
  // 去掉结尾斜杠:`/mouse-test` → `/mouse-test`;`/` → ``
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  // 去掉开头斜杠:`/cps-test/` → `cps-test/`
  const rest = path.replace(/^\//, '');
  // 两头都由上面剥干净了,这里由**我们**补上唯一那个分隔斜杠
  return rest ? `${base}/${rest}` : `${base}/`;
}
