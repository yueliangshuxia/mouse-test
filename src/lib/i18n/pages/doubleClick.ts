/**
 * 双击测试页(`/double-click-test/`)的文案。
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
 * `doubleClickEn` 声明成 `typeof doubleClickZh` —— 英文版漏一个键、拼错一个键、
 * 多出一个键,都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 带 `**强调**` 的段落
 *
 * 模板里原来是 `<strong>…</strong>`,搬进目录时按仓库的约定改写成 `**…**`,
 * 所以句子是完整的、没有为了加粗被切成碎片。渲染走 `faq.ts` 的 `faqHtml()`
 * (和 FAQ 答案同一套)。渲染时**必须配 `set:html`** —— `{…}` 是转义输出,
 * 直接插值会把星号原样印出来。
 *
 * `steps` / `boundaryPoints` 那一节住在 `<section class="prose prose--cards">` 里,
 * 而 `.prose--cards li > strong:first-child` / `ol.steps li > strong:first-child`
 * 会把每条开头的那个 `<strong>` 显示成卡片标题 —— 所以 `**` 必须留在**开头**
 * 那一句上,不能顺手动到句子中间。
 *
 * ## 有一处 `**` 顶替的是**带颜色的** span —— 全页唯一一处颜色会丢的地方
 *
 * `recordProse` 里原来是 `<span class="mark-danger">红色</span>`(它和日志里那条
 * 红条目同色)。`faqHtml()` 会把 `<`/`>` 转义,留着 span 屏幕上会原样印出标签,
 * 所以**拆成 `{mark}` 占位符 + 一条 `recordProseMark`**,由页面
 * `fill(faqHtml(…), { mark: '<span class="mark-danger">…</span>' })` 填回去 ——
 * **`fill` 必须在 `faqHtml` 之后**,否则 span 自己也会被转义。
 * 同一个形状:`scroll.ts` 的 `stripRedMark`、`holdDrag.ts` 的 `logLedeMark`。
 *
 * 想保住颜色,出口和 `holdDrag.ts` 一样:把那条句子拆成
 * `'… **{danger}** 的那几条…'` + 一个 `dangerMark: '红色'`,接线时
 * `fill(faqHtml(...), { dangerMark: '<span class="mark-danger">红色</span>' })`
 * (`fill` 必须在 `faqHtml` **之后**,否则那个 span 会被一起转义掉)。
 *
 * ## 三个目标按键的名字**这次留在这里了**(和 `holdDrag.ts` 相反)
 *
 * `左键` / `右键` / `中键` 和它们的编号一起构成 `targets`,逐字照抄源文件里的
 * `TARGETS` 常量(顺序是 0→左、2→右、1→中,**不是**按编号排的,所以是数组不是
 * 按编号取键的对象 —— 用 `{'0':…,'1':…,'2':…}` 的话整数键会被 JS 重排成 0/1/2,
 * 中键和右键会调个个儿)。
 *
 * **代价是它和 `zh.ts` 的 `buttons` 命名空间重了一份**(那三个名字在
 * `mouse-buttons.ts` 的 `BUTTONS` 里也有一份)。`holdDrag.ts` / `button.ts` 的
 * 口径是"按键名从 `buttonCopy()` 取、不在页面目录里抄第二份";这一页当初是
 * 自己写死 `TARGETS` 的,所以搬过来时按原样保留。**想让这一页也走中央那张表,
 * 就把这里删掉、改调 `buttonCopy()`** —— 那时 `code` 仍然留在这份文件里,
 * 因为它是结构不是文案。
 *
 * ## 运行期填的占位符
 *
 * | 占位符 | 填什么 |
 * | --- | --- |
 * | `{ms}` | `analysis.ts` 的 `CLICK_CHATTER_MS`(毫秒,构建期常量) |
 * | `{maxMs}` | `analysis.ts` 的 `CLICK_DOUBLE_MAX_MS`(毫秒,构建期常量) |
 * | `{count}` | 计数(那一档里是连击处数,`noteNone` 里是点击总次数) |
 * | `{worst}` | 那批连击里最短的那个间隔(毫秒,已格式化) |
 * | `{min}` | 这次测到的最短间隔(毫秒,已格式化) |
 * | `{gap}` | 日志里那一条的间隔值(毫秒,已格式化为 1 位小数) |
 * | `{n}` | 日志条目的序号 |
 *
 * 注意 `{ms}` 和 `{gap}` 是**两个不同的东西**,只是都指毫秒:`{ms}` 是
 * `CLICK_CHATTER_MS` 那个构建期常量(50),`{gap}` 是运行时量到的某个间隔。
 * 每个键各自 `fill()`,互不影响。
 *
 * ## 刻意写死的散文(改常量时要一起改)
 *
 * 下面这些在源模板里本来就是写死的中文,不是占位符 —— 同 `dpi.ts` 里那条
 * 「`1 厘米` 是散文不是占位符」、`holdDrag.ts` 的同名小节:
 *
 * - FAQ 第 1 条里的 **`60ms`**(人最快的按下-抬起-再按下,和任何常量无关);
 * - FAQ 第 2 条里的 **`500ms`**(Windows 双击速度的默认值,和
 *   `CLICK_DOUBLE_MAX_MS` 数值碰巧相同但**不是一回事**);
 * - FAQ 第 3 条里的 **`50–500ms`** 和 `steps[1]` 里的 **`60–200ms`**(分类区间,
 *   源文件里就是写死的);
 * - `recordProse` 里的 **`20`**(对应脚本的 `LOG_LIMIT = 20`)。
 */

