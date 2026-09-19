/**
 * 主题(外观)相关的常量。
 *
 * ## 为什么要单开一个模块
 *
 * 这几个值有**两个消费者,而且分属两个不同的世界**:
 *
 * - `BaseLayout.astro` 的 `<head>` 里那个**阻塞**脚本 —— 它得在首次绘制前
 *   把主题定下来,否则深色偏好会先闪一下浅色。所以它必须是 `is:inline`,
 *   **不能 import**,只能靠 `define:vars` 把值注进去。
 * - `ui.ts` 里的开关 —— 走正常的打包路径。
 *
 * 这跟 `keyboard-layout.ts` 是同一个问题(CLAUDE.md 里写着:「Astro 的
 * frontmatter 变量在 `<script>` 里不存在」),解法也一样:**抽成模块**,
 * 让两边从同一处取值,而不是在脚本里手抄一份字面量。
 *
 * ## 存的是偏好,不是结果
 *
 * `localStorage` 里存 `'auto' | 'light' | 'dark'` 三选一;写到
 * `<html data-theme>` 上的**永远只有 `'light'` 或 `'dark'`**。
 *
 * 这样 CSS 里只需要一个深色选择器(`:root[data-theme='dark']`),不必为了
 * 「跟随系统」再写一遍 `@media (prefers-color-scheme: dark)` 的整套令牌——
 * 那两份迟早会漂移,而且会让 `auto` 变成 CSS 里一个不存在的状态,以后加令牌
 * 时必然漏掉一份。系统偏好只在**一个地方**被读取:那个阻塞脚本。
 */

/** 和 `'mouse-test:cps-best'` 同一个命名空间 */
export const THEME_KEY = 'mouse-test:theme';

export type ThemePref = 'auto' | 'light' | 'dark';

/** 没存过任何值时跟随系统 */
export const THEME_DEFAULT: ThemePref = 'auto';

/** 开关上按钮的顺序 */
export const THEME_PREFS: readonly ThemePref[] = ['auto', 'light', 'dark'];

export const THEME_LABELS: Record<ThemePref, string> = {
  auto: '跟随系统',
  light: '浅色',
  dark: '深色',
};

/**
 * 给 `<meta name="theme-color">` 用的纸面底色(手机状态栏)。
 *
 * **必须和 `global.css` 里对应的 `--bg` 保持一致**——两处对不上就会出现
 * 「状态栏和页面底色差一点」这种说不上哪里不对的观感。CSS 变量读不到
 * (`<meta>` 在 head 里,而且这个值要在首帧前就写进去),所以只能在这里再写一份。
 */
export const THEME_COLORS = {
  light: '#f1f3f4',
  dark: '#0b0c0e',
} as const;

/** 判断一个来路不明的值是不是合法的偏好。localStorage 里的东西不能当可信。 */
export function isThemePref(value: unknown): value is ThemePref {
  return value === 'auto' || value === 'light' || value === 'dark';
}

/** 系统当前是不是深色。`matchMedia` 在所有目标浏览器上都有,不用兜底。 */
export function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** 把偏好解析成最终要写到 `<html data-theme>` 上的具体值。 */
export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return systemPrefersDark() ? 'dark' : 'light';
}
