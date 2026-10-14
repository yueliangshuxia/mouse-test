/**
 * 反应速度测试页(`/reaction-test/`)的文案。
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
 * `reactionEn` 声明成 `typeof reactionZh` —— 英文版漏一个键、拼错一个键、
 * 多出一个键,都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 这一页的中心主张:**那个毫秒数一定偏大,而且不许减掉任何估算值**
 *
 * 读到的数装的是**整条链路**:屏幕刷新(锚点在帧首,所以必然多等**整整一帧**)
 * + 约半个扫描周期 + 面板灰阶 2–10ms + 鼠标 USB 采样(125Hz 最坏 4ms)
 * + OS/浏览器 1–3ms,60Hz 上合计约 25–35ms。
 *
 * 所以正文里有**两处不可软化**的话,译文必须原样带着:
 *
 * 1. `honesty` 与 `chainBody` 里那句 —— 它测的是**整套设备**,不是用户本人;
 * 2. `chainBody` 里那句「**不替你减掉一个估算的修正量**」,以及
 *    `OFFSET_TABLE` 那张表下的注释所说的话:**那张表只用来解释"为什么这个数偏大",
 *    绝不拿去减任何结果**。英文里**不能**把它写成"仅供参考的修正值",
 *    那是全站禁止的那个假数字,也是这一页的诚实所在。
 *
 * ## 四类作废各有各的说法,是**故意分开**的
 *
 * `抢跑`(false start)/ `可疑`(implausible)/ `超时`(timeout)/ `作废`(void)
 * 四类在页面上是**分开计数**的,所以英文也必须各给一个词,不能合并成
 * "invalid" 一个词把四类抹平。其中 `可疑` 与 `作废` 各自还有两种出处:
 * 一个是读数槽那一格,一个是逐次记录里那一行,措辞一样、语气一样。
 *
 * ## `**强调**` 在源文件里**本来就是这个写法**
 *
 * 这一页的 `FAQ` 数组和正文里已经是 `**…**`(不是 `<strong>`),渲染走
 * `faq.ts` 的 `faqHtml()`。所以句子是完整的、没有为了加粗被切成碎片。
 * 唯一要注意的是 `varyPoints`:那一段住在 `<section class="prose prose--cards">` 里,
 * `.prose--cards li > strong:first-child` 会把**每条开头**那个 `**…**` 排成卡片标题 ——
 * 所以开头那处**不能动到句子中间**。
 *
 * ## 这一页**没有**带颜色的行内记号,也**没有** `<br />`
 *
 * - 全文**没有** `<span class="mark-danger">`(或任何着色 span)—— 源文件里
 *   一个都搜不到,所以没有 `{mark}` / `{redMark}` 那一类占位符。别照着
 *   `scroll.ts` / `holdDrag.ts` 的样子凭空加一个。
 * - 全文也**没有** `<br />` —— 源文件里没有,所以没有 `{br}`(对比 `polling.ts`)。
 *
 * ## 运行期填的占位符
 *
 * | 占位符 | 常量 / 值 | 出现在 |
 * | --- | --- | --- |
 * | `{trials}` | `analysis.ts` 的 `TRIALS_PER_ROUND` | `lede`、`runtime.metaIdle`、`runtime.logEmpty`、FAQ 第 7 条 |
 * | `{minValid}` | `analysis.ts` 的 `MIN_VALID_TRIALS` | `stats.median.hint`、`runtime.metaTooFew`、FAQ 第 7 条 |
 * | `{implausibleMs}` | `analysis.ts` 的 `RT_IMPLAUSIBLE_MS` | `stats.suspect.hint`、`runtime.logSuspect`、FAQ 第 5 条 |
 * | `{timeoutMs}` | `analysis.ts` 的 `RT_TIMEOUT_MS` | `runtime.metaTimeout`、`runtime.logTimeout`、FAQ 第 6 条 |
 * | `{waitMin}` / `{waitMax}` | `RT_WAIT_MIN_MS` / `RT_WAIT_MAX_MS` **÷ 1000**(秒) | FAQ 第 4 条 |
 * | `{ms}` | 这一次实测的毫秒(`format(...)`) | `runtime.callMeasured` / `callMedian` / `hintHzFrame` |
 * | `{n}` | 这一次是第几次(`trials.length + 1`) | `runtime.metaMeasured` |
 * | `{valid}` / `{fastest}` | `summarizeReaction()` 的两个数 | `runtime.metaMedian` / `metaTooFew` |
 * | `{best}` | `loadBest()` 读回来的本机纪录 | `runtime.hintBest` |
 * | `{record}` | 取 `runtime.recordNew` / `runtime.recordNone` | `runtime.metaMedian` |
 *
 * 每句都**整句住在一个键里**,由页面 `fill()` 填 —— 不在句子中间断开,理由同别页。
 *
 * ## 一处键、两处出口(和三处)
 *
 * - `stats.median.hint` 既是那个读数槽的 `hint`,也是 `renderStats()` 里
 *   `setHint('median', …)` 复位时写回去的那句(`best === null` 那一支);
 * - `stats.hz.hint` 同理:读数槽的 `hint`,和「重置」时 `setHint('hz', …)` 那句;
 * - `runtime.metaIdle` 既是首屏模板里 `#meta` 的字,也是「重置」时写回去的那句。
 *
 * **别为了"两处"各留一个键**,那样迟早漂(和 `holdDrag.ts` 的 `verdictNoteIdle` 同一条)。
 *
 * ## `stats` 那一行按 `id` 查,不按下标
 *
 * `median` / `fastest` / `valid` / `foul` / `suspect` / `hz` 六个键**就是**页面上
 * 那六个 `StatPanel` 的 `id`,页面对着自己的 `[data-stat]` 按名字去查 ——
 * **不要按下标对齐**,那一行的顺序哪天一动就会静默错位。
 *
 * ## 不在这一份里的东西
 *
 * - 源文件里的代码注释(中英混着的那些)是给开发者看的,不是用户文案。
 * - **本页没有 `throw new Error(...)` 文案,也没有 `console.*`**,所以没有要跳过的
 *   开发者字符串。
 * - `BEST_KEY`(`'mouse-test:reaction-best-ms'`)是 `localStorage` 的键名,
 *   不进文案。
 * - `OFFSET_TABLE` 的 `hz`(`60Hz`…)与 `frame`(`16.7ms`…)是**数值**,两种语言里
 *   逐字相同,只有 `total`(`约 25 – 35ms`)要译。
 * - 逐次记录那行里 `#${i + 1}` 的 `#N` 编号没有任何中文,但它是**看得见的格式**,
 *   所以留成 `runtime.logIndex`(同 `scroll.ts` 的 `deltaRawMeta`,是格式不是散文)。
 */

