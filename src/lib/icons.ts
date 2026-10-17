/**
 * 图标。**来自 Iconify 的 `lucide` 集合,取的是原始 SVG 路径,自托管。**
 *
 * ## 为什么不引 `@iconify/*` 那个包
 *
 * 那套东西的价值在"按需从 CDN 拉"和"几千个图标全可用",而这里两样都不需要:
 * 全站只用 11 个图标,加起来不到 4KB。为了它们在运行期多一个
 * 依赖、多一条网络路径(而且是**发给第三方**的请求),换不来任何东西。
 *
 * ## 和 `tool-motifs.ts` 同一套规矩,一个字都没放宽
 *
 * - **一律 `currentColor`**,一个写死的颜色都没有 —— 生成时拿正则查过,查出来就抛错
 * - `viewBox` 统一 24×24
 * - 只存**内层**(`<g>`/`<path>`),`<svg>` 那层由调用方写 —— 因为尺寸和描边粗细
 *   是**消费者**的事(导航里 16px、页面里 24px),写死在这里就等于让同一份图标
 *   在两处长成两个样子
 *
 * ## 授权
 *
 * lucide 是 ISC 许可(https://lucide.dev/license),允许商用与修改,要求在
 * 分发时保留版权声明 —— 这一行就是那个声明:
 *
 *     Lucide icons — Copyright (c) 2022 Lucide Contributors — ISC License
 *
 * 其余 Lucide 图标可以去 https://icon-sets.iconify.design/lucide/ 按名字取,
 * 取法与这个文件头写的完全一样(Iconify 的 API 直接把 `currentColor` 的 body 给你)。
 */

export const ICONS = {
  overview: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></g>',
  users: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.128a4 4 0 0 1 0 7.744M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></g>',
  ads: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M6 14a12 12 0 0 0 2.4 7.2a2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14M8 6v8"/></g>',
  analysis: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9l-5 5l-4-4l-3 3"/></g>',
  audit: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M11 2v2M5 2v2m0-1H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/></g>',
  logout: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m16 17l5-5l-5-5m5 5H9m0 9H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
  home: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></g>',
  back: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m12 19l-7-7l7-7m7 7H5"/>',
  compass: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76l-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/></g>',
  pointer: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/>',
  repair: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>',
} as const;

export type IconName = keyof typeof ICONS;
