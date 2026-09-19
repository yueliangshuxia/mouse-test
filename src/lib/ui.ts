/**
 * 页面脚本共用的 DOM 工具。
 *
 * 抽出来的直接原因是十个工具页原本各写一份 `setText`。而其中"写入前先比较"
 * 那条**不是风格偏好**:回报率页每 400ms 刷新一次,无条件写 `textContent`
 * 会让浏览器每轮做一次样式重算,而这份开销本身会被如实测成丢帧——
 * 等于自己污染自己的数据。这种约定放在十份副本里,迟早有一份被"优化"掉。
 */

import { detectCapabilities, type Capabilities } from './capabilities';
import {
  isThemePref,
  resolveTheme,
  THEME_COLORS,
  THEME_DEFAULT,
  THEME_KEY,
  THEME_LABELS,
  THEME_PREFS,
  type ThemePref,
} from './theme';

/** `document.getElementById` 的简写。脚本里到处在用,单列一个省得每处都断言。 */
export function el(id: string): HTMLElement | null {
  return document.getElementById(id);
}

/**
 * 写入文本,**内容不同才写**。
 *
 * 见文件头:这不是微优化,是测量精度的一部分。
 */
export function setText(node: Element | null, value: string): void {
  if (node && node.textContent !== value) node.textContent = value;
}

/** 读取 `StatPanel` 渲染出来的数值节点。 */
export function statNode(id: string): Element | null {
  return document.querySelector(`[data-stat="${id}"]`);
}

/** 更新一块统计面板的数值。`id` 对应 `<StatPanel id="...">`。 */
export function setStat(id: string, value: string): void {
  setText(statNode(id), value);
}

/** 更新统计面板下面的小字提示。 */
export function setHint(id: string, value: string): void {
  setText(document.querySelector(`[data-hint="${id}"]`), value);
}

/**
 * 更新一枚徽章。类名和文本都先比较再赋值——徽章的类名切换会触发一次
 * 样式重算,在刷新循环里同样属于自己给自己加的开销。
 */
export function setBadge(node: Element | null, text: string, variant: string): void {
  if (!node) return;
  const cls = `badge badge--${variant}`;
  if (node.className !== cls) node.className = cls;
  setText(node, text);
}

/** 往宿主节点里追加一个提示框。返回创建出来的框,便于后续原地更新。 */
export function showNotice(
  host: Element | null,
  lines: readonly string[],
  variant: 'warn' | 'info' = 'warn',
): HTMLElement | null {
  if (!host || lines.length === 0) return null;

  const box = document.createElement('div');
  box.className = variant === 'info' ? 'notice notice--info' : 'notice';

  const list = document.createElement('ul');
  for (const line of lines) {
    const li = document.createElement('li');
    li.textContent = line;
    list.appendChild(li);
  }

  box.appendChild(list);
  host.appendChild(box);
  return box;
}

/**
 * 能力探测 + 渲染告警。每个工具页开头都是同一段,所以放这里。
 * 返回探测结果,页面可以据此继续降级。
 */
export function mountCapabilityNotices(host: Element | null): Capabilities {
  const caps = detectCapabilities();
  showNotice(host, caps.warnings);
  return caps;
}

/**
 * 把"工作台"从浏览器的默认行为里摘出来。
 *
 * 三样东西会在**手势进行到一半**时插进来,而且都不是我们想测的东西:
 *
 * - **右键菜单**:按住右键沿尺子推(DPI、加速度两页)时,它会在你推的过程中
 *   弹出来盖住画面;画圈的两页(轨迹、回报率)同理——回报率那页整个视口都是
 *   采样面,随便一拖就中招。
 * - **中键自动滚动**:一按下去页面就开始跟着指针滚,采样面从指针底下溜走,
 *   量到的坐标全是错的。这一条**是真的污染读数**,不只是烦人。
 * - **中键 auxclick**:和上面同源,顺带拦掉。
 *
 * 例外是**真正的控件**:链接上右键「在新标签页中打开」、按钮上右键都是正常操作,
 * 夺走只会让人恼火。所以判据是"**落点**是不是控件",而**不是**"点在哪个区域"
 * ——拖拽时指针一定会离开测试区,按区域挂等于没挂(双击页原来就挂在测试区上,
 * 推鼠标推到一半菜单照弹)。
 *
 * **刻意不返回还原函数。** 监听挂在 window 上,随文档一起销毁,没有可泄漏的东西;
 * 而在 `pagehide` 里摘掉它是**错的**——页面进 bfcache 时 `pagehide` 照样触发,
 * 用户按返回键把页面恢复回来之后就再没人拦这些默认行为了。
 */