/** FAQ 一行。**文案两边键必须一样**,见文件头 */
export interface ReactionFaqItem {
  q: string;
  a: string;
}

/**
 * 那张「延迟有多长」的表的一行。
 *
 * `hz` 与 `frame` 是**数值/单位**,两种语言里逐字相同 —— 留在这里是为了让目录
 * 自洽(这一页每一条可见文字都能在本文件里找到)。只有 `total` 要译:
 * 它那句里带着「约」这个字。
 */
export interface ReactionOffsetRow {
  hz: string;
  frame: string;
  total: string;
}

export const reactionZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'reaction-test',
  /** 页面自己的 `<title>` / meta description。**和 `tools.ts` 里那份逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '鼠标反应速度测试 - 在线测量点击反应时间',
  metaDescription:
    '在线测量点击反应时间:屏幕变色后立刻按下左键,取多轮有效成绩的中位数。测得的数值包含屏幕刷新、显示器响应与鼠标回报带来的延迟,所以只适合同一台机器上前后对比,不能与其他设备或任何排名比较。',

  h1: '鼠标反应速度测试',
  /** 第一段:怎么玩 */
  lede:
    '下面的框会等一段**随机**的时间,然后整块亮起来。看到变亮就**立刻按下左键**,' +
    '一轮 {trials} 次,给中位数。',
  /**
   * 第二段:**这一页的中心主张**。译文里那两句话(测的是整套设备 / 一定比真实
   * 反应时间大 / 只适合同一台机器前后比)一个字都不能软,见文件头。
   */
  honesty:
    '先把话说清楚:读到的毫秒数里,含着屏幕刷新、显示器响应和鼠标回报的延迟,' +
    '所以它衡量的是**这一整套设备**,不是你的神经。这个数一定**比你的真实反应时间大**,' +
    '大多少测不出来。它只适合在**同一台机器上前后对比** —— ' +
    '换台电脑、甚至只换台显示器,这个数就会整体平移十几二十毫秒。下面有完整的拆解。',

  /** 六格读数。**键就是那六个 `StatPanel` 的 `id`**,见文件头。`unit` 只有三格有 */
  stats: {
    median: { label: '中位反应', unit: 'ms', hint: '有效 {minValid} 次以上才出数' },
    fastest: { label: '最快一次', unit: 'ms', hint: '观察到的最小值,不是你的极限' },
    valid: { label: '有效次数' },
    foul: { label: '抢跑', hint: '颜色没出就按,这一次作废' },
    suspect: { label: '可疑', hint: '快于 {implausibleMs}ms,不计入中位数' },
    hz: { label: '屏幕刷新', unit: 'Hz', hint: '实测,只作参照' },
  },

  logHeading: '逐次记录',
  /** 逐次表上面那句说明。**开头的 `**…**` 在句首**,见文件头 */
  logLede:
    '每一行是这一轮里的一次尝试。等不到中位数的时候,**这张表里的原始读数才是唯一能看的**' +
    ' —— 它也是"中位数确实是从这些数里算出来的"的证据。',

  /** 「这个数里装了什么」那一节 */
  chainHeading: '这个数里装了什么',
  /** 四段延迟 + 「不减掉估算值」那句 —— 见文件头,别软化 */
  chainBody:
    '屏幕上出现颜色,到你被记到"按下了",中间串着四段延迟。它们**全都加在结果上**,' +
    '而且这一段**测不出来** —— 浏览器看不到屏幕,也看不到 USB 线。所以这一页只报原始读数,' +
    '**不替你减掉一个估算的修正量**:那只会得到一个看起来精确的假数字。',

  /** 那张表的三列。`hz` / `frame` 两列是数值,`total` 才是要译的 */
  offsetColumns: { hz: '刷新率', frame: '一整帧', total: '合计(含扫描、面板响应、鼠标采样)' },
  /**
   * 表里那四行。**`total` 那一列是推算出来的界,不是量出来的修正量** ——
   * 页面只用它说明"为什么这个数一定偏大",**绝不拿它去减任何结果**。
   * `hz` 与 `frame` 两边逐字相同。
   */
  offsetRows: [
    { hz: '60Hz', frame: '16.7ms', total: '约 25 – 35ms' },
    { hz: '120Hz', frame: '8.3ms', total: '约 15 – 25ms' },
    { hz: '144Hz', frame: '6.9ms', total: '约 12 – 18ms' },
    { hz: '240Hz', frame: '4.2ms', total: '约 8 – 14ms' },
  ] as ReactionOffsetRow[],

  /** 表下面第一段:整整一帧那一项是构造上必然的 */
  frameBody:
    '最大的一项不是玄学,是**构造上必然的**:颜色是在某一帧里刷上去的,而那一帧要等到' +
    '下一次屏幕刷新才真正呈现。所以光这一项就固定多出**整整一帧** —— ' +
    '60Hz 上 16.7 毫秒,而 1000Hz 的鼠标回报率只占 1 毫秒。**屏幕比鼠标影响大得多。**',

  /** 表下面第二段:为什么这一页**不做**跨域隔离 */
  isolationBody:
    '这也是这一页**不理会**计时精度的原因。回报率页需要跨域隔离,是因为它算的是' +
    '**相邻两个事件之差**,8000Hz 下只有 125 微秒,而没隔离的时间戳精度是 100 微秒 —— ' +
    '误差占掉 80%。这里只有**一个**事件,尺度是几十万微秒,100 微秒占万分之几,' +
    '而鼠标 USB 采样比它大 10 – 80 倍。**隔离一次也消不掉这里的误差**,' +
    '却要让每个访客白等一次页面重载 —— 所以这一页不隔离。',

  /** 「什么会让这个数变得不可比」那一节。**每条开头的 `**…**` 是卡片标题**,见文件头 */
  varyHeading: '什么会让这个数变得不可比',
  varyPoints: [
    '**换显示器或换刷新率。**一整帧那一项直接跟着变 —— 同一台电脑从 60Hz 换到 ' +
      '144Hz,光这一项就少 8 毫秒。',
    '**换鼠标或改回报率。**按键状态是搭在上报里送出去的,125Hz 是每 8 毫秒才采样一次,' +
      '1000Hz 是每毫秒 —— 这一项最多能差出几毫秒。',
    '**页面被切走或被别的窗口挡住。**后台标签页不绘制,颜色根本没刷上去。' +
      '这一页检测到页面被切走会直接把这一轮作废、记一笔,而不是记一个几百毫秒的假成绩。',
    '**用触控板或触摸屏。**那不是"按下左键",采样链路也完全不同。' +
      '这一页在检测到指针不精确时会给出提示。',
  ] as string[],

  faqHeading: '常见问题',
  /**
   * 七条。**四类作废各有各的说法** —— 抢跑 / 可疑 / 超时是三条独立的问题,
   * 「作废」在逐次表里还分「页面被切走」与「时间戳无效」两种,别在译文里合并。
   */
  faq: [
    {
      q: '为什么测出来的反应时间比我想的慢?',
      a:
        '因为这个数里**装的不只是你的反应**。从屏幕刷出颜色到你被记到按下,中间串了四段延迟:屏幕要等到下一次刷新才把画面呈现出来、显示器面板本身要几毫秒才变色、' +
        '鼠标按键状态要等到下一次回报才被采样、系统和浏览器还要把它送过来。这几段**全都加在结果上**,加起来通常比你的神经反应时间还长。' +
        '所以这一页测的是**这台电脑的反应速度**,不是你的反应速度。想知道自己有没有变快,只能用同一台机器前后比。',
    },
    {
      q: '为什么只跟"同一台机器"比?',
      a:
        '因为那段设备延迟是**跟着机器走的固定值**。60Hz 的屏光"等一整帧"这一项就比 144Hz 多出约 8 毫秒,再加上面板响应和鼠标回报率,两台机器之间差出十几二十毫秒很正常 ——' +
        '这个差距比大多数人练一年的进步还大。所以拿成绩去跟别人比、或者跟网上"人类平均反应 250ms"的说法比,比的其实是显示器。' +
        '同一个人在**同一台机器上**的成绩是很稳的 —— 这一页正是因此才敢用中位数。',
    },
    {
      q: '为什么报中位数,不报平均值?',
      a:
        '因为平均值扛不住一次走神。一轮里有一次发呆 600 毫秒,平均值就被推高几十毫秒,而中位数几乎不动 —— 它只关心"排中间的那次是多少"。' +
        '所以要连着看三个数:**中位反应**是结论,**有效次数**说明这一轮够不够,而**最快一次**是观察到的最小值、**不是你的极限**,再多测几次大概率还能更低。',
    },
    {
      q: '"抢跑"是什么意思?',
      a:
        '颜色还没出来你就按了 —— 那不是反应时间,这一次不算,单独计数然后重来。' +
        '等待时间**每轮重新随机**({waitMin} – {waitMax} 秒),所以盯着节奏数秒数是没用的。' +
        '这一条不是惩罚,是**必须**:不判抢跑的话,提前按住的手会正好落在颜色之后,记下一个又快又假的值。',
    },
    {
      q: '"可疑"又是什么?',
      a:
        '颜色出来之后不到 {implausibleMs} 毫秒就按下了。简单视觉反应的生理下限在 120 – 150 毫秒左右,比这更快的"反应"不可能是看到了才按 ——' +
        '那是提前准备好了、正好落在颜色之后的那么一下。它**排除在中位数之外,但照样单独计数**,不会被悄悄丢掉。',
    },
    {
      q: '按住不放行不行?',
      a:
        '**左键**按一下就好。判定看的是"按下"这个瞬间,而按住不放跨过颜色变化时,浏览器**根本不会**再发一次按下事件(按下事件只在"从没按到按下"的那一刻发一次),' +
        '所以不设超时这一轮会一直挂着。超过 {timeoutMs} 毫秒没等到按下就算超时作废。右键和中键都不算,测试期间右键菜单和中键自动滚动也会被挡掉,不会打断你。',
    },
    {
      q: '为什么一轮要 {trials} 次?',
      a:
        '单次测量说明不了什么 —— 状态、有没有分神,都会让一次的结果差出几十毫秒。所以一轮跑 {trials} 次,取中位数。' +
        '有效次数不足 {minValid} 次时(比如作废了两次),中位数**不给数、显示破折号** —— 两次的"中位数"其实就是平均值,那比不给还糟。',
    },
  ] as ReactionFaqItem[],

  // -------------------------------------------------------------------------
  // 以下都是 `<script>` 里拼出来的句子(以及首屏那句提示)。整句一个键,
  // 占位符由 `fill()` 填。
  // -------------------------------------------------------------------------

  /** `<script>` 里那几个字面量。**它们不是正文,但都是用户看得见的字** */
  runtime: {
    /** 四类作废的读数位写的那个破折号(不是 0) */
    dash: '—',
    /** 那个按钮的三档:开局 / 一轮跑完之后 / 已经在跑 */
    start: '开始',
    reset: '重置',
    again: '再测一轮',

    /** 测试区那两行字的空态。**`metaIdle` 是"一处键,两处出口"**,见文件头 */
    callIdle: '点「开始」',
    metaIdle: '一轮 {trials} 次 · 变亮后按左键',

    /** 判定横幅下面那句的本机纪录(有纪录时)。`{best}` 是已格式化的毫秒 */
    hintBest: '本机最好 {best} ms',
    /** 实测刷新率那一格的说明(结算时报)。`{ms}` 是一整帧的毫秒 */
    hintHzFrame: '实测 · 一整帧约 {ms}ms',

    /** 等着颜色出来的那一段 */
    callWait: '等颜色出现',
    metaWait: '现在别按 —— 提前按算抢跑',
    /** 超时。**作废第一类**,和"抢跑"「可疑」各说各的 */
    callTimeout: '没按',
    metaTimeout: '超过 {timeoutMs} 毫秒没等到按下,这一次作废',
    /** 抢跑。**是显示状态,不是机器状态** */
    callFoul: '抢跑',
    metaFoul: '颜色还没出现 —— 这一次不算,重新等',
    /** 页面被切走。**作废第三类**,颜色根本没画出来 */
    callHidden: '页面被切走',
    metaHidden: '这一次作废 —— 颜色根本没画出来,记下来的会是假数',

    /** 一轮跑完但有效次数不够 */
    callTooFew: '有效次数不够',
    metaTooFew: '要 {minValid} 次才算得出中位数,这一轮只有 {valid} 次 —— 再跑一轮',
    /** 一轮跑完、给出了结论 */
    callMedian: '中位 {ms} ms',
    /** `{record}` 取下面两个键之一 */
    metaMedian: '有效 {valid} 次 · 最快 {fastest} ms · {record}',
    recordNew: '本机新纪录',
    recordNone: '没破本机纪录',

    /** 按下去之后那一瞬间的读数。`{n}` 是第几次 */
    callMeasured: '{ms} ms',
    metaMeasured: '第 {n} 次',
    /** `ms < RT_IMPLAUSIBLE_MS` 时,`metaMeasured` 换成这一句 */
    metaSuspect: '快得不像反应,已排除出中位数',

    /** 逐次记录的空态 */
    logEmpty: '还没有记录。点「开始」,一轮跑 {trials} 次。',
    /** 每条记录开头那个编号(`#{i + 1}`)。没有中文,但是看得见的格式 */
    logIndex: '#{n}',

    /** 逐次记录里那一行的注 —— **作废那三类各一条,不许合并** */
    logFoul: '抢跑:颜色还没出就按了',
    logTimeout: '超时:{timeoutMs}ms 没等到按下',
    logVoidHidden: '作废:页面被切走,颜色根本没画出来',
    logVoidStamp: '作废:时间戳无效',
    logSuspect: '可疑:快于 {implausibleMs}ms,不计入中位数',
    logValid: '有效',
  },
};

