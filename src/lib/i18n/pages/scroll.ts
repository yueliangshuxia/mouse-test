/**
 * 滚轮测试页(`/scroll-test/`)的文案。
 *
 * ## 为什么一页一个文件
 *
 * 理由写在 `pages/cps.ts` 的文件头:全站要做双语,量是约 2000 条字符串、
 * 21 个页面。**每页一份文件**是为了让这件事可以一页一页做、也可以几页同时做
 * 而互不冲突 —— 都塞进 `zh.ts` / `en.ts` 那两个大文件的话,两个人同时动一页
 * 就会撞在一起。
 *
 * ## 两边的键必须一样,而这是**机制**不是约定
 *
 * `scrollEn` 声明成 `typeof scrollZh` —— 英文版漏一个键、拼错一个键、多出一个键,
 * 都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 这一页的立场:只有**方向**可信,格数是估算
 *
 * 浏览器只给 `deltaY` 和 `deltaMode`,而 `deltaMode` **从不说"一格是多少"**
 * (见 `analysis.ts` 的 `normalizeWheelDelta`)。所以译文里**不能把"格数是估算"
 * 弱化成一句泛泛的"仅供参考"**,那是这一页全部设计的来源,也是它不提供"格数曲线"
 * 的理由。
 *
 * ## 三处机械替换,都不是改写
 *
 * - `<strong>…</strong>` → `**…**`。渲染走 `faq.ts` 的 `faqHtml()`,整段可以住在
 *   一个键里,不必为了加粗把句子切成碎片 —— 拆开之后翻译的人看不到完整的句子。
 * - `<code>deltaY</code>` / `<code>deltaMode</code>` → `**deltaY**` / `**deltaMode**`。
 *   **这是权衡不是等价**:`faqHtml()` 会把 `<`/`>` 转义成 `&lt;`/`&gt;`,留着
 *   `<code>` 屏幕上会原样印出标签,所以取 `**` —— 保住"这几个词被单独标出来了",
 *   代价是从等宽片变成粗体。理由和 `button.ts` 那条完全相同。
 * - `<span class="mark-danger">红色</span>` → `{redMark}`(见下),**这一处不降级**。
 *
 * ## 那两个字「红色」是**带颜色的**,所以它走 `{redMark}` 而不是 `**`
 *
 * 那句「…**红色**的是反向毛刺…」里的「红色」指的是**下面那条方向带里那些红格子**
 * (`.strip__mark--glitch`,朱砂)。它是**用颜色本身在指代**,和 `polling.ts` 里
 * 那根"橙色柱子"是同一类记号 —— 所以这里**没有**把它换成 `**红色**`:
 * `**` 只给得出粗体,那层颜色会当场丢掉。
 *
 * 出口是把整句留着、`{redMark}` 当占位符,接线时填
 * `<span class="mark-danger">${t.stripRedMark}</span>`(形状同 `sensitivity.ts`
 * 的 `{dpiTestLink}`,只是这枚带的是着色标记而不是链接)。**`stripRedMark`
 * 就是那两个字的锚文本**,单独一个键。
 *
 * ## 运行期填的占位符
 *
 * | 占位符 | 在哪 | 填什么 |
 * | --- | --- | --- |
 * | `{redMark}` | `stripLede` | 那两个字「红色」的着色标记(见上) |
 * | `{down}` / `{up}` | `netNoteMeta` | 这次的向下 / 向上格数 |
 * | `{count}` | `badgeGlitch` | 判出的毛刺条数 |
 * | `{dir}` | `stripMarkTitle` | `dirDown` / `dirUp` —— 那一格的方向 |
 * | `{notches}` / `{raw}` | `stripMarkTitle` | 那一格的格数与原始 deltaY |
 * | `{deltaY}` / `{deltaMode}` | `deltaRawMeta` | 最近一个滚轮事件的原始两个值 |
 *
 * 每句都**整句住在一个键里**,由页面 `fill()` 填 —— 不在句子中间断开,理由同别页。
 *
 * ## 换算表那一行按 `mode` 查,不按下标
 *
 * `deltaModes` 一行一件,键是 `mode`(0/1/2),页面对着自己的 `DELTA_MODES`
 * 按 `mode` 去查 —— **不要按下标对齐**,那张表的顺序哪天一动就会静默错位。
 * 表里那列**换算除数**(100 / 3 / 1)是 `WHEEL_PIXELS_PER_NOTCH` /
 * `WHEEL_LINES_PER_NOTCH` 这两个常量,属于 `analysis.ts`,**不抄进目录**
 * (`dpi.ts` 的档位值同理留在页面里)。
 *
 * ## 不在这一份里的东西
 *
 * - 源文件里的代码注释(中英混着的那些)是给开发者看的,不是用户文案。
 * - **本页没有 `throw new Error(...)` 文案**,所以没有要跳过的开发者字符串。
 * - 那条 80 格方向带里的 `div` / class 名是结构,不是文案;`0` 那种初值同理。
 */

