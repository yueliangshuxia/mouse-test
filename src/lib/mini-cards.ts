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
 * **每个诊断工具恰好被一张卡覆盖**:少一条首页就少一张卡,多一条就是一张指向
 * 不存在页面的卡。
 *
 * **不是一一对应。** 一张卡可以用 `covers` 顶掉几个工具页(首页前三张并成一张),
 * 所以卡片数可以少于诊断工具数。但"每个工具恰好出现一次"这条比一一对应更要紧:
 * 它才是"工具不会从首页静默消失"的那道闸门。
 *
 * **对应的是 `DIAGNOSTIC_TOOLS`,不是 `READY_TOOLS`。** 趣味工具(反应速度 /
 * 瞄准)不上首页卡片 —— 它们各要一台**计时器**才能结束(反应要等一段随机延迟,
 * 瞄准要跑满 10–60 秒),而 mini 驱动那套 `settleAfter` 是给"空闲检测"造的,
 * 塞定时刺激进去是拧着用;更要紧的是卡里那个数会和那一页的数**不是同一件事**
 * (卡片只有 120px,刺激面和目标直径都得缩,量出来就是另一个数了)。
 * 首页那一节只给两个链接,不给装置。**加新工具时先问一句:它上不上首页卡片?**
 */

import { CLICK_CHATTER_MS } from './analysis';
import type { Confidence } from './tools';

/**
 * 卡里那台装置是哪种。
 *
 * `null` 表示**这一项放不进卡片**,装置槽改放一段 `fallback` 说明。
 * 判据只有一句:**卡片里那个数和那一页的数,是不是同一件事?**
 * 不是就老实说不放,别塞一个看着像那么回事的数进去。
 */
export type MiniKind =
  | 'mouse-buttons'
  | 'cps'
  | 'wheel'
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

/**
 * 卡片上的一个模式。给了 `MiniCard.modes` 就在描述和装置面之间渲染一排小按钮。
 *
 * 模式只改**这次测量怎么进行**(什么时候结束、装置面那句提示),**不改读数槽的
 * 含义** —— 所以这里刻意没有"按模式换标签"的写法:读数槽在两种模式下指的是同一
 * 件事,换个模式换一套标签只会让人对不上号。CPS 那张卡的三个数(峰值 / 平均 /
 * 次数)两种模式下都成立,正是这条的实例。
 *
 * **选中不启动测量。** 卡片和 CPS 那一页一样是"点一下就开局",按钮只负责换挡;
 * 真要开测还是碰装置面。这是那个按钮不叫「开始」的原因。
 */
export interface MiniMode {
  /** 驱动通过 `ctx.mode` 读到的值。 */
  key: string;
  /** 按钮上的字。 */
  label: string;
  /** 默认选中。一张卡至多一个;一个都没写就是第一个。 */
  default?: boolean;
  /** 这个模式下的空态提示。不写就落回卡片的 `prompt`。 */
  prompt?: string;
}

