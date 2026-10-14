/**
 * 刷新率目视测试页(`/refresh-visual-test/`)的文案。
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
 * `refreshEn` 声明成 `typeof refreshZh` —— 英文版漏一个键、拼错一个键、多出一个键,
 * 都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 这一页的中心主张:**那个数是浏览器画帧的节奏,不是显示器的物理刷新率**
 *
 * 整页只有这一件事要说,所以它**不可软化**:`honesty`(第二段正文)、
 * `stats.hz.hint`、`rateLede`、`runtime.measured`、FAQ 第 1 与第 3 条
 * 都在说同一句话的不同侧面。英文里**不能**把它写成"一个刷新率估计值" ——
 * 那正是「测不准就明说」要挡的那种overclaim(这一页报的是 rAF 的节奏,
 * 省电降频、后台标签页、合成器掉帧都会把它拉低,面板规格它读不到)。
 *
 * 三条跟着来的:
 *
 * 1. **对照表那两列是"面板规格",不是"实测"。** `rateLede` 里那句
 *    「落在两档中间就一行都不亮」是刻意的(判据在页面里的 `highlightRate`,
 *    ±10%),它把「没对上」如实说出来,而不是取最近的一档糊过去。
 * 2. **不给结论。** `readPoints` / `blamePoints` 通篇是"你可以怎么看",
 *    一句判断都没有 —— 译文别顺手加一句"这说明你的屏幕有问题"。
 * 3. **起点是"还没开始",不是"样本不够"。** 空态两格读数是破折号、**不调**
 *    `renderStats()`(见页尾注释),所以 `runtime.tooFew` 只在**跑过一轮、
 *    样本确实不够**时才出现 —— 两个状态各有一句话,别合并。
 *
 * ## 带 `**强调**` 的段落
 *
 * 正文里那几个 `**` 是**故意留的标记**,渲染时走 `faq.ts` 的 `faqHtml()`
 * (和 FAQ 答案同一套)。模板里原来是 `<strong>…</strong>`,搬进目录时按这个
 * 约定改写成 `**…**`,句子因此是完整的、没有为了加粗被切成碎片。
 *
 * **跨行的空白一律丢掉**(源模板里的换行在浏览器里会折成一个空格,但目录里
 * 不留 —— 同 `scroll.ts`),**只有 `——` 后面那一格留着**,因为这一页行内
 * 一直写的是 ` —— `,丢掉会让破折号和后面的字粘成一个词。
 *
 * ## 一处 literal backtick(不是 `<code>`,也不是 markdown)
 *
 * FAQ 第 1 条的答案里那次 `(`requestAnimationFrame`)` 是**源文件里的两个
 * 反引号字符**,而且它住在一个**单引号的 JS 字符串**里 —— 所以它既不是
 * `<code>` 标签,也不走 `faqHtml()`。今天这一页渲染出来的就是两个**裸露的
 * 反引号**(`faqHtml()` 不认它)。这里**照抄成原样**,没有顺手改成 `**`:
 * 改了就等于在这一轮里偷偷改文案,而"搬运出错"和"顺带修好"必须分开说。
 * **接线时它是一个决定点**:要么让它继续裸露,要么换成 `**`(那会变成粗体,
 * 丢掉"等宽"那层意思),要么真的用 `<code>`(那要绕开 `faqHtml()` 的转义)。
 *
 * ## 运行期填的占位符
 *
 * | 占位符 | 是什么 | 出现在 |
 * | --- | --- | --- |
 * | `{hz}` | 这一轮实测的帧节奏(`summarizeFrameCadence().hz`) | `runtime.measured`、`rateCells.hz` |
 * | `{ms}` | 中位帧间隔(页面已经 `toFixed(1)`) | `runtime.measured` |
 * | `{samples}` | 参与中位数的有效间隔个数 | `runtime.measured` |
 * | `{frame}` | 一整帧的毫秒(页面拿 `1000 ÷ hz` 现算) | `rateCells.frame` |
 * | `{pointerTestLink}` | 指向回报率测试页的链接,锚文本见 `pointerTestLink` | `tail` |
 *
 * 每句都**整句住在一个键里**,由页面 `fill()` 填 —— 不在句子中间断开,理由同别页。
 *
 * ## 对照表那八行:键是 `hz`,不按下标
 *
 * `rateRows` 一行一档,页面拿 `hz` 去认(`data-rate` / 高亮 / 「常见于」那一列)。
 * **一整帧那一列(`1000 ÷ hz`)不抄进目录** —— 它是算出来的,住在页面里
 * (同 `scroll.ts` 那条:换算除数属于常量,不属于文案)。`rateCells` 给的只是
 * 那两格**看得见的格式**(`{hz} Hz` / `{frame} ms`),单位两种语言里逐字相同。
 *
 * ## 一处和 `tools.ts` 重复的字符串
 *
 * `pointerTestLink` 就是 `tools['polling-rate-test'].name`(英文取
 * `en.tools['polling-rate-test'].name`)。这里**再存一份是为了让目录自洽**
 * (这一页的每一条可见文字都能在本文件里找到),代价是两处可能漂 ——
 * 形状同 `sensitivity.ts` 的 `dpiTestLink`。
 *
 * ## 不在这一份里的东西
 *
 * - 源文件里的代码注释(中英混着的那些)是给开发者看的,不是用户文案。
 * - **本页唯一一条 `throw new Error('测试面未就绪')`** 是开发者字符串,不进文案
 *   (它在页面加载即失败时才可见,用户永远不该看到它)。
 * - 那三档速度的**像素值**(220 / 520 / 1000)是数值,两种语言里逐字相同,
 *   住在页面的 `SPEEDS` 里,不进目录(同 `dpi.ts` 的档位值)。
 * - `SPEEDS` / `RATE_WHERE` 那些**数组顺序**是结构,靠 `hz` / 档位名对上。
 * - `mountCapabilityNotices()` 那几条告警由 `ui.ts` / `capabilities.ts` 的
 *   中央实现管,不属于某一页(这一页传的是 `{ timing: false }`)。
 */