/** 一个可选的目标按键。**编号用的是 `MouseEvent.button` 那套,不是 `buttons` 的位序** */
export interface DoubleClickTarget {
  /** `MouseEvent.button` 的编号:0 左键 / 1 中键 / 2 右键 */
  code: number;
  /** 按钮上显示的那个字 */
  name: string;
}

/** FAQ 一行的形状。**文案两边键必须一样**,见文件头 */
export interface DoubleClickFaqItem {
  q: string;
  a: string;
}

export const doubleClickZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'double-click-test',
  /** 页面自己的 <title> / meta description。**和 `tools.ts` 里那份逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '鼠标双击测试 - 检测微动开关连击与抖动',
  metaDescription:
    '在线检测鼠标是否存在双击故障(连击)。记录每次点击的间隔毫秒数,自动标记小于 50ms 的异常触发,判断微动开关是否老化。',

  h1: '鼠标双击测试',
  lede:
    '在下面的区域里点击选中的那个键,页面会记录**相邻两次按下之间隔了多少毫秒**,' +
    '并把它们分成三类:几毫秒的是微动触点抖动(俗称连击,是故障),' +
    '几十到几百毫秒的是你自己在双击,更长的就是两次独立点击。',

  /**
   * 三个可选的目标按键。**顺序是 0→左、2→右、1→中**,照抄源文件的 `TARGETS`,
   * 所以是数组 —— 见文件头
   */
  targets: [
    { code: 0, name: '左键' },
    { code: 2, name: '右键' },
    { code: 1, name: '中键' },
  ] as DoubleClickTarget[],
  reset: '重置',

  /** 测试区空态那行提示(第一次按下后隐藏,重置时恢复) */
  hint: '在这里点击,建议先正常速度单击十几次,再故意快速双击几次',

  /** 判定块左上角那个标签 */
  verdictLabel: '最短间隔',
  /** 判定块下面那句说明的**空态**。**和脚本里那句是同一句**(一处键,两处出口:
   *  首屏的模板 + 脚本在"还没点够三次"时写回去) */
  verdictNoteIdle: '在下面的区域里点击,至少点三次才能看出间隔',

  /** 右上角那枚徽章的三档 */
  badges: {
    idle: '等待测试',
    chatter: '疑似微动连击',
    none: '未发现连击',
  },

  /** 四格读数。`hint` 为空串表示那一格没有说明;`unit` 只有一格有 */
  stats: {
    presses: { label: '点击次数', hint: '' },
    chatter: { label: '疑似连击', hint: '间隔小于 {ms}ms' },
    doubles: { label: '正常双击', hint: '{ms}–{maxMs}ms' },
    median: { label: '中位间隔', unit: 'ms', hint: '' },
  },

  recordHeading: '间隔记录',
  /** 日志说明。**`**红色**` 顶替了源模板里那个 `<span class="mark-danger">`,见文件头** */
  /**
   * 日志说明。
   *
   * **`{mark}` 是那一处红色,不是加粗。** 源模板用的是
   * `<span class="mark-danger">红色</span>`,而那个颜色**和下面日志里变红的
   * 条目是同一个记号** —— 读者靠它把这句话和那些条目对上。`faqHtml()` 只给得出
   * `**`,给不出颜色,所以拆成占位符由页面填回真正的 span
   * (和 `scroll.ts` 的 `stripRedMark`、`holdDrag.ts` 的 `logLedeMark` 同一套)。
   */
  recordProse:
    '最近 20 次点击的间隔,新的在上面。{mark}的那几条' +
    '就是微动在抖——如果你并没有连续快速点击却出现了红色条目,那只鼠标的微动已经开始老化了。',
  recordProseMark: '红色',

  /** 「怎么测才有意义」那一节。**每条开头的 `**…**` 是卡片标题**,见文件头 */
  stepsHeading: '怎么测才有意义',
  steps: [
    '**先正常速度单击十几次。**间隔会落在几百毫秒以上,全都会被归到“独立点击”。' +
      '这一步是给后面的快速点击做对照。',
    '**再故意快速双击几次。**你会看到日志里出现一批 60–200ms 的“双击”条目,' +
      '这些是正常的,不是故障。',
    '**最后看有没有夹着几毫秒的条目。**那才是故障证据——' +
      '你没有连点,它却报出了两次按下。一次就足以说明微动有问题,多按几次是为了确认不是偶发。',
  ] as string[],

  /** 「读数的边界在哪里」那一节的每段。**段中的 `**…**` 是强调** */
  boundaryHeading: '读数的边界在哪里',
  boundaryPoints: [
    '本页测的是**按下到按下**的间隔,单位毫秒,精度取决于浏览器给事件打的时间戳。' +
      '未开启跨域隔离时这个精度被限制在 100µs,对毫秒级的判断完全够用——这里的数量级和回报率测试' +
      '完全不同,那边要分辨的是 0.125ms,这边最细也只需要分辨到几毫秒。',
    '真正需要留意的是**“没记到的点击”**。本页只能统计收到的事件,报不出来的那一次' +
      '它是看不见的——而固件消抖吞掉点击的表现正是“没记到”。想知道有没有发生这种事,去用' +
      'CPS 测试页:那里你点的总数和记到的总数一对比就看出来了。',
  ] as string[],

  faqHeading: '常见问题',
  faq: [
    {
      q: '“连击”和“双击”有什么区别?',
      a:
        '双击是你有意按了两下,连击是鼠标自己多报了一下。判定靠时间:人手最快也要 60ms 以上才能完成一次按下、抬起、再按下,' +
        '所以间隔短于 {ms}ms 的两次点击必定来自微动的触点抖动。本页把两者分开统计,' +
        '就是为了不让你每双击一次就看到一次“故障”。',
    },
    {
      q: '系统设置里的“双击速度”会影响这个判断吗?',
      a:
        '不会,那是两码事。系统里的双击速度是操作系统用来判断“这两下算不算一次双击操作”的阈值,默认 500ms,可以在控制面板里随便调;' +
        '而本页判断的是“这两下是不是同一个物理动作被记了两次”,阈值取的是人的机械极限。两者差着一个数量级,不会互相干扰。',
    },
    {
      q: '为什么要求点得慢一点?',
      a:
        '因为要给你自己的双击留出空间。如果你连着快速双击,产生的大量 50–500ms 间隔会把日志刷满,真正有问题的那一两次会被淹掉。' +
        '建议是:正常速度单击十几次,再故意快速双击几次,最后看日志里有没有夹着几毫秒的条目。',
    },
    {
      q: '反过来,快速双击没被记到是为什么?',
      a:
        '那是另一个方向的故障:固件的消抖时间设得太长,把真实的第二下也一起吞了。表现是想双击打开文件却没反应、或者拖动时中途掉。' +
        '检测方法是故意快速双击,看页面记到的是 2 次还是 1 次。有些鼠标的驱动里能调消抖时间。',
    },
  ] as DoubleClickFaqItem[],

  // -------------------------------------------------------------------------
  // 以下都是 `<script>` 里拼出来的句子。整句一个键,占位符由 `fill()` 填。
  // -------------------------------------------------------------------------

  /** `<script>` 里那几个字面量。**它们不是正文,但都是用户看得见的字** */
  runtime: {
    /** 所有"什么都还没有"的读数位写的那个破折号(不是 0) */
    dash: '—',
    /** 判定块下面那句说明(判出连击时)。`{count}` 是处数,`{worst}` 是最短的那次 */
    noteChatter:
      '出现了 {count} 次 {ms}ms 以内的间隔,最短 {worst}ms —— ' +
      '如果没有连点却报出这些,微动已经在抖了',
    /** 判定块下面那句说明(测过、没毛病) */
    noteNone: '共 {count} 次点击,最短间隔 {min}ms,都在人能做到的范围内',
    /** 日志空态 */
    logEmpty: '还没有间隔数据',
    /** 日志每一条的序号。`{n}` 是第几次 */
    logIndex: '#{n}',
    /** 日志每一条的间隔值。`{gap}` 是毫秒数(已格式化到 1 位小数) */
    logValue: '{gap} ms',
    /** 日志每一条末尾的分类名 —— 和 `classifyClickGap` 的三档一一对应 */
    kindChatter: '疑似连击',
    kindDouble: '双击',
    kindSeparate: '独立点击',
  },
};

