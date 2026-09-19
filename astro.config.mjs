// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // TODO: 上线前替换为备案通过的正式域名(备案约 2–3 周,与开发并行)
  site: 'https://example.com',

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
  // 上线时的响应头必须由托管方发出(见 CLAUDE.md / 计划文件:国内平台不认
  // public/_headers,需用 Nginx add_header 或平台的响应头配置)。
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
