// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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

  integrations: [sitemap()],

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