export interface MiniCard {
  /** 与 `Tool.slug` 对齐。两处靠它挂钩,由单测保证不漏不错。 */
  slug: string;
  /**
   * 这张卡**还顶了**哪几个工具页。
   *
   * 首页一张卡可以覆盖多个工具(按键 / 长按拖拽 / 双击并成一张),但**只有一个
   * slug 能当主工具** —— `data-mini` 挂钩、卡名、卡摘要、可信度徽章全走上面那个
   * `slug`,被顶掉的这几项在这里只贡献两个链接(见 `MiniCard.astro` 的小注)。
   *
   * 被顶掉的工具**不再有自己的 `MiniCard` 条目**。留一条空壳只为了让"一一对应"
   * 好看,代价是那条的 `readouts` / `note` 变成没人读的死数据 —— 下一眼看不出
   * 它已经作废。单测钉的是"每个诊断工具**恰好**被覆盖一次",不是形式上的对齐。
   */
  covers?: string[];
  /**
   * 够宽时这张卡**跨两格**。
   *
   * **只有"一张卡顶了几页"的那种卡该写它** —— 跨格是为了让集合体有地方摊开,
   * 不是为了给单页卡加尺寸。`tests/mini-cards.test.ts` 因此钉住两条:"至多一张卡
   * wide"(两张 wide 在 3 列下是 10 个格子铺 4 行、末尾空两格),以及 wide 的卡
   * 必须真的有 `covers`。
   *
   * **这里只管"要不要",不管"什么时候"** —— 生效条件写在 `global.css` 那个
   * `@container (min-width: 932px)` 里(网格真的排得出三列),因为那是渲染之后
   * 才有的事实。别把这个判断挪进模板。
   *
   * **也不许就地判 `kind === 'mouse-buttons'`**:那样"哪张卡跨格"就成了 `kind`
   * 的副作用,以后再加一张放鼠标的卡会静默地跟着跨格。
   */
  wide?: boolean;
  /** 卡里的装置;`null` 表示放不进来,见 `fallback`。 */
  kind: MiniKind;
  /**
   * 卡片正面的名字。不写就用 `Tool.name`。
   *
   * 一张卡顶几页时必须写,否则卡名只说了一半(`Tool.name` 是**那一页**的名字,
   * 而这一张卡现在也管另外两页)。
   */
  faceName?: string;
  /**
   * 卡片正面那句摘要。不写就用 `Tool.description`。
   *
   * 同理:`Tool.description` 是**页面的 meta description**,服务的是那一页的搜索
   * 结果;卡片顶了几页时那句话对不上卡上的内容。
   */
  faceDesc?: string;
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
   * 模式开关。不写就是"没有模式"—— 那台装置只有一种测法。
   *
   * 两种都要写清楚"什么时候算测完"才算数:模式存在的理由**从来不是**换个数字
   * 看看,而是结束的条件真的不一样。CPS 那个是对的实例(瞬时靠手停下来,
   * 5 秒靠计时器到点);凑数的模式(同一套测法换个标签)不该往这里加。
   */
  modes?: MiniMode[];
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
    /*
     * 一张卡顶三页:按键 / 长按拖拽 / 双击。
     *
     * 徽章取的是 `button-test` 的 `exact`,这**不是漏改**:卡上这四个数(按下次数 /
     * 当前按着 / 双击间隔 / 按住秒数)全是原样计数与原样时间戳。它顶着的
     * `hold-drag-test` 是 `shape`,而那个 `shape` 的结论("按住期间断没断")
     * **刻意不上卡** —— 它要拖满一整段才判得出形状,120px 里出不来。
     * 缺的那一半在小注里说破、并指向那一页。
     *
     * **滚轮只上了这台装置的一半,没进 `covers`。** 卡上多的是"轮子亮起来 +
     * 箭头上/下",而「滚轮」那一页**照旧有自己的卡**(格数、最近 10 次的带子
     * 都在那边)。所以这里不列 `scroll-test` —— 列了就等于声称那一页也被顶掉,
     * 而单测的"恰好覆盖一次"会当场红。卡名把滚轮写进去,是因为**这张卡真的会
     * 响应滚动**,不是因为它顶了那一页。
     */
    slug: 'button-test',
    covers: ['hold-drag-test', 'double-click-test'],
    /* 一张卡顶三页,所以它该有地方摊开 —— 三列时跨两格。见 `MiniCard.wide` */
    wide: true,
    kind: 'mouse-buttons',
    faceName: '按键 / 滚轮 / 长按 / 双击',
    faceDesc: '按下哪个键、按住多久、双击间隔有多长、滚轮朝哪边 —— 都在这张卡上。',
    prompt: '在框里按鼠标键,或滚滚轮',
    /*
     * 读数槽。`held` 这个名字有个坑:并进来之前,按键那张把 `held` 写成**按键名**、
     * 长按那张把 `held` 写成**秒数**。一张卡里一个 key 只能有一个含义,
     * 所以按键名那一条改叫 `holding` 腾出位置。
     */
    readouts: [
      { key: 'presses', label: '按下' },
      { key: 'holding', label: '当前按着' },
      { key: 'gap', label: '双击间隔', unit: 'ms' },
      { key: 'held', label: '按住', unit: 's' },
    ],
    /*
     * 标红的那一处**不是**右上角那个 `双击间隔` 读数,是**下面那一排 chip 里
     * 对应那个键的计数**(参考图里也是计数在变色)。写文案时按代码写的那一处指,
     * 指错了读者会盯着一个永远不会变红的数看。
     *
     * 阈值从 `analysis.ts` 导入,不手抄一个 50:两处写同一个数,迟早只剩一处
     * 被改到,而"文案说 50、代码判 60"这种偏差没有任何东西会报错。
     */
    note:
      `双击间隔小于 ${CLICK_CHATTER_MS}ms 时,下面那个键的计数会标红 —— 那个速度人手做不出来。` +
      '按住期间断没断这张卡看不出:那要拖满一整段才判得出形状,去「长按拖拽」那一页。' +
      '滚轮只报方向:轮子亮起来、箭头指出朝哪边。格数是估算,要看它去「滚轮」那一页。' +
      '侧键那一格是 0 只说明页面没收到,有些鼠标的侧键根本不走鼠标事件。',
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
    /*
     * 两个模式的差别是**结束的条件**,不是"换个数字看看":
     * `instant` 靠手停下来(1.2 秒没有新点击就结算),`five` 靠计时器在 5 秒整
     * 关闭窗口 —— 与手停不停无关,所以中途歇一下不会提前结束那一轮。
     * 后者才是整页 5 秒档的口径,平均值的分母由计时器给,不是从时间戳推的。
     */
    modes: [
      { key: 'instant', label: '瞬时', default: true },
      { key: 'five', label: '5 秒', prompt: '连点 5 秒,第一下就开始计时' },
    ],
    readouts: [
      { key: 'cps', label: '瞬时 CPS' },
      { key: 'clicks', label: '点击' },
    ],
    note: '卡里这个 5 秒够看个大概。要 10 / 30 秒、逐秒柱状图和最好成绩,去那一页。',
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

/**
 * 卡片默认选中的那个模式。没写 `modes` 时是 `undefined`。
 *
 * **两个世界都要它**:`index.astro` 靠它渲染正确的空态提示(模式可以覆盖
 * `prompt`),驱动靠它初始化 `ctx.mode`。判据写两份的话,首帧那句提示和
 * 复位回空态之后那句迟早不一样。
 */
export function defaultMiniMode(card: MiniCard): MiniMode | undefined {
  const modes = card.modes ?? [];
  return modes.find((mode) => mode.default) ?? modes[0];
}
