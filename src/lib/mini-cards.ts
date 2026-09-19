/**
 * 首页卡片的说明书。
 *
 * 首页现在是一格一格的卡片,每张卡里嵌一个小装置,能直接开测。这份表说清楚
 * 每一张卡**放什么装置、给哪几个读数、底下那句"这个数能当什么用"写什么**。
 *
 * 为什么是一份独立的数据,而不是写在 `index.astro` 的 frontmatter 里:
 * frontmatter 负责**渲染**(画卡片),`<script>` 负责**接线**(挂监听、驱动装置),
 * 而 **frontmatter 变量在 `<script>` 里不存在** —— 脚本被单独打包成外链 module。
 * 两边要靠 `slug` 挂钩,就必须从一个模块里同时 import。这是
 * `keyboard-layout.ts` / `theme.ts` / `mouse-buttons.ts` 的同一个理由。
 *
 * 本模块**只有纯数据**,不碰 DOM,所以能在 node 里直接单测 —— 那个单测断言
 * 这份表和 `tools.ts` 的 `READY_TOOLS` **一一对应**:少一条首页就少一张卡,
 * 多一条就是一张指向不存在页面的卡。
 */

import type { Confidence } from './tools';

/**
 * 卡里那台装置是哪种。
 *
 * `null` 表示**这一项放不进卡片**,装置槽改放一段 `fallback` 说明。
 * 判据只有一句:**卡片里那个数和那一页的数,是不是同一件事?**
 * 不是就老实说不放,别塞一个看着像那么回事的数进去。
 */
export type MiniKind =
  | 'buttons'
  | 'double-click'
  | 'cps'
  | 'wheel'
  | 'hold'
  | 'trail'
  | 'polling'
  | null;

/** 方向带默认保留几格。页面和驱动都读这一个,别各写一个 10。 */
export const DEFAULT_TRACE_SLOTS = 10;

/** 卡片里的一个读数槽。`key` 是驱动 `write()` 时用的名字。 */
export interface MiniReadout {
  key: string;
  label: string;
  /**
   * 单位。给了单位就按等宽 + 拆成「值 / 单位」两段排版 ——
   * 和工具页的 `StatPanel` 一个待遇,不另起一套。
   */
  unit?: string;
  /**
   * `value`(默认)是一个数值槽;`trace` 是一条**方向带**。
   *
   * 方向带每格一次滚动:向下沉到底、向上升顶,孤立反向的那一格标红。
   * 它由 `MiniContext.push()` 一格一格推进,**不走 `write()`** ——
   * 它记的是一串值,不是最后一个值。
   */
  kind?: 'value' | 'trace';
  /** `kind: 'trace'` 时保留几格。默认 {@link DEFAULT_TRACE_SLOTS}。 */
  slots?: number;
}

export interface MiniCard {
  /** 与 `Tool.slug` 对齐。两处靠它挂钩,由单测保证不漏不错。 */
  slug: string;
  /** 卡里的装置;`null` 表示放不进来,见 `fallback`。 */
  kind: MiniKind;
  /**
   * 装置槽**空态**里那句话。
   *
   * 必须有。`global.css` 有一条既成规矩:没数据时不画空槽 ——
   * 一个空的灰框会被读成"组件没加载出来",而不是"还没测"(见 `.rate-chart:empty`)。
   * 所以空态写的是**怎么开始**,不是一个空框。
   */
  prompt: string;
  /** 读数槽,按显示顺序。 */
  readouts: MiniReadout[];
  /**
   * 这一项**特有**的那句限制。
   *
   * 只写这一项独有的部分:通用那半句(`CONFIDENCE_NOTE` 按 `confidence` 出的)
   * **不在卡片里** —— 它只在网格下面那份 `<dl class="confidence-key">` 里渲染
   * 一次。这里不抄它,是因为六个「直接测得」的卡片各抄一遍同一句话,迟早有一份
   * 漂掉。改「四档各是什么意思」请改那份 `<dl>`,不是改这里。
   */
  note: string;
  /** `kind === null` 时,装置槽里改放的说明。 */
  fallback?: string;
}

/**
 * 四档可信度各自的一句话。
 *
 * 这是「关于测量精度」那一节折进卡片之后的**骨架**:原文按测量项分条讲,
 * 现在按可信度分档讲,再叠加每张卡自己的 `note`。事实一条没少,只是换了切法。
 *
 * 措辞必须和 `tools.ts` 的 `CONFIDENCE_LABEL` 对得上,而且**不许比它敢说的更高**。
 */