export function suppressWorkbenchDefaults(): void {
  function isControl(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      target.closest('a, button, select, input, textarea') !== null
    );
  }

  function block(event: Event): void {
    if (isControl(event.target)) return;
    event.preventDefault();
  }

  /** 只有中键会启动自动滚动,左右键的 mousedown 一概不碰 */
  function blockMiddle(event: MouseEvent): void {
    if (event.button !== 1) return;
    block(event);
  }

  window.addEventListener('contextmenu', block);
  window.addEventListener('auxclick', block);
  window.addEventListener('mousedown', blockMiddle);
}

// ---------- 外观主题 ----------

/**
 * 读出**存起来的偏好**(`auto` / `light` / `dark`)。
 *
 * 读不到、读成了别的值、或者 localStorage 直接抛异常(隐私模式),
 * 一律当 `auto`。偏好坏掉和偏好不存在是同一件事,不该区别对待。
 */
export function readThemePref(): ThemePref {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return isThemePref(raw) ? raw : THEME_DEFAULT;
  } catch {
    return THEME_DEFAULT;
  }
}

function writeThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* 记不住偏好不是错误,本次切换照常生效 */
  }
}

/**
 * 把偏好解析成具体主题,写到 `<html data-theme>` 上,并同步状态栏颜色。
 *
 * **`auto` 在这里被解析掉**,所以 DOM 上永远只有 `light` / `dark` 两态,
 * CSS 那边也只需要一个深色选择器。理由见 `theme.ts` 的文件头。
 */
export function applyTheme(pref: ThemePref): void {
  const resolved = resolveTheme(pref);
  document.documentElement.dataset.theme = resolved;

  // 手机状态栏。不跟着走的话,选了深色之后状态栏还是浅色,和页面对不上
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[resolved]);

  for (const button of document.querySelectorAll<HTMLElement>('[data-theme-pref]')) {
    const selected = button.dataset.themePref === pref;
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  }
}

/**
 * 建出外观开关(跟随系统 / 浅色 / 深色)并接线。
 *
 * 首帧用的是 `<head>` 里那个内联脚本定下的值,这里只是把按钮刷成一致的
 * 状态并接上点击——**不重新决定主题**,否则会和控制脚本打架。
 *
 * 和 `suppressWorkbenchDefaults()` 一样**不返回还原函数**:监听挂在宿主持有的
 * 元素上,随文档一起销毁;而在 `pagehide` 里摘是错的(进 bfcache 时它照样触发)。
 */
export function mountThemeToggle(host: Element | null): void {
  if (!host) return;

  const fragment = document.createDocumentFragment();
  for (const pref of THEME_PREFS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.themePref = pref;
    button.textContent = THEME_LABELS[pref];
    fragment.appendChild(button);
  }
  host.replaceChildren(fragment);

  applyTheme(readThemePref());

  // 事件委托:按钮是刚建出来的,而且以后可能改文案/顺序
  host.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest('[data-theme-pref]');
    const pref = button instanceof HTMLElement ? button.dataset.themePref : undefined;
    if (!isThemePref(pref)) return;

    writeThemePref(pref);
    applyTheme(pref);
  });

  /*
   * 系统主题在页面开着的时候被改了。**只有仍处于「跟随系统」时才跟着动**——
   * 用户点过「浅色」之后,系统再变也不能把页面改回去,那是他明确表达过的选择。
   */
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', () => {
    if (readThemePref() === 'auto') applyTheme('auto');
  });
}

/**
 * 固定间隔的刷新循环。返回停止函数。
 *
 * 用 `requestAnimationFrame` 而不是 `setInterval`:后台标签页里 `setInterval`
 * 会被压到 1Hz(对本站无所谓),但更重要的是 rAF 与绘制对齐,不会出现
 * "算完了却挤不进这一帧"的空转。间隔用时间差判断而不是累加计数,
 * 所以掉帧之后也不会漂移。
 */
export function createTicker(intervalMs: number, fn: (now: number) => void): () => void {
  let rafId = 0;
  let last = Number.NEGATIVE_INFINITY;

  const loop = (now: number): void => {
    rafId = requestAnimationFrame(loop);
    if (now - last < intervalMs) return;
    last = now;
    fn(now);
  };

  rafId = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(rafId);
}

/**
 * 读取本地保存的最好成绩。
 *
 * 包在 try 里是因为隐私模式下 `localStorage` 一碰就抛异常。记不住成绩
 * 不是错误,不该因此让整个页面崩掉。
 */
export function loadBest(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/** 保存最好成绩。只在新成绩更好时才写入。返回是否刷新了纪录。 */
export function saveBest(key: string, value: number): boolean {
  const previous = loadBest(key);
  if (previous !== null && previous >= value) return false;
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* 存不下就算了,不影响本次结果展示 */
  }
  return true;
}

/**
 * 固定小数位的数字格式化。非有限值一律给破折号。
 *
 * 每个页面都自己写 `value === null ? '—' : value.toFixed(2)` 看着琐碎,
 * 但它保证了"算不出来时显示破折号而不是 0 或 NaN"这条约定全站一致——
 * 显示 0 和显示"算不出来"是两件完全不同的事。
 */
export function format(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}
