// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  /*
   * 当前部署目标:GitHub Pages 的**项目站**,所以址是
   * `https://<用户>.github.io/<仓库名>/` —— 站点不在域名根上,而在子路径上。
   *
   * `base` 就是为此而设。它一改,`import.meta.env.BASE_URL` 跟着变,全站
   * 站内链接由 `src/lib/url.ts` 的 `href()` 统一拼出来(那儿的文件头写了
   * 为什么不能写根路径)。
   *
   * ⚠️ 以后换成**备案域名**(站点落在域名根)时,把 `base` 去掉或改成 `'/'` 即可,
   * 页面代码一行都不用动 —— 这正是把拼接收进 `href()` 的原因。同时记得改
   * `site` 和 `public/robots.txt` 里的 Sitemap 行。
   */
  site: 'https://yueliangshuxia.github.io',
  base: '/mouse-test',

  /*
   * 只加了一个 adapter,**`output` 保持默认的 `'static'`** —— Astro 7 里
   * `'static'` 就是原来的 hybrid:页面默认仍然预渲染,只有写了
   * `export const prerender = false` 的那几条转服务端。
   *
   * ## 但它会改产物的形状,这一条是踩出来的
   *
   * node adapter 在 `getAdapter()` 里声明 `adapterFeatures.buildOutput = 'server'`,
   * 而 `astro/dist/integrations/hooks.js` 的 `setAdapter()` 只要看到
   * `buildOutput !== 'static'` 就**无条件**把 `settings.buildOutput` 改成 `'server'`
   * —— **跟你写了几条 SSR 路由无关**。于是静态产物不再落在 `dist/` 顶层,而是
   * 落到 `build.client`(实测:`dist/client/`),服务端入口在 `dist/server/entry.mjs`。
   *
   * 也就是说 `output: 'static'` 这一行现在**对产物形状几乎不起作用**,真正决定
   * 形状的是"有没有挂 adapter"。`deploy.yml` 上传的路径必须跟着改成 `dist/client`
   * —— 不改的话构建不报错,线上 40 页集体 404。
   */
  adapter: node({ mode: 'standalone' }),

  /*
   * 关掉 Astro 自带那套 session。adapter 默认会替我们打开 filesystem session
   * (落在 `node_modules/.astro/sessions`),而本站的登录态**自己有一张 `sessions`
   * 表**(见 `src/server/auth.ts`)—— 两套并存只会让人分不清哪个在起作用。
   */
  session: false,

  integrations: [
    /*
     * `filter` 这一条不是可有可无的:`@astrojs/sitemap` 除了实际生成的静态页之外,
     * 还会把**路由表里所有 type 为 page 的路由**再并进来一遍(它只看
     * `route.pathname` 有没有值,**不看 `prerender`**),所以 `/login` 与
     * `/admin/*` 这些 SSR 页面会被写进 sitemap。它们全都 `noindex`,不该出现。
     *
     * 注意 `filter` 收到的是**完整绝对 URL**(已经拼好 base),不是 pathname。
     */
    sitemap({
      filter: (page) => !/\/(admin|login|api)(\/|$)/.test(new URL(page).pathname),
    }),
  ],
  // 关掉 Astro 自带的开发工具栏。它只在 `astro dev` 时注入到视口底部正中央,
  // 对 `dist/` 没有任何影响 —— 关它是因为它和站点自己的底部悬浮条
  // (`.site-dock`,见 BaseLayout.astro)会叠在同一个位置上,开发时看不出哪个是哪个。
  devToolbar: { enabled: false },

  // 注意:server.headers 只作用于 `astro dev` 和 `astro preview`,
  // 对 `astro build` 产出的静态文件完全无效。
  //
  // 这里配置它是为了**本地开发时就能拿到跨域隔离**,从而验证 8000Hz 那条
  // 高精度路径——否则本地计时精度永远是 100µs,那段代码没法测。
  // 上线时的响应头必须由托管方发出(见 CLAUDE.md「这个托管方的已知短板」:
  // 国内平台不认 public/_headers,需用 Nginx add_header 或平台的响应头配置)。
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