/** FAQ 一行。**文案两边键必须一样**,见文件头 */
export interface ScrollFaqItem {
  q: string;
  a: string;
}

/**
 * 「浏览器给的到底是什么」那张表的一行。
 *
 * `name` 是事件常量名(`DOM_DELTA_*`)—— **两种语言里逐字相同**,留在这里是为了
 * 让目录自洽(这一页每一条可见文字都能在本文件里找到,同 `sensitivity.ts` 的
 * `dpiTestLink`)。`note` 才是要译的那列含义。
 */
export interface ScrollDeltaModeRow {
  mode: number;
  name: string;
  note: string;
}

export const scrollZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'scroll-test',
  /** 页面自己的 `<title>` / meta description。**和 `tools.ts` 里那份逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '鼠标滚轮测试 - 检测滚轮方向与格数是否正常',
  metaDescription:
    '在线测试鼠标滚轮,实时显示滚动方向、每个滚轮的格数与累积位移,帮助判断滚轮编码器是否跳格或失灵。',

  h1: '鼠标滚轮测试',
  lede:
    '把指针放在下面的区域里,然后滚动滚轮。页面会实时显示滚动方向、累计格数与每一格的方向,' +
    '并在你**持续朝一个方向滚动却出现反向**时把它标出来——那是滚轮编码器开始' +
    '跳格时最典型的样子。',

  /** 测试面空态那句提示 */
  hint: '把指针放在这里,然后滚动滚轮',
  /** 滚动方向那枚大箭头:向下 / 向上。**两个方向各一个键** */
  arrowDown: '↓',
  arrowUp: '↑',

  /** 方向带那一节 */
  stripHeading: '最近 80 格的方向',
  /** `{redMark}` 是那两个字「红色」的着色标记,见文件头 */
  stripLede:
    '向下滚是沉到底部,向上滚是顶到顶部。{redMark}的是' +
    '反向毛刺——你一直在朝一个方向滚,它却单独跳了一下。',
  /** `{redMark}` 里那两个字,即带颜色的锚文本 */
  stripRedMark: '红色',

  reset: '重置',
  /** 那行控件:「当前事件:」+ 一个由脚本写的值 */
  currentEvent: '当前事件:',
  /** 没数据时那个破折号 —— 读数槽和「当前事件」两处共用 */
  dash: '—',
  /** 那格大读数左边的标签 */
  verdictLabel: '累计滚动',
  /** `格` 这个词单位,三处共用(两格读数 + 那格大读数) */
  notchUnit: '格',
  /** 大读数下面那行说明的空态。`{down}` / `{up}` 是运行时那两格 */
  netNoteIdle: '正数向下,负数向上',
  netNoteMeta: '{down} 格向下 · {up} 格向上',

  /** 方向那枚徽章的档:空态 / 正在向下 / 正在向上 */
  badgeWaiting: '等待滚动',
  badgeDown: '正在向下',
  badgeUp: '正在向上',
  /** 毛刺那枚徽章的档:没毛刺 / 有毛刺(`{count}` 是条数) */
  badgeNoGlitch: '未发现跳格',
  badgeGlitch: '疑似跳格 {count} 次',

  /** 四格读数。`hint` 为空串表示那一格没有说明 */
  stats: {
    down: { label: '向下', hint: '' },
    up: { label: '向上', hint: '' },
    glitches: { label: '疑似跳格', hint: '持续同向时出现的反向' },
    typical: { label: '一格原始值', hint: '你系统里的 deltaY' },
  },

  /** 方向带每一格的 `title`。`{dir}` 取 `dirDown` / `dirUp` */
  stripMarkTitle: '{dir} {notches} 格 · deltaY={raw}',
  dirDown: '向下',
  dirUp: '向上',

  /** 脚本每次刷新的「当前事件」那行。`{deltaY}` / `{deltaMode}` 是原样两个数 */
  deltaRawMeta: 'deltaY {deltaY} · deltaMode {deltaMode}',

  resultsHeading: '怎么看结果',
  /**
   * 三条。**整段一个键**、一律走 `faqHtml` —— 每条开头的 `**…**` 会被
   * `.prose--cards li > strong:first-child` 排成卡片标题,句中那几处
   * `<strong>` 也一并变成 `**`(同 `polling.ts` 的 `explainPoints`)。
   */
  resultsPoints: [
    '**疑似跳格**是这里唯一指向故障的数字。它的定义很窄:一个孤立的反向事件,' +
      '前后都是同一个方向。用户在持续滚动时不会产生这种序列,所以它一旦出现就值得怀疑。' +
      '但**它不是铁证**——手指打滑、触控板误触、系统在做平滑插值都能造出同样的波形。' +
      '所以正确用法是:只朝一个方向匀速滚二十几格,如果反复冒红,那才是编码器的问题。',
    '**方向反转**次数本身**不是**故障指标,所以没放在上面的面板里。' +
      '你自己每换一次方向它就会加一,滚上滚下几趟就能累积出一堆,拿它判断故障只会吓到自己。',
    '**一格原始值**告诉你系统报出来的 deltaY 是多少。对上一眼:Windows 上 ' +
      'Chrome 通常是 100(像素模式),Firefox 通常报 3(行模式)。如果你的数完全不是这两个样子,' +
      '说明系统或驱动改过滚动设置,这时格子数的换算就只是粗略参考了。',
  ] as string[],

  deltaHeading: '浏览器给的到底是什么',
  deltaLede:
    '滚轮事件携带的是 **deltaY** 加一个 **deltaMode**,后者只说明单位是' +
    '像素、行还是页,**但它不说“一行多高”“一格多少像素”**。所以任何把 deltaY ' +
    '换算成“格数”的做法都带一个假设。本页用的假设写在下面这张表里,你可以对照自己的实际情况:',

  /** 换算表的四列。第一列是事件字段名,两种语言都一样 */
  deltaColumns: { mode: 'deltaMode', name: '名称', meaning: '含义', perNotch: '本页按几算一格' },
  /** 换算表的三行。**按 `mode` 查,别按下标**,见文件头 */
  deltaModes: [
    { mode: 0, name: 'DOM_DELTA_PIXEL', note: '按像素计' },
    { mode: 1, name: 'DOM_DELTA_LINE', note: '按行计' },
    { mode: 2, name: 'DOM_DELTA_PAGE', note: '按页计' },
  ] as ScrollDeltaModeRow[],

  deltaTail:
    '也正因为换算是估算,本页把**方向**当作主指标。方向不需要任何换算——' +
    '直接读 deltaY 的符号就行,不受系统设置影响,跨浏览器也一致。',

  faqHeading: '常见问题',
  faq: [
    {
      q: '格数是准的吗?',
      a:
        '不准,它是个估算。浏览器只告诉你 deltaY 的数值和单位(像素/行/页),没告诉你“一格是多少”——' +
        '系统里“一次滚动多少行”的设置、驱动的平滑滚动、以及鼠标是不是无极滚轮,都会改变这个数。' +
        '本页按常见约定换算(像素模式 100 一格、行模式 3 行一格),所以真正可信的是**方向**和**方向反转**,那两个不需要任何换算。',
    },
    {
      q: '怎么判断滚轮编码器坏了?',
      a:
        '最典型的表现是“反向毛刺”:你一直朝一个方向滚,中间突然跳一下反方向,而且前后都是正常的。' +
        '本页会把这种波形单独数出来,就是下面那个“疑似跳格”。要注意它只是怀疑对象——手指打滑、' +
        '触控板误触也能造出同样的波形,所以判读方法是:只朝一个方向匀速滚二十几格,看有没有出现毛刺。',
    },
    {
      q: '为什么滚动的时候页面不动?',
      a:
        '这是故意的。如果让页面跟着滚,测试区会从指针底下溜走,越滚越测不到。所以本页把滚动事件拦了下来,' +
        '只统计不滚动。想恢复正常浏览,把指针移出这个区域就行。',
    },
    {
      q: '无极滚轮和普通滚轮的结果有什么不同?',
      a:
        '无极滚轮(可以一直转、带惯性自由滑行的那种)一次滑动会发出几十上百个连续的小 delta,' +
        '所以条带会刷得飞快、累计格数也会大得离谱——那是它的正常工作方式,不是故障。' +
        '判断这类鼠标要看**方向是否连贯**,而不是格数。',
    },
  ] as ScrollFaqItem[],
};