export const reactionEn: typeof reactionZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'reaction-test',
  metaTitle: 'Mouse reaction time test — measure your click reaction time online',
  metaDescription:
    'Measure your click reaction time online: press the left button the moment the screen changes colour, and take the median of the valid trials across several rounds. The figure includes the latency of the screen refresh, the panel response and the mouse polling, so it is only good for comparing one machine against itself — not against other devices or any leaderboard.',

  h1: 'Mouse reaction time test',
  lede:
    'The box below waits a **random** amount of time, then lights up as a whole. The moment it ' +
    'lights up, **press the left button straight away** — {trials} trials to a round, and you get ' +
    'the median.',
  honesty:
    'Let us be clear up front: the millisecond figure you read carries the latency of the screen ' +
    'refresh, the panel response and the mouse polling, so what it measures is **this whole ' +
    'set-up**, not your nerves. That number is always **larger than your real reaction time**, ' +
    'and by how much cannot be measured. It is only good for **comparing one machine against ' +
    'itself** — change the computer, or even just the monitor, and the figure shifts bodily by ' +
    'ten-odd to twenty-odd milliseconds. The full breakdown is below.',

  stats: {
    median: { label: 'Median reaction', unit: 'ms', hint: 'needs {minValid} valid trials or more' },
    fastest: { label: 'Fastest', unit: 'ms', hint: 'the smallest value seen, not your limit' },
    valid: { label: 'Valid trials' },
    foul: { label: 'False start', hint: 'pressed before the colour; the trial is void' },
    suspect: { label: 'Implausible', hint: 'faster than {implausibleMs}ms, kept out of the median' },
    hz: { label: 'Screen refresh', unit: 'Hz', hint: 'measured; for reference only' },
  },

  logHeading: 'Trial log',
  logLede:
    'Each row is one attempt in this round. When there is no median, **the raw readings in this ' +
    'table are the only thing worth looking at** — they are also the evidence that the median ' +
    'really was worked out from them.',

  chainHeading: 'What is inside the number',
  chainBody:
    'Four stretches of delay sit between the colour appearing on screen and your press being ' +
    'recorded. They are **all added on top of the result**, and that stretch **cannot be ' +
    'measured** — the browser can see neither your screen nor your USB cable. So this page ' +
    'reports the raw reading only and **does not take off an estimated correction for you**: ' +
    'that would only produce a fake number that looks precise.',

  offsetColumns: { hz: 'Refresh rate', frame: 'One frame', total: 'Total (incl. scan-out, panel response, mouse sampling)' },
  offsetRows: [
    { hz: '60Hz', frame: '16.7ms', total: 'about 25 – 35ms' },
    { hz: '120Hz', frame: '8.3ms', total: 'about 15 – 25ms' },
    { hz: '144Hz', frame: '6.9ms', total: 'about 12 – 18ms' },
    { hz: '240Hz', frame: '4.2ms', total: 'about 8 – 14ms' },
  ],

  frameBody:
    'The largest item is not mysticism, it is **unavoidable by construction**: the colour is ' +
    'painted inside some frame, and that frame only actually appears at the next screen refresh. ' +
    'So this one item alone adds a fixed **whole frame** — 16.7 milliseconds at 60Hz, while a ' +
    '1000Hz mouse polling rate accounts for just 1 millisecond. **The screen matters far more ' +
    'than the mouse.**',

  isolationBody:
    'This is also why this page **ignores** timing precision. The polling-rate page needs ' +
    'cross-origin isolation because it measures **the difference between two adjacent events**, ' +
    'which at 8000Hz is only 125 microseconds, while an un-isolated timestamp is quantised to ' +
    '100 microseconds — an 80% error. Here there is only **one** event, on a scale of hundreds ' +
    'of thousands of microseconds, so 100 microseconds is a few parts in ten thousand, and the ' +
    'mouse’s USB sampling is 10 – 80 times larger than that. **Isolating once would not take any ' +
    'of that error away**, yet it would make every visitor sit through a page reload — so this ' +
    'page does not isolate.',

  varyHeading: 'What makes this number incomparable',
  varyPoints: [
    '**Changing the monitor or the refresh rate.** The one-frame item moves with it outright — ' +
      'take the same computer from 60Hz to 144Hz and that item alone drops by 8 milliseconds.',
    '**Changing the mouse or its polling rate.** The button state is sent along with the ' +
      'polling, so 125Hz samples it only once every 8 milliseconds while 1000Hz samples it every ' +
      'millisecond — this item can differ by several milliseconds.',
    '**The page being switched away from or covered by another window.** A background tab does ' +
      'not paint, so the colour never appears at all. When this page notices it has been switched ' +
      'away from, it voids the round outright and records that fact, rather than recording a fake ' +
      'reading hundreds of milliseconds long.',
    '**Using a trackpad or a touchscreen.** That is not “pressing the left button”, and the ' +
      'sampling chain is entirely different. This page says so when it detects an imprecise pointer.',
  ],

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'Why is the reaction time it measures slower than I expected?',
      a:
        'Because what this number **holds is not just your reaction**. Four stretches of delay sit ' +
        'between the screen showing the colour and your press being recorded: the screen has to ' +
        'wait for its next refresh before the picture is presented at all, the panel itself takes ' +
        'a few milliseconds to change colour, the mouse’s button state is only sampled at the next ' +
        'poll, and the system and browser still have to deliver it. These stretches are **all ' +
        'added on top of the result**, and together they usually come to more than your neural ' +
        'reaction time. So what this page measures is **how fast this computer is**, not how fast ' +
        'you are. To find out whether you have got faster, you can only compare the same machine ' +
        'before and after.',
    },
    {
      q: 'Why compare only against “the same machine”?',
      a:
        'Because that device delay is a **fixed value that travels with the machine**. On a 60Hz ' +
        'screen the “wait out a whole frame” item alone is about 8 milliseconds more than at ' +
        '144Hz, and adding the panel response and the mouse’s polling rate, a difference of ' +
        'ten-odd to twenty-odd milliseconds between two machines is entirely normal — a gap ' +
        'bigger than most people gain from a year of practice. So comparing your score with ' +
        'someone else’s, or with the “the average human reaction is 250ms” figure online, is ' +
        'really comparing displays. The same person on **the same machine** scores very ' +
        'consistently — which is exactly why this page dares to use the median.',
    },
    {
      q: 'Why report the median rather than the average?',
      a:
        'Because the average cannot take one lapse of attention. A single 600-millisecond daydream ' +
        'inside a round pushes the average up by tens of milliseconds, while the median barely ' +
        'moves — it only cares what “the one in the middle” was. So read three numbers together: ' +
        '**Median reaction** is the verdict, **Valid trials** says whether the round was enough, ' +
        'and **Fastest** is the smallest value observed — **not your limit**; a few more rounds ' +
        'will very likely go lower.',
    },
    {
      q: 'What does “false start” mean?',
      a:
        'You pressed before the colour appeared — that is not a reaction time, so the trial does ' +
        'not count: it is counted on its own and you start again. The wait is **re-randomised ' +
        'every round** ({waitMin} – {waitMax} seconds), so counting seconds and watching for the ' +
        'rhythm is no use. This is not a punishment, it is **necessary**: without a false-start ' +
        'rule, a hand held down in advance would land just after the colour and be recorded as a ' +
        'fast and fake value.',
    },
    {
      q: 'And what is “implausible”?',
      a:
        'The press came less than {implausibleMs} milliseconds after the colour appeared. The ' +
        'physiological floor for a simple visual reaction is around 120 – 150 milliseconds, and a ' +
        '“reaction” faster than that cannot have been a response to seeing it — it was prepared ' +
        'in advance and happened to land just after the colour. It is **kept out of the median but ' +
        'still counted on its own**, not quietly thrown away.',
    },
    {
      q: 'Can I just hold the button down?',
      a:
        '**The left button** needs one press, no more. The judgement looks at the instant of the ' +
        'press, and if you hold the button down across the colour change the browser **will not** ' +
        'send another press event at all (a press event fires only at the moment it goes from ' +
        'not-pressed to pressed), so with no timeout the round would hang there forever. Not ' +
        'having received a press within {timeoutMs} milliseconds counts as a timeout and the ' +
        'trial is void. The right and middle buttons do not count, and while the test is running ' +
        'the right-click menu and middle-button autoscroll are blocked too, so neither will ' +
        'interrupt you.',
    },
    {
      q: 'Why {trials} trials to a round?',
      a:
        'A single measurement on its own says nothing — your state and whether you were ' +
        'distracted can swing one result by tens of milliseconds. So a round runs {trials} trials ' +
        'and takes the median. With fewer than {minValid} valid trials (if two were voided, say), ' +
        'the median **gives no number and shows a dash** — the “median” of two is really just the ' +
        'average, which is worse than giving nothing.',
    },
  ],

  runtime: {
    dash: '—',
    start: 'Start',
    reset: 'Reset',
    again: 'Run another round',

    callIdle: 'Click “Start”',
    metaIdle: '{trials} trials a round · press the left button when it lights up',

    hintBest: 'best on this machine {best} ms',
    hintHzFrame: 'measured · one frame is about {ms}ms',

    callWait: 'Wait for the colour',
    metaWait: 'Do not press yet — pressing early is a false start',
    callTimeout: 'No press',
    metaTimeout: 'No press within {timeoutMs} milliseconds, so this trial is void',
    callFoul: 'False start',
    metaFoul: 'The colour has not appeared yet — this one does not count, waiting again',
    callHidden: 'Page switched away',
    metaHidden: 'This trial is void — the colour was never painted, so what got recorded would be a fake number',

    callTooFew: 'Not enough valid trials',
    metaTooFew: 'It takes {minValid} to work out a median and this round had only {valid} — run another round',
    callMedian: 'Median {ms} ms',
    metaMedian: '{valid} valid · fastest {fastest} ms · {record}',
    recordNew: 'a new record on this machine',
    recordNone: 'no new record on this machine',

    callMeasured: '{ms} ms',
    metaMeasured: 'trial {n}',
    metaSuspect: 'too fast to be a reaction, kept out of the median',

    logEmpty: 'No trials yet. Click “Start” — a round runs {trials} trials.',
    logIndex: '#{n}',

    logFoul: 'false start: pressed before the colour appeared',
    logTimeout: 'timeout: no press within {timeoutMs}ms',
    logVoidHidden: 'void: the page was switched away, the colour was never painted',
    logVoidStamp: 'void: invalid timestamp',
    logSuspect: 'implausible: faster than {implausibleMs}ms, kept out of the median',
    logValid: 'valid',
  },
};