export const CONFIDENCE_NOTE: Record<Confidence, string> = {
  exact: '浏览器直接给出原始事件流,数出来的就是数出来的。',
  estimate: '要经过一层换算或反推,假设不成立时结果就不成立。',
  shape: '只有形状可信,它证明不了"丢了几次"这种结论。',
  direction: '只有方向这一位信息不需要任何假设,其余都是估算。',
};

export const MINI_CARDS: MiniCard[] = [
  {
    slug: 'button-test',
    kind: 'buttons',
    prompt: '在框里按任意一个鼠标键',
    readouts: [
      { key: 'presses', label: '按下' },
      { key: 'held', label: '当前按着' },
    ],
    note: '侧键那一行空着,只说明页面没收到 —— 有些鼠标的侧键根本不走鼠标事件。',
  },
  {
    slug: 'hold-drag-test',
    kind: 'hold',
    prompt: '在框里按住不放',
    readouts: [
      { key: 'held', label: '已按', unit: 's' },
      { key: 'breaks', label: '疑似瞬断' },
    ],
    note: '中途断一下和真的松手再按完全一样,浏览器分不出来,所以只能叫疑似。',
  },
  {
    slug: 'double-click-test',
    kind: 'double-click',
    prompt: '在框里连点两下',
    readouts: [
      { key: 'clicks', label: '点击' },
      { key: 'gap', label: '上次间隔', unit: 'ms' },
    ],
    note: '间隔小于 50ms 的会被标出来 —— 那个速度人手做不出来。',
  },
  {
    slug: 'scroll-test',
    kind: 'wheel',
    prompt: '在框里滚滚轮',
    readouts: [
      { key: 'direction', label: '方向' },
      { key: 'notches', label: '格数' },
      { key: 'recent', label: '最近 10 次', kind: 'trace', slots: DEFAULT_TRACE_SLOTS },
    ],
    note: '格数是估算,浏览器从不说"一格是多少"。方向带每格一次滚动:向下沉底、向上升顶,红格是反向毛刺。',
  },
  {
    slug: 'cps-test',
    kind: 'cps',
    prompt: '在框里快速连点',
    readouts: [
      { key: 'cps', label: '瞬时 CPS' },
      { key: 'clicks', label: '点击' },
    ],
    note: '这里只给瞬时手感。正式成绩要跑完 5 / 10 / 30 秒模式,去那一页测。',
  },
  {
    slug: 'trail-test',
    kind: 'trail',
    prompt: '在框里画一笔',
    readouts: [
      { key: 'samples', label: '采样点' },
      { key: 'isolated', label: '孤立尖峰' },
    ],
    note: '传感器漏点和手甩快了在数据上是同一个样子,所以只报形状,不报"丢了几次"。',
  },
  {
    slug: 'polling-rate-test',
    kind: 'polling',
    prompt: '在框里来回快速移动',
    readouts: [
      { key: 'hz', label: '回报率', unit: 'Hz' },
      { key: 'samples', label: '采样点' },
    ],
    note:
      '刷得够不够快取决于「每秒移动的英寸数 × DPI」,小框里推不开,' +
      '所以这里的数只能当下限。要测满,去整屏那一页。',
  },
  {
    slug: 'dpi-test',
    kind: null,
    prompt: '',
    readouts: [],
    note: '手推的距离、指针速度滑块、系统缩放都会进到结果里,必须按提示推完固定距离。',
    fallback: '这一项要沿一把尺子推一段固定物理距离,再拿屏幕位移反推。卡片里放不下那把尺子。',
  },
  {
    slug: 'acceleration-test',
    kind: null,
    prompt: '',
    readouts: [],
    note: '要比的是"同样的物理距离、不同的速度",所以必须两趟都推完才有结论。',
    fallback: '这一项要跑两组不同速度做对比,卡片里跑不开。',
  },
  {
    slug: 'keyboard-test',
    kind: null,
    prompt: '',
    readouts: [],
    note: '用的是按键的物理位置,所以输入法、大小写、修饰键都不会影响判定。',
    fallback: '首页上的按键会滚动页面、撞浏览器快捷键,只有进了那一页才能即按即亮。',
  },
];

/** 按 slug 取卡片说明书。 */
export function findMiniCard(slug: string): MiniCard | undefined {
  return MINI_CARDS.find((card) => card.slug === slug);
}