export const scrollEn: typeof scrollZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'scroll-test',
  metaTitle: 'Mouse wheel test — check scroll direction and notch count',
  metaDescription:
    'Online mouse wheel test: shows the scroll direction, the notch count and the accumulated travel in real time, to help tell whether the wheel encoder is skipping or failing.',

  h1: 'Mouse wheel test',
  lede:
    'Put the pointer in the area below and roll the wheel. The page shows the scroll direction, ' +
    'the accumulated notches and the direction of each notch in real time, and marks it out when you ' +
    '**keep scrolling one way yet a reversal shows up** — the classic look of a wheel encoder ' +
    'starting to skip.',

  hint: 'Put the pointer here, then roll the wheel',
  arrowDown: '↓',
  arrowUp: '↑',

  stripHeading: 'Direction of the last 80 notches',
  stripLede:
    'Scrolling down sinks to the bottom, scrolling up rises to the top. The {redMark} ones are ' +
    'reverse glitches — you kept scrolling one way, and one notch alone jumped the other way.',
  stripRedMark: 'red',

  reset: 'Reset',
  currentEvent: 'Current event:',
  dash: '—',
  verdictLabel: 'Net scroll',
  notchUnit: 'notches',
  netNoteIdle: 'positive down, negative up',
  netNoteMeta: '{down} notches down · {up} notches up',

  badgeWaiting: 'Waiting to scroll',
  badgeDown: 'Scrolling down',
  badgeUp: 'Scrolling up',
  badgeNoGlitch: 'No skips found',
  badgeGlitch: '{count} suspected skips',

  stats: {
    down: { label: 'Down', hint: '' },
    up: { label: 'Up', hint: '' },
    glitches: { label: 'Suspected skips', hint: 'a reversal while scrolling one way' },
    typical: { label: 'Raw notch value', hint: 'the deltaY your system reports' },
  },

  stripMarkTitle: '{dir} {notches} notches · deltaY={raw}',
  dirDown: 'down',
  dirUp: 'up',

  deltaRawMeta: 'deltaY {deltaY} · deltaMode {deltaMode}',

  resultsHeading: 'How to read the result',
  resultsPoints: [
    '**Suspected skips** is the only number here that points at a fault. Its definition is narrow: ' +
      'one isolated reversed event, with the same direction on both sides. Steady scrolling never ' +
      'produces that sequence, so when it appears it is worth suspecting. But **it is not proof** — ' +
      'a slipping finger, a trackpad mis-touch or the system doing smooth interpolation can all ' +
      'produce the same shape. So the right way to use it is: scroll steadily one way for twenty-odd ' +
      'notches, and if the red keeps appearing, that is the encoder.',
    '**Direction reversals** are **not** a fault indicator on their own, which is why they are not ' +
      'on the panel above. Every time you change direction it goes up by one, and a few trips up and ' +
      'down pile up a heap of them — using it to judge a fault would only scare you.',
    '**Raw notch value** tells you what deltaY your system reports. Check it at a glance: on ' +
      'Windows, Chrome is usually 100 (pixel mode) and Firefox usually reports 3 (line mode). If ' +
      'your number looks nothing like either, the system or driver has changed the scroll settings, ' +
      'and the notch conversion is then only a rough guide.',
  ],

  deltaHeading: 'What the browser actually gives you',
  deltaLede:
    'A wheel event carries **deltaY** plus a **deltaMode**, and the latter only says whether the ' +
    'unit is pixels, lines or pages — **it does not say how tall a line is or how many pixels a ' +
    'notch is**. So any attempt to turn deltaY into a "notch count" carries an assumption. The ' +
    'assumptions this page uses are written out in the table below, so you can check them against ' +
    'your own setup:',

  deltaColumns: { mode: 'deltaMode', name: 'Name', meaning: 'Meaning', perNotch: 'Treated as one notch' },
  deltaModes: [
    { mode: 0, name: 'DOM_DELTA_PIXEL', note: 'Counted in pixels' },
    { mode: 1, name: 'DOM_DELTA_LINE', note: 'Counted in lines' },
    { mode: 2, name: 'DOM_DELTA_PAGE', note: 'Counted in pages' },
  ],

  deltaTail:
    'And precisely because the conversion is only an estimate, this page treats **direction** as ' +
    'the main indicator. Direction needs no conversion at all — just read the sign of deltaY. It is ' +
    'unaffected by system settings and consistent across browsers.',

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'Is the notch count accurate?',
      a:
        'No, it is an estimate. The browser only tells you the value and the unit of deltaY ' +
        '(pixels/lines/pages); it never says how big a "notch" is — the system setting for how many ' +
        'lines one scroll moves, the driver’s smooth scrolling, and whether the mouse is a ' +
        'free-spinning wheel all change that number. This page converts by the common conventions ' +
        '(pixel mode: 100 per notch, line mode: 3 lines per notch), so what is really trustworthy is ' +
        '**direction** and **direction reversal** — those need no conversion at all.',
    },
    {
      q: 'How do I tell whether the wheel encoder is broken?',
      a:
        'The most typical sign is a "reverse glitch": you keep scrolling one way, and in the middle ' +
        'one event suddenly jumps the other way, with normal scrolling on either side. This page ' +
        'counts that shape on its own — it is the "Suspected skips" figure below. Note that it is ' +
        'only a suspect: a slipping finger or a trackpad mis-touch can produce the same shape. So ' +
        'the way to read it is: scroll steadily in one direction for twenty-odd notches and see ' +
        'whether a glitch appears.',
    },
    {
      q: 'Why does the page not move while I scroll?',
      a:
        'That is deliberate. If the page scrolled along, the test area would slide out from under ' +
        'the pointer and the more you scrolled the less it would measure. So this page intercepts ' +
        'the scroll events — it only counts, it does not scroll. To go back to normal browsing, ' +
        'move the pointer out of this area.',
    },
    {
      q: 'How does a free-spinning wheel differ from a normal one?',
      a:
        'A free-spinning wheel (the kind that keeps turning and glides on under its own momentum) ' +
        'sends dozens or hundreds of small consecutive deltas in a single flick, so the strip ' +
        'refreshes very fast and the accumulated notch count comes out absurdly large — that is how ' +
        'it is meant to work, not a fault. To judge this kind of mouse, look at **whether the ' +
        'direction is consistent**, not at the notch count.',
    },
  ],
};
