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
 * ## 只有两个状态,没有「跟随系统」
 *
 * 开关上只有「浅色 / 深色」两个按钮。**用户没表态之前一律跟系统**,没人按过开关
 * 就不往 `localStorage` 里写任何东西 —— 所以"没存过"这个状态本身是有意义的,
 * 它表示"还没人表过态"。用户一按开关,存的就是那一次的选择,此后系统再变
 * 也不跟随,页面不会在用户眼皮底下自己换色。
 *
 * (另一条路是首次访问就把解析出来的系统值**写死**进存储。那样"没存过"会立刻
 * 消失,代价是此后系统换深浅色,网站不再跟 —— 对一个"打开就能用"的工具站来说,
 * 没表态的用户跟着系统走才是对的。**要改成写死,`readTheme` 里加一行 `setItem`
 * 即可,但先想清楚上面那句。**)
 *
 * 于是 `localStorage` 里存的和写到 `<html data-theme>` 上的**永远是同一个值**
 * (`'light' | 'dark'`)。CSS 那边因此只需要一个深色选择器
 * (`:root[data-theme='dark']`),不必为了系统偏好再写一遍
 * `@media (prefers-color-scheme: dark)` 的整套令牌 —— 那两份迟早会漂移,
 * 而且会让系统偏好变成 CSS 里一个不存在于 DOM 的状态,以后加令牌必然漏一份。
 *
 * **要把「跟随系统」加回来时注意**:它是一个**持续的第三状态**,不是一次性的
 * 读数。要恢复的是"存储三值 + 一个 media 监听 + 三个按钮",不是加个按钮就完事。
 */

/** 和 `'mouse-test:cps-best'` 同一个命名空间 */
export const THEME_KEY = 'mouse-test:theme';

export type Theme = 'light' | 'dark';

/** 开关上按钮的顺序 */
export const THEME_ORDER: readonly Theme[] = ['light', 'dark'];

export const THEME_LABELS: Record<Theme, string> = {
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
export const THEME_COLORS: Record<Theme, string> = {
  light: '#f1f3f4',
  dark: '#0b0c0e',
};

/** 判断一个来路不明的值是不是合法的主题。localStorage 里的东西不能当可信。 */
export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/** 系统当前偏好哪一档。`matchMedia` 在所有目标浏览器上都有,不用兜底。 */
export function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