/** FAQ 一行。**文案两边键必须一样**,见文件头 */
export interface RefreshFaqItem {
  q: string;
  a: string;
}

/**
 * 对照表里的一档。
 *
 * `hz` 是**数值**(页面拿它当 `data-rate` 并高亮当前档),`where` 才是要译的
 * 「常见于」那一列。**一整帧那一列不在这里** —— 页面拿 `1000 ÷ hz` 现算,见文件头。
 */
export interface RefreshRateRow {
  hz: number;
  where: string;
}

export const refreshZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'refresh-visual-test',
  /** 页面自己的 `<title>` / meta description。**和 `tools.ts` 里那份逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '刷新率目视测试 - 看方块移动是否流畅',
  metaDescription:
    '一个方块匀速横移,用眼睛判断画面是否流畅、有没有撕裂或一顿一顿的感觉;同时印出浏览器实测的帧节奏。它给的是目视判断加上一个估算值——那个数是浏览器画帧的节奏,不是显示器的物理刷新率。',

  h1: '刷新率目视测试',
  /** 第一段:怎么玩 */
  lede:
    '按「开始」,一个方块会在下面那条带子上匀速横移。**你要做的是看**——' +
    '看它的边缘是否跟得干净、有没有一顿一顿、有没有拖影或撕裂。' +
    '页面同时会印出**浏览器实测的帧节奏**给你作参照。',
  /**
   * 第二段:**这一页的中心主张**,见文件头。译文里那句「浏览器画帧的节奏,
   * 不是显示器的物理刷新率」一个字都不能软。
   */
  honesty:
    '说清楚这个数是什么:**它是浏览器画帧的节奏,不是显示器的物理刷新率。**' +
    '两者通常一致,但它变小的时候你分不出是"面板就这样"还是"浏览器没跟上"。' +
    '所以这一页给的是**你的眼睛加一个参照数**,它不替你下结论。',

  /** 那三档速度按钮的标签。**像素值住在页面的 `SPEEDS` 里**,不进目录 */
  speedLabel: '速度',
  speeds: {
    slow: '慢',
    medium: '中',
    fast: '快',
  },
  /** 控件右边那句静止提示(首屏就有,脚本不改它) */
  hint: '看方块边缘,不要跟着它晃眼睛',

  /** 两格读数。**键就是那两个 `StatPanel` 的 `id`**。`unit` 是单位,两边逐字相同 */
  stats: {
    hz: {
      label: '实测帧节奏',
      unit: 'Hz',
      hint: '浏览器画帧的节奏,不是面板的物理刷新率',
    },
    frameMs: { label: '一帧', unit: 'ms', hint: '中位数,不是平均' },
  },

  rateHeading: '对照表',
  /**
   * 表上面那段说明。**「落在两档中间就一行都不亮」是刻意的**,见文件头 ——
   * 判据在页面的 `highlightRate`(±10%)。
   */
  rateLede:
    '下面按面板规格列出每一档的**一整帧**有多长。这些数字是算出来的' +
    '(1000 ÷ 刷新率),不是抄的。量到的节奏若有对应的一档,那一行会点亮 —— ' +
    '**落在两档中间就一行都不亮**,那本身就是一个值得注意的结果。',
  /** 表头三列 */
  rateColumns: { rate: '刷新率', frame: '一整帧', where: '常见于' },
  /**
   * 表里那两格**看得见的格式**。`{hz}` 是刷新率、`{frame}` 是现算出来的毫秒;
   * `Hz` / `ms` 两个单位两种语言里逐字相同。
   */
  rateCells: { hz: '{hz} Hz', frame: '{frame} ms' },
  /** 那八行。**按 `hz` 查,别按下标对齐**,见文件头 */
  rateRows: [
    { hz: 60, where: '普通办公屏与老笔记本' },
    { hz: 75, where: '早期笔记本面板' },
    { hz: 90, where: '部分高刷笔记本、一体机' },
    { hz: 120, where: '游戏本、iPad Pro、电视' },
    { hz: 144, where: '主流电竞显示器' },
    { hz: 165, where: '电竞显示器(常见超频档)' },
    { hz: 240, where: '高刷电竞显示器' },
    { hz: 360, where: '旗舰电竞显示器' },
  ] as RefreshRateRow[],

  readHeading: '怎么看才对',
  /** 四条。每条开头的 `**…**` 会被排成卡片标题,别挪到句子中间 */
  readPoints: [
    '**方块要够快。**慢速下任何刷新率都是流畅的 —— 60Hz 和 240Hz 的差别只在' +
      '快速移动时才看得出来。先用「快」那一档看,觉得太糊再往下降。',
    '**看边缘,不要用眼睛追它。**让方块从视野里划过去,盯住一个固定的位置 —— ' +
      '追着它看会把顿挫感抹平,因为你的眼睛在跟着补偿。',
    '**和背景的格子比。**那些淡格子是静止的参照系。方块相对格子打滑、跳跃,就是没跟上。',
    '**别在省电模式下测。**笔记本拔掉电源、系统开了省电档、浏览器窗口没在前台 —— ' +
      '这三样都会让刷新率降到和面板规格无关的一个数上。',
  ] as string[],

  blameHeading: '谁在拖后腿',
  /** 四道关那一段的引子 */
  blameLede:
    '画面从"程序说该画了"到你眼睛看到,要过四道关:' +
    '**浏览器画帧 → 合成器合成 → 显卡输出 → 面板响应**。' +
    '这一页的能量到的只有第一道 —— 后面三道它一个都看不到。所以:',
  /** 三条。每一条先是现象,再是可能的原因 —— 都**不下判断** */
  blamePoints: [
    '**数漂亮但看着卡** —— 问题多半在后面三道:合成器掉帧、显卡驱动、线材或面板响应。' +
      '换个页面或另一款浏览器再看一眼,能不能复现是很有用的一条线索。',
    '**数也小、看着也卡** —— 这台机器此刻确实没跑起来。常见原因是省电模式、' +
      '另一个标签页在吃 CPU、扩展程序、或者把笔记本接在了一个带宽不够的外接屏上。',
    '**数漂亮、看着也顺** —— 那这一档对你就是够用的。' +
      '**不需要为了一个更大的数字去换硬件。**',
  ] as string[],

  /**
   * 页尾那段"顺带一句"。
   *
   * **`{pointerTestLink}` 是一枚指向回报率测试页的链接。**整句留在一个键里,
   * 页面先 `faqHtml()` 再 `fill()`(顺序反了刚插进去的 `<a>` 会被转义掉)——
   * 形状同 `sensitivity.ts` 的 `{dpiTestLink}`。
   */
  tail:
    '顺带一句:这一页的动画**由页面自己在画**,所以它占掉的那点时间也算在量的数里。' +
    '一个完全空白的页面量到的数可能略高一点 —— 差别很小,但说清楚比不说好。' +
    '想拿回报率、抖动这类鼠标侧的读数,请去{pointerTestLink};' +
    '那一页量的东西和这一页没有关系。',
  /** 就是 `tools['polling-rate-test'].name`,页面若走 tools 目录取名字可以不要这一条 */
  pointerTestLink: '鼠标回报率测试',

  faqHeading: '常见问题',
  /**
   * 六条。**第 1 条里那对反引号是源文件里就有的原样字符**,见文件头 ——
   * 别顺手改成 `**`。第 3 条「落在整除数上」那条和对照表是同一件事的两面。
   */
  faq: [
    {
      q: '上面那个数是我显示器的刷新率吗?',
      a:
        '**不完全是,而且这一页不会把它当成显示器的规格。**那个数量的是**浏览器画帧的节奏**' +
        '(`requestAnimationFrame`),不是面板的物理刷新率。两者在正常情况下一致,但省电模式降频、' +
        '浏览器被切到后台、合成器掉帧都会让它变小 —— 它说的是"你这台机器此刻跑得有多顺"。' +
        '想知道面板的规格,请看系统设置或显示器自己的菜单:**浏览器读不到那个数。**',
    },
    {
      q: '看着卡,是这个数的问题吗?',
      a:
        '不一定。从"这一帧画好了"到你眼睛看到,中间还有三段:**合成器把图层合成、显卡把画面送出去、' +
        '面板把像素转过去**。这三段浏览器都摸不到,而其中任何一段都可能造成顿挫。' +
        '所以这一页给的是**一个目视判断加一个参照数**,不是结论 —— 同一台机器上,' +
        '看着卡而数很漂亮(或者反过来)都是可能的,那通常说明问题在后面那三段里。',
    },
    {
      q: '为什么有时候报 120 而不是 144?',
      a:
        '因为浏览器画的帧是**按显示器的刷新节拍走的**:144Hz 面板上,浏览器一帧没赶上,就会等到下一个' +
        '刷新节拍,于是实际节奏掉成 72(一半)或 48(三分之一)。**报出来的数落在 144 的整除数上,' +
        '通常说明合成器在掉帧,而不是你的显示器变了。**下面那张表只按面板规格列,' +
        '所以量到 72 这种数时**一行都不会点亮** —— 硬凑到最近的一档等于把"没对上"说成"对上了"。',
    },
    {
      q: '多少 Hz 才够?60 和 144 我真看得出来吗?',
      a:
        '看法很不一样,而且和"看什么"关系极大:**在静止画面上,60 和 144 完全一样**;' +
        '看**快速横移的物体边缘**时差距最容易分出来;而看视频、玩大多数游戏时,差别又回到很小。' +
        '还有一个常被忽略的变量:**每个人的门槛不一样**,而且长期用高刷之后再看 60 会觉得格外卡。' +
        '所以这一页不下判断,只给你一块能横着比的板子。',
    },
    {
      q: '背景那些淡格子是干什么的?',
      a:
        '**静止的参照物。**判断一个东西动得顺不顺,靠的是它和背景之间的相对关系 —— ' +
        '一片没有任何参照的纯色背景上,"一顿一顿"的感觉会被明显削弱,眼睛没有东西可以对比。' +
        '那些线故意压得很淡:它们是参照,不是图案,亮度一高就会把方块边缘抢掉。',
    },
    {
      q: '为什么这个页面自己不自动开始动?',
      a:
        '因为一个不停横移的方块正好是"减少动态效果"这个系统设置要挡的东西 —— ' +
        '所以这一页**不自动播放**,要动必须你自己按一次。' +
        '系统里开了减少动态效果的用户,看到的仍然是一个静止的方块,而不是一段自动播放的动画。',
    },
  ] as RefreshFaqItem[],

  // -------------------------------------------------------------------------
  // 以下都是 `<script>` 里拼出来的句子(以及首屏那几句静态字)。整句一个键,
  // 占位符由 `fill()` 填。
  // -------------------------------------------------------------------------

  /** `<script>` 里那几个字面量。**它们不是正文,但都是用户看得见的字** */
  runtime: {
    /** 两格读数的空态(未测 / 重置)。**不是 `0`** —— 同别页 */
    dash: '—',
    /** 那枚开停按钮的两档 —— 和 `runtime.running` 是一对 */
    start: '开始',
    stop: '停止',

    /** 「开始」按下去之后那句(读数两格同时被清成破折号) */
    running: '跑起来了。盯着方块的边缘看,别用眼睛追它。',
    /**
     * 跑了一轮、但有效间隔还不够算中位数。
     *
     * **它和空态是两句话** —— 空态根本不调 `renderStats()`(见页尾注释),
     * 所以这一句只在"确实跑过、样本确实不够"时出现,别拿它当首屏文案。
     */
    tooFew:
      '帧数还不够,再让它跑一会儿。少于十来个样本的"中位数"什么也说明不了 —— ' +
      '所以这里先给破折号,不给一个凑出来的数。',
    /** 出了结论的那一句。`{hz}` / `{ms}` / `{samples}` 都由页面填 */
    measured:
      '这一轮的帧节奏约 {hz} Hz(中位帧间隔 {ms} ms,' +
      '取 {samples} 个有效间隔的中位数)。' +
      '这是浏览器画帧的节奏,不是显示器的物理刷新率 —— 看着卡不卡,以你的眼睛为准。',
  },
};