export const doubleClickEn: typeof doubleClickZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'double-click-test',
  metaTitle: 'Mouse double-click test — check for switch chatter and contact bounce',
  metaDescription:
    'Online check for mouse double-click faults (chatter). Records the gap in milliseconds between every click, automatically flags triggers under 50ms, and judges whether the switch is wearing out.',

  h1: 'Mouse double-click test',
  lede:
    'Click the selected button in the area below, and the page records **how many milliseconds ' +
    'apart two consecutive presses were** and sorts them into three kinds: a few milliseconds is ' +
    'the switch contacts bouncing (a fault, commonly called double-clicking); tens to hundreds of ' +
    'milliseconds is you double-clicking yourself; and anything longer is two separate clicks.',

  targets: [
    { code: 0, name: 'Left' },
    { code: 2, name: 'Right' },
    { code: 1, name: 'Middle' },
  ] as DoubleClickTarget[],
  reset: 'Reset',

  hint: 'Click in here — a dozen single clicks at normal speed to start, then a few deliberate fast double-clicks',

  verdictLabel: 'Shortest gap',
  verdictNoteIdle: 'Click in the area below — you need at least three clicks before a gap is meaningful',

  badges: {
    idle: 'Waiting',
    chatter: 'Suspected chatter',
    none: 'No chatter found',
  },

  stats: {
    presses: { label: 'Clicks', hint: '' },
    chatter: { label: 'Suspected chatter', hint: 'gaps under {ms}ms' },
    doubles: { label: 'Double-clicks', hint: '{ms}–{maxMs}ms' },
    median: { label: 'Median gap', unit: 'ms', hint: '' },
  },

  recordHeading: 'Gap log',
  recordProse:
    'The last 20 click gaps, newest on top. The ones in {mark} ' +
    'are the switch chattering — if red rows turn up when you were not clicking fast yourself, ' +
    'that mouse’s switch has already started to wear out.',
  recordProseMark: 'red',

  stepsHeading: 'How to test so the result means something',
  steps: [
    '**Start with a dozen single clicks at normal speed.** The gaps come out in the hundreds of ' +
      'milliseconds or more, all classified as “separate clicks”. This step is the baseline for the ' +
      'fast clicks that follow.',
    '**Then double-click deliberately a few times.** You will see a batch of 60–200ms ' +
      '“double-click” rows in the log; those are normal, not a fault.',
    '**Finally, look for any rows of a few milliseconds.** Those are the evidence of a fault — ' +
      'you did not click twice, yet it reported two presses. One is enough to show the switch has a ' +
      'problem; a few more presses confirm it is not a one-off.',
  ],

  boundaryHeading: 'Where the reading stops',
  boundaryPoints: [
    'This page measures the **press-to-press** gap in milliseconds, and its precision is whatever ' +
      'timestamps the browser puts on events. Without cross-origin isolation that precision is ' +
      'capped at 100µs, which is more than enough for a judgement on the millisecond scale — the ' +
      'order of magnitude here is nothing like the polling rate test, where the job is to tell ' +
      '0.125ms apart; the finest this page needs to resolve is a few milliseconds.',
    'What really deserves attention is **clicks that never got recorded**. This page can only ' +
      'count the events it receives, and a press the mouse never reports is invisible to it — yet ' +
      'a click swallowed by firmware debounce shows up as exactly that, a click that never got ' +
      'recorded. To find out whether that is happening, use the CPS test page: there you can line ' +
      'up how many clicks you made against how many were counted.',
  ],

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'What is the difference between “chatter” and a “double-click”?',
      a:
        'A double-click is you deliberately pressing twice; chatter is the mouse reporting an extra ' +
        'press on its own. The test goes by time: the fastest a hand can manage press, release, ' +
        'press again is 60ms or more, so two clicks less than {ms}ms apart must come from the switch ' +
        'contacts bouncing. The page counts the two separately precisely so that every double-click ' +
        'you make does not flash up as a “fault”.',
    },
    {
      q: 'Does the “double-click speed” in system settings affect this test?',
      a:
        'No — they are two different things. The system’s double-click speed is the threshold the ' +
        'operating system uses to decide whether two presses count as one double-click action; it ' +
        'defaults to 500ms and you can set it to anything in Control Panel. This page decides ' +
        'whether two recorded presses were the same physical action, and its threshold is the ' +
        'mechanical limit of a human hand. The two are an order of magnitude apart and do not ' +
        'interfere.',
    },
    {
      q: 'Why does it ask you to click slowly?',
      a:
        'To leave room for your own double-clicks. If you hammer fast double-clicks one after ' +
        'another, the flood of 50–500ms gaps fills the log and the one or two that actually matter ' +
        'get drowned out. The routine is: a dozen single clicks at normal speed, then a few ' +
        'deliberate fast double-clicks, and finally a look for any rows of a few milliseconds ' +
        'hiding among them.',
    },
    {
      q: 'The other way round: why does a fast double-click go unrecorded?',
      a:
        'That is the fault in the other direction — the firmware debounce is set too long and ' +
        'swallows the real second press along with the bounce. It shows up as a double-click to ' +
        'open a file doing nothing, or a drag dropping part-way. To test for it, double-click fast ' +
        'on purpose and see whether the page records 2 presses or 1. Some mice let you change the ' +
        'debounce time in their driver.',
    },
  ],

  runtime: {
    dash: '—',
    noteChatter:
      'There were {count} gaps under {ms}ms, the shortest {worst}ms — ' +
      'if you were not clicking fast yourself, the switch is chattering',
    noteNone: '{count} clicks in all, shortest gap {min}ms — all within what a human hand can do',
    logEmpty: 'No gap data yet',
    logIndex: '#{n}',
    logValue: '{gap} ms',
    kindChatter: 'Suspected chatter',
    kindDouble: 'Double-click',
    kindSeparate: 'Separate click',
  },
};