export const refreshEn: typeof refreshZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'refresh-visual-test',
  metaTitle: 'Refresh rate visual test — check whether a moving block looks smooth',
  metaDescription:
    'A block glides across at a constant speed so your eyes can judge whether the picture looks smooth and free of tearing or stutter, while the page prints the frame cadence the browser actually measured. What it gives you is a visual judgement plus an estimate — that figure is the browser’s frame cadence, not the display’s physical refresh rate.',

  h1: 'Refresh rate visual test',
  lede:
    'Press “Start” and a block glides steadily across the strip below. **What you have to do is ' +
    'look** — watch whether its edges keep up cleanly, whether it stutters, whether there is ' +
    'smearing or tearing. The page also prints **the frame cadence the browser actually measured** ' +
    'for reference.',
  honesty:
    'Let us be clear about what that number is: **it is the browser’s frame cadence, not the ' +
    'display’s physical refresh rate.** The two usually agree, but when it drops you cannot tell ' +
    'whether the panel is simply like that or the browser failed to keep up. So what this page ' +
    'gives you is **your eyes plus a reference figure** — it does not draw the conclusion for you.',

  speedLabel: 'Speed',
  speeds: {
    slow: 'Slow',
    medium: 'Medium',
    fast: 'Fast',
  },
  hint: 'Watch the block’s edges — do not let your eyes chase it',

  stats: {
    hz: {
      label: 'Measured frame cadence',
      unit: 'Hz',
      hint: 'the browser’s frame cadence, not the panel’s physical refresh rate',
    },
    frameMs: { label: 'One frame', unit: 'ms', hint: 'the median, not the average' },
  },

  rateHeading: 'Reference table',
  rateLede:
    'Below, each tier is listed by the panel specification, with how long **a whole frame** lasts ' +
    'at that rate. These numbers are worked out (1000 ÷ refresh rate), not copied. If the cadence ' +
    'you measured matches a tier, that row lights up — **land between two tiers and no row lights ' +
    'up at all**, which is itself a result worth noting.',
  rateColumns: { rate: 'Refresh rate', frame: 'One frame', where: 'Usually found in' },
  rateCells: { hz: '{hz} Hz', frame: '{frame} ms' },
  rateRows: [
    { hz: 60, where: 'Ordinary office screens and older laptops' },
    { hz: 75, where: 'Early laptop panels' },
    { hz: 90, where: 'Some high-refresh laptops and all-in-ones' },
    { hz: 120, where: 'Gaming laptops, iPad Pro, TVs' },
    { hz: 144, where: 'Mainstream gaming monitors' },
    { hz: 165, where: 'Gaming monitors (a common overclocked tier)' },
    { hz: 240, where: 'High-refresh gaming monitors' },
    { hz: 360, where: 'Flagship gaming monitors' },
  ],

  readHeading: 'How to watch it properly',
  readPoints: [
    '**The block needs to be fast enough.** At slow speeds every refresh rate looks smooth — the ' +
      'difference between 60Hz and 240Hz only shows up in fast movement. Start with the “Fast” ' +
      'setting and drop down if it is too blurry.',
    '**Watch the edges, do not follow it with your eyes.** Let the block sweep across your field ' +
      'of view while you fix on one spot — chasing it smooths the stutter away, because your eyes ' +
      'keep compensating.',
    '**Compare it with the background grid.** Those faint squares are a stationary frame of ' +
      'reference. If the block slips or jumps relative to the grid, it is not keeping up.',
    '**Do not test in power-saving mode.** A laptop unplugged from the mains, the system’s ' +
      'power-saver profile, or a browser window that is not in the foreground — all three drag the ' +
      'refresh rate down to a number that has nothing to do with the panel specification.',
  ],

  blameHeading: 'Who is holding it back',
  blameLede:
    'From the moment the program says “draw now” to the moment your eyes see it, the picture goes ' +
    'through four gates: **the browser painting the frame → the compositor compositing → the GPU ' +
    'outputting → the panel responding**. The only one this page can reach is the first — the ' +
    'other three are invisible to it. So:',
  blamePoints: [
    '**A nice number with visible stutter** — the problem is most likely in the last three gates: ' +
      'the compositor dropping frames, the GPU driver, the cable, or the panel response. Look at ' +
      'another page or another browser: whether it reproduces is a very useful clue.',
    '**A low number and visible stutter** — this machine really is not keeping up right now. The ' +
      'usual causes are power-saving mode, another tab eating CPU, extensions, or a laptop driving ' +
      'an external screen with too little bandwidth.',
    '**A nice number and it looks smooth** — then this tier is enough for you. **There is no need ' +
      'to buy hardware for a bigger number.**',
  ],

  tail:
    'One aside: the animation on this page **is drawn by the page itself**, so the time it takes is ' +
    'counted in what you measure. A completely blank page might measure slightly higher — the ' +
    'difference is small, but it is better said than unsaid. For mouse-side readings such as ' +
    'polling rate and jitter, go to the {pointerTestLink}; what that page measures has nothing to ' +
    'do with this one.',
  pointerTestLink: 'Mouse polling rate test',

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'Is that number my monitor’s refresh rate?',
      a:
        '**Not exactly, and this page never treats it as the display’s specification.** That number ' +
        'measures **the browser’s frame cadence** (`requestAnimationFrame`), not the panel’s ' +
        'physical refresh rate. The two agree under normal conditions, but power-saving ' +
        'downclocking, the browser being sent to the background, or the compositor dropping frames ' +
        'all pull it lower — it tells you how smoothly this machine is running right now. To find ' +
        'out the panel’s specification, look at the system settings or the monitor’s own menu: ' +
        '**the browser cannot read that number.**',
    },
    {
      q: 'It looks stuttery — is that what this number means?',
      a:
        'Not necessarily. From “this frame is painted” to your eyes seeing it, there are still ' +
        'three stretches in between: **the compositor combining the layers, the GPU sending the ' +
        'picture out, the panel turning the pixels over**. The browser can reach none of those, ' +
        'and any one of them can cause a hitch. So what this page gives you is **a visual ' +
        'judgement plus a reference figure**, not a verdict — on the same machine, looking ' +
        'stuttery while the number is beautiful (or the other way round) is entirely possible, and ' +
        'it usually means the problem is in those last three stretches.',
    },
    {
      q: 'Why does it sometimes report 120 rather than 144?',
      a:
        'Because the browser paints its frames **to the display’s refresh beat**: on a 144Hz panel, ' +
        'if the browser misses a frame it waits for the next beat, so the real cadence drops to 72 ' +
        '(a half) or 48 (a third). **When the reported number lands on a divisor of 144, it usually ' +
        'means the compositor is dropping frames, not that your display has changed.** The table ' +
        'below lists panel specifications only, so when you measure something like 72 **not a ' +
        'single row lights up** — forcing it to the nearest tier would be calling “does not match” ' +
        'a match.',
    },
    {
      q: 'How many Hz is enough? Can I really tell 60 from 144?',
      a:
        'It varies a great deal, and it depends heavily on **what you are looking at**: **on a ' +
        'still image, 60 and 144 are exactly the same**; the gap is easiest to spot when you watch ' +
        '**the edge of something moving fast across the screen**; and with video or most games it ' +
        'shrinks back to very little. There is also a variable that is often overlooked: ' +
        '**everyone’s threshold is different**, and after long use of a high refresh rate, 60 ' +
        'looks especially stuttery. So this page passes no judgement — it just gives you a board ' +
        'you can compare across.',
    },
    {
      q: 'What are those faint squares in the background for?',
      a:
        '**A stationary point of reference.** Judging whether something moves smoothly depends on ' +
        'its relationship to the background — on a plain colour with nothing to refer to, the ' +
        'feeling of “jerking along” is noticeably weakened, because your eyes have nothing to ' +
        'compare against. Those lines are kept deliberately faint: they are a reference, not a ' +
        'pattern, and if they were brighter they would steal the block’s edges.',
    },
    {
      q: 'Why does this page not start moving by itself?',
      a:
        'Because a block endlessly sliding sideways is exactly what the “reduce motion” system ' +
        'setting is meant to stop — so this page **does not autoplay**; it only moves when you ' +
        'press once yourself. Users who have reduce motion switched on still see a stationary ' +
        'block rather than an animation playing on its own.',
    },
  ],

  runtime: {
    dash: '—',
    start: 'Start',
    stop: 'Stop',

    running: 'It is running. Keep your eyes on the block’s edges — do not chase it.',
    tooFew:
      'Not enough frames yet — let it run a little longer. A “median” of fewer than a dozen ' +
      'samples says nothing at all, so for now you get a dash rather than a made-up number.',
    measured:
      'This round’s frame cadence is about {hz} Hz (median frame interval {ms} ms, ' +
      'the median of {samples} valid intervals). That is the browser’s frame cadence, not the ' +
      'display’s physical refresh rate — whether it looks stuttery is for your eyes to judge.',
  },
};
