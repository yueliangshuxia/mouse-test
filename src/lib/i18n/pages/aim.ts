/**
 * 瞄准测试页(`/aim-test/`)的文案。
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
 * `aimEn` 声明成 `typeof aimZh` —— 英文版漏一个键、拼错一个键、多出一个键,
 * 都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 带 `**强调**` / `` `行内代码` `` 的段落
 *
 * 模板里原来是 `<strong>…</strong>` 与 `<code>…</code>`,搬进目录时按仓库的约定
 * 改写成 `**…**` 与 `` `…` ``,所以句子是完整的、没有为了加粗被切成碎片。
 * 渲染走 `faq.ts` 的 `faqHtml()`(和 FAQ 答案同一套)—— **接线时一律用 `set:html`**:
 * 用 `{t.…}` 插值的话花括号是**转义输出**,屏幕上会原样印出星号和反引号。
 *
 * **有几处开头的 `**…**` 不只是加粗。** `readoutsPoints` 与 `influencesPoints`
 * 住在 `<section class="prose prose--cards">` 里,而 `.prose--cards li > strong:first-child`
 * 会把**每条开头**那个 `<strong>` 显示成卡片标题 —— 所以那处 `**` 必须留在
 * 开头那一句上,不能挪到句子中间(`influencesPoints` 头几条那个句号也在加粗里面,
 * 源文件本来如此)。`lockNote` 那条**不在**这个 section 里,所以它开头那处
 * `**` 只是普通强调,不是卡片标题。
 *
 * ## 设置那两张表:数值是常量,不是文案
 *
 * `durations` / `params` 是页面 `DURATIONS` / `PARAMS` 两张表的文案。
 * `params` 每个 `value` 里的 `{multi}` / `{single}` / `{easy}` / `{standard}` /
 * `{hard}` **就是 `analysis.ts` 的 `TARGET_COUNT` / `TARGET_DIAMETER_PX`**,
 * 由页面 `fill()` 填进去 —— **不抄进目录**(理由同 `scroll.ts` 的 `deltaModes`:
 * 常量抄两份,改一处就静默漂,而页面上看不出来)。
 *
 * `durations` 那几个标签是**脚本从按钮文本里读回去**拼提示语用的,所以目录这
 * 一份就是唯一来源,脚本里没有第二份字符串(同 CPS 页的 `renderDurations`)。
 *
 * ## `<script>` 里的句子也住在这里
 *
 * 「开始练习 / 停止 / 再练一次」、测试面那两行空态、结算时那句
 * 「时间到 / 已停止 · N 次命中 · 本机新纪录」、以及页面被切走那句 —— 都在
 * `<script>` 里拼,而 frontmatter 变量在 `<script>` 里不存在,所以文案只能从
 * 这里各取一遍(组件里 `getCatalog(currentLocale()).pages.aim`)。
 *
 * ## 运行期填的占位符
 *
 * | 占位符 | 填什么 |
 * | --- | --- |
 * | `{multi}` / `{single}` | `TARGET_COUNT` 的两个数(同时在场的目标数) |
 * | `{easy}` / `{standard}` / `{hard}` | `TARGET_DIAMETER_PX` 的三个直径(CSS px) |
 * | `{px}` | 当前难度的目标直径(`accuracyDiameterHint`) |
 * | `{best}` | `loadBest()` 读回来的本机最好成绩(命中次数) |
 * | `{hits}` | 这一轮的命中数 |
 * | `{head}` | `metaNoClicks` / `metaHits` 那一句 |
 *
 * 每句都**整句住在一个键里**,由页面 `fill()` 填 —— 不在句子中间断开,理由同别页。
 *
 * ## 一处静态键 + 两句运行期键(不是一处键两处出口)
 *
 * `stats.hits.hint` 首屏写在 `StatPanel` 上,脚本一跑就被 `setHint('hits', …)`
 * 换成 `hitsNoBest` 或 `hitsBest`;`stats.accuracy.hint` 同理,被换成
 * `accuracyDiameterHint`。**把它们并成一个键是错的**(迟早漂),所以静态那一句
 * 与运行期那两句各有各的键,都在这里。
 *
 * ## 不在这一份里的东西
 *
 * - 源文件里的代码注释(中英混着的那些)是给开发者看的,不是用户文案。
 * - **本页没有 `throw new Error(...)` 文案,也没有 `console.*`**,所以没有要跳过的
 *   开发者字符串。
 * - `aimBestKey()`(`mouse-test:aim-best:…`)是 `localStorage` 的键名,不进文案。
 * - 靶子那个 class(`aim-target`)与所有 `data-*` 挂钩是结构,不是文案;
 *   `renderChoices()` 读的是按钮 `textContent`,选中态那个 `aria-pressed` 的
 *   投影值(`'true'` / `'false'`)同理。
 */

/** FAQ 一行。**文案两边键必须一样**,见文件头 */
export interface AimFaqItem {
  q: string;
  a: string;
}

/** 时长档。`ms` 是按钮上的 `data-value`,也是页面 `DURATIONS` 的键 */
export interface AimDurationOption {
  ms: number;
  label: string;
}

/**
 * 「参数」那张表的一行。
 *
 * `value` 里带 `{}` 占位符 —— 那几个数是 `analysis.ts` 的常量,由页面填,
 * 见文件头。**不要把它当成已经填好的字符串。**
 */
export interface AimParamRow {
  key: string;
  value: string;
}

export const aimZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'aim-test',
  /** 页面自己的 `<title>` / meta description。**和 `tools.ts` 里那份逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '鼠标瞄准测试 - 在线统计命中数、命中率与平均偏离',
  metaDescription:
    '在线瞄准测试:在 10 / 30 / 60 秒里点击随机出现的目标,统计每秒命中、命中数、命中率与平均偏离(仅计命中)。成绩只保存在本机,只与自己的历史成绩对比。',

  h1: '鼠标瞄准测试',
  /** 第一段:怎么玩 */
  lede:
    '选好目标和时长,点**「开始练习」**,然后在下面的框里尽量多、尽量准地点中靶子。' +
    '点中一个,它就换个位置。成绩只保存在你自己的浏览器里。',
  /** 第二段:三个读数里,哪几个能比、哪几个不能比 */
  ledeCaveat:
    '三个读数里只有**每秒命中**能拿来衡量手速 —— 命中率可以靠放慢刷高。' +
    '而**平均偏离**会受 DPI 和灵敏度影响,**只能跟自己在同一台机器上比**;' +
    '换了目标直径或时长,成绩之间也不可比。',

  /** 三组控件的 `role="group"` 上的 `aria-label`。键就是脚本里的 `data-group` */
  groupAria: { mode: '目标数量', difficulty: '目标大小', duration: '练习时长' },
  /** 三组控件前面那行小字(`.test-hint`) */
  groupLabel: { mode: '目标', difficulty: '难度', duration: '时长' },
  /** 模式那两个按钮 */
  modeOptions: { multi: '多目标', single: '单目标' },
  /** 难度那三个按钮 */
  difficultyOptions: { easy: '简单', standard: '标准', hard: '困难' },
  /** 时长那三个按钮。标签会被脚本读回去拼提示语,见文件头 */
  durations: [
    { ms: 10000, label: '10 秒' },
    { ms: 30000, label: '30 秒' },
    { ms: 60000, label: '60 秒' },
  ] as AimDurationOption[],
  /** 那个按钮的三档 */
  start: '开始练习',
  stop: '停止',
  again: '再练一次',

  /** 测试面那两行字的空态(首屏模板里的样子) */
  callIdle: '点「开始练习」',
  metaIdle: '只有落在测试区里的点击算一枪',

  /** 五格读数。**键就是那五个 `StatPanel` 的 `id`**,见文件头 */
  stats: {
    'per-sec': { label: '每秒命中', hint: '命中数 ÷ 测试时长' },
    hits: { label: '命中数', hint: '跑完一轮才有最好成绩' },
    accuracy: { label: '命中率', unit: '%', hint: '命中数 ÷ 点击数' },
    offset: { label: '平均偏离', unit: 'px', hint: '只统计命中的那些枪' },
    left: { label: '剩余', unit: '秒' },
  },
  /** 算不出那个数时显示的破折号(**不是 0**) */
  dash: '—',
  /** `accuracy` 那格运行时换上的说明。`{px}` 是当前难度的目标直径 */
  accuracyDiameterHint: '目标直径 {px}px',
  /** `hits` 那格运行时换上的说明,两档 */
  hitsNoBest: '这一档还没有成绩',
  hitsBest: '本机最好 {best} 次',

  /** 结算时测试面上那两行字。`{head}` 取下面 `metaNoClicks` / `metaHits` 之一 */
  callDone: '时间到',
  callStopped: '已停止',
  callCancelled: '已取消',
  /** 一次都没点的时候,那句话的头;点了就往 `metaHits` 走 */
  metaNoClicks: '一次都没点',
  metaHits: '{hits} 次命中',
  /** 刷新了本机纪录时,整句换成这一句 */
  metaRecord: '{head} · 本机新纪录',
  /** 页面被切走:这一轮整轮作废,不给成绩 */
  metaCancelled: '页面被切走 —— 这一轮作废,没有成绩',

  readoutsHeading: '三个读数分别是什么',
  /**
   * 三条。**整段一个键**、一律走 `faqHtml` —— 每条开头的 `**…**` 会被
   * `.prose--cards li > strong:first-child` 排成卡片标题,句中那几处
   * `<strong>` 也一并变成 `**`(同 `scroll.ts` 的 `resultsPoints`)。
   */
  readoutsPoints: [
    '**每秒命中** = 命中数 ÷ 测试时长。时长是**计时器给的** —— 你选了 30 秒,' +
      '分母就是 30 秒,不是从点击的时间戳里推出来的。打完最后一下停手的话,' +
      '那一段空闲在时间戳里根本不存在,推出来的分母会让"疯狂点了两秒"平均成一个虚高的数。',
    '**命中率** = 命中数 ÷ 点击数。只有落在测试区里的点击算一枪,框外面的点击不算。',
    '**平均偏离** = 每一枪的落点到靶心的距离,单位是 CSS 像素,**只统计命中的那些枪**。' +
      '刻意**不换算成厘米或角度**:那需要知道屏幕的物理尺寸,正是 DPI 那一整页的难题。',
  ] as string[],

  paramsHeading: '参数',
  paramsLede:
    '下面这些是这一页的全部设置。换任何一项,成绩就不再和上一档可比 —— ' +
    '所以最好成绩是**按档分开存的**。',
  /** 「参数」那张表的列头 */
  paramsColumns: { setting: '设置', value: '取值' },
  /** 表里三行。`value` 里的占位符是 `analysis.ts` 的常量,见文件头 */
  params: [
    { key: '模式', value: '多目标(同时 {multi} 个)/ 单目标({single} 个)' },
    { key: '难度', value: '简单 {easy}px / 标准 {standard}px / 困难 {hard}px' },
    { key: '时长', value: '10 / 30 / 60 秒' },
  ] as AimParamRow[],

  influencesHeading: '什么会影响成绩',
  /** 五条,**每条开头的 `**…**` 是卡片标题**,见文件头 */
  influencesPoints: [
    '**目标直径。**命中率不受 DPI 影响,但受目标的**角尺寸**影响 —— ' +
      '屏幕上同样是 40 像素,坐得远一倍,看到的靶子就小一半。所以页面上一直印着当前的直径。',
    '**DPI 与鼠标灵敏度。**命中率不受影响(两个计数之比),平均偏离受影响。',
    '**系统光标。**这一页用的是系统准星。自绘的会晚一帧,而你是拿它来瞄的 —— ' +
      '那一帧会实打实地变成成绩下降,和你的瞄准能力没关系。',
    '**触控板与触摸屏。**一次轻点不是一次瞄准。指针不精确时页面顶部会给出提示。',
    '**页面被切走。**后台标签页不绘制,靶子根本看不见。所以这一页检测到切换就把这一轮' +
      '**整轮作废、不给成绩** —— 计时器跟着 rAF 一起停了,量的窗口和你能操作的时间对不上,' +
      '与其给一个错的分母,不如不给。',
  ] as string[],
  /**
   * 「不做指针锁定」那段。**不在 `.prose--cards` 里**,所以开头那处 `**` 只是强调。
   * `pointer lock` 在源文件里是 `<code>`,这里保成**行内代码**(`faqHtml` 认反引号)。
   */
  lockNote:
    '另外这一页**没有做指针锁定**(`pointer lock`)。它会把操作系统的指针加速引进测量 —— ' +
    '本站专门有一页加速度测试,正是因为那是个真实的混淆项;而且真的锁上之后要按 Esc 才出得来。' +
    '所以这一轮先不做。',

  faqHeading: '常见问题',
  faq: [
    {
      q: '为什么主读数是「每秒命中」,不是命中率?',
      a:
        '因为**命中率可以靠放慢来刷**:小心翼翼、每一枪都停稳了再点,能打到接近 100%;打得快就只有七八十。' +
        '一个放慢就能刷高的数,不适合当主指标。而"每秒命中 = 命中数 ÷ 实测时长",放慢反而会把它压低 ——' +
        '它和 CPS 页的"平均 CPS"是同一个形状:两个计数之比,谁也刷不了。',
    },
    {
      q: '平均偏离为什么只统计命中?',
      a:
        '因为一个离靶心 300 像素的脱靶会把平均值整个带走。那个数既答不了"命中得紧不紧",也答不了"脱得有多远" ——' +
        '两件事分给两个数各答一句:**命中率**管"打没打中",**平均偏离**管"打中了有多准"。' +
        '所以偏离只对命中的那些枪求平均,单位是 CSS 像素。',
    },
    {
      q: '换鼠标 DPI 或调灵敏度,会影响成绩吗?',
      a:
        '**命中率不受影响** —— 它只是"点中了几次 ÷ 点了几次",两个都是计数。**平均偏离会受影响**:DPI 变了,同一个手部动作在屏幕上走过的距离就变了,' +
        '落点离靶心的像素数当然跟着变。所以拿偏离跟别人比、或者跨着 DPI 比自己的成绩,都是在比设置。' +
        '这也正是**不做加权总分**的原因:一个把命中率和偏离揉在一起的权重公式,本身就是编出来的数。',
    },
    {
      q: '为什么成绩只跟同一台机器上的自己比?',
      a:
        '因为命中率虽然不受 DPI 影响,却受**目标的角尺寸**影响 —— 屏幕上同样是 40 像素,坐在离显示器 40 厘米和 80 厘米的地方,眼睛看到的靶子大小差一倍。' +
        '加上屏幕尺寸、刷新率、鼠标重量,别人在别的机器上的成绩和你之间隔着好几个变量。这一页因此只在本机存一个最好成绩,' +
        '分档也分得很细:**模式和难度或时长换任何一个,就是另一个键**,成绩不再放在一起比。',
    },
    {
      q: '为什么光标是系统那个,而不是自己画的准星?',
      a:
        '因为自绘的准星**一定会晚一帧**才画出来 —— 你移动鼠标,它要等下一次屏幕刷新才跟上。而你是拿它来瞄的,' +
        '这一帧的滞后会实打实地变成成绩下降,和你的瞄准能力没关系。所以这里用 `cursor: crosshair`(系统准星),' +
        '它由浏览器直接合成,不经过页面的绘制。同理也不做"隐藏光标 + DOM 跟随"那一套。',
    },
    {
      q: '靶子会自己消失吗?',
      a:
        '不会。你不点它,它就一直待在那儿,**没有"漏掉"这个计数** —— 因为这一页量的是手速和准头,' +
        '"没反应过来"混进命中率的分母只会让那个百分比说不清话。所以只有两种结果:点中(它换个位置)和点空。',
    },
    {
      q: '一次都没点会怎样?',
      a:
        '**命中率显示破折号,不显示 0。**"0% 命中率"和"根本没开枪"是两件不同的事,而它们在除法里长得一模一样 ——' +
        '这是全站那条"算不出来就显示破折号"的规矩在这一页的样子。命中数和每秒命中这时会如实显示 0,因为那两个确实算得出来。',
    },
    {
      q: '为什么跑起来之后不能改模式和难度?',
      a:
        '因为改了就是**换掉判据本身**:目标直径一变,前面那些已经记下的枪就不是同一个口径了;同时在场的目标数一变,' +
        '"每秒命中"的含义也跟着变。所以开始之后三组按钮会禁用,这一轮作废或结束之后才能改。',
    },
  ] as AimFaqItem[],
};

export const aimEn: typeof aimZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'aim-test',
  metaTitle: 'Mouse aim test — count hits, accuracy and mean offset online',
  metaDescription:
    'Online aim test: click the targets that appear at random over 10 / 30 / 60 seconds, and track hits per second, hits, accuracy and mean offset (hits only). Scores are kept on this machine and compared only against your own history.',

  h1: 'Mouse aim test',
  lede:
    'Pick your targets and duration, click **“Start practice”**, then click the targets in the box ' +
    'below as often and as accurately as you can. Hit one and it moves somewhere else. Scores are ' +
    'kept in your own browser only.',
  ledeCaveat:
    'Of the three readouts, only **hits per second** measures hand speed — accuracy can be ' +
    'inflated by slowing down. And **mean offset** is affected by DPI and sensitivity, so ' +
    '**it can only be compared against yourself on the same machine**; change the target ' +
    'diameter or the duration and two scores are not comparable either.',

  groupAria: { mode: 'Target count', difficulty: 'Target size', duration: 'Session length' },
  groupLabel: { mode: 'Targets', difficulty: 'Difficulty', duration: 'Duration' },
  modeOptions: { multi: 'Multiple', single: 'Single' },
  difficultyOptions: { easy: 'Easy', standard: 'Standard', hard: 'Hard' },
  durations: [
    { ms: 10000, label: '10 s' },
    { ms: 30000, label: '30 s' },
    { ms: 60000, label: '60 s' },
  ],
  start: 'Start practice',
  stop: 'Stop',
  again: 'Practice again',

  callIdle: 'Click “Start practice”',
  metaIdle: 'only clicks that land inside the test area count as a shot',

  stats: {
    'per-sec': { label: 'Hits per second', hint: 'hits ÷ session length' },
    hits: { label: 'Hits', hint: 'a best needs a finished run' },
    accuracy: { label: 'Accuracy', unit: '%', hint: 'hits ÷ clicks' },
    offset: { label: 'Mean offset', unit: 'px', hint: 'over the hits only' },
    left: { label: 'Left', unit: 's' },
  },
  dash: '—',
  accuracyDiameterHint: 'target diameter {px}px',
  hitsNoBest: 'no score in this tier yet',
  hitsBest: 'best on this machine {best}',

  callDone: 'Time up',
  callStopped: 'Stopped',
  callCancelled: 'Cancelled',
  metaNoClicks: 'not a single click',
  metaHits: '{hits} hits',
  metaRecord: '{head} · a new record on this machine',
  metaCancelled: 'the page was switched away — this round is void, no score',

  readoutsHeading: 'What the three readouts are',
  readoutsPoints: [
    '**Hits per second** = hits ÷ session length. The length is **given by the timer** — pick ' +
      '30 seconds and the denominator is 30 seconds, not something inferred from the click ' +
      'timestamps. If you land the last shot and stop, that idle stretch simply does not exist in ' +
      'the timestamps, and an inferred denominator would average “two frantic seconds” into an ' +
      'inflated figure.',
    '**Accuracy** = hits ÷ clicks. Only clicks that land inside the test area count as a shot; ' +
      'clicks outside the box do not.',
    '**Mean offset** = the distance from each shot to its target centre, in CSS pixels, **over the ' +
      'hits only**. It deliberately **does not convert to centimetres or degrees**: that would ' +
      'need the physical size of the screen, which is the whole problem the DPI page wrestles with.',
  ],

  paramsHeading: 'Settings',
  paramsLede:
    'Below is every setting this page has. Change any one of them and a score is no longer ' +
    'comparable with the previous tier — which is why best scores are **kept per tier**.',
  paramsColumns: { setting: 'Setting', value: 'Values' },
  params: [
    { key: 'Mode', value: 'Multiple ({multi} at once) / single ({single})' },
    { key: 'Difficulty', value: 'Easy {easy}px / standard {standard}px / hard {hard}px' },
    { key: 'Duration', value: '10 / 30 / 60 s' },
  ],

  influencesHeading: 'What affects your score',
  influencesPoints: [
    '**Target diameter.** Accuracy is unaffected by DPI but is affected by the target’s ' +
      '**angular size** — 40 pixels on screen looks half as big when you sit twice as far back. ' +
      'So the page always prints the current diameter.',
    '**DPI and mouse sensitivity.** Accuracy (a ratio of two counts) is unaffected; mean offset ' +
      'is affected.',
    '**The system cursor.** This page uses the system crosshair. A self-drawn one would lag by a ' +
      'frame, and you aim with it — that frame turns into a real drop in score, with nothing to do ' +
      'with your aim.',
    '**Trackpad and touchscreen.** A tap is not an aimed shot. When the pointer is imprecise, the ' +
      'page shows a notice at the top.',
    '**The page being switched away from.** A background tab does not paint, so the targets are ' +
      'simply invisible. So when this page notices the switch it **voids the whole round and gives ' +
      'no score** — the timer stops along with rAF, and the measured window no longer matches the ' +
      'time you could actually play; better no denominator than a wrong one.',
  ],
  lockNote:
    'This page also **does not use pointer lock** (`pointer lock`). It would bring the operating ' +
    'system’s pointer acceleration into the measurement — this site has a whole page on ' +
    'acceleration testing precisely because that is a real confound; and once it is locked you ' +
    'need Esc to get out. So this round does not do it.',

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'Why is the main readout “hits per second” rather than accuracy?',
      a:
        'Because **accuracy can be inflated by slowing down**: take your time, settle every shot ' +
        'before you click, and you can get close to 100%; click fast and it drops to seventy or ' +
        'eighty. A number that goes up just by slowing down is no good as the headline. “Hits per ' +
        'second = hits ÷ measured length”, on the other hand, is pushed the other way when you ' +
        'slow down — it has the same shape as the CPS page’s “average CPS”: a ratio of two ' +
        'counts, which nobody can inflate.',
    },
    {
      q: 'Why does the mean offset count only the hits?',
      a:
        'Because one miss 300 pixels off the centre drags the average right off with it. That ' +
        'number answers neither “how tightly did you hit” nor “how far did you miss” — two ' +
        'questions, one number each: **accuracy** answers “did you hit”, **mean offset** answers ' +
        '“how precisely”. So the offset averages only the shots that hit, in CSS pixels.',
    },
    {
      q: 'Does changing mouse DPI or sensitivity affect the score?',
      a:
        '**Accuracy is unaffected** — it is just “hit how many times ÷ clicked how many times”, ' +
        'both of them counts. **Mean offset is affected**: change the DPI and the same hand ' +
        'movement covers a different distance on screen, so the pixel distance from the centre ' +
        'changes too. So comparing your offset with someone else’s, or your own across two DPIs, ' +
        'is really comparing settings. This is also why there is **no weighted overall score**: a ' +
        'weighting formula that folds accuracy and offset into one number is itself a made-up ' +
        'number.',
    },
    {
      q: 'Why compare a score only against yourself on the same machine?',
      a:
        'Because although accuracy is unaffected by DPI, it is affected by the **angular size of ' +
        'the target** — 40 pixels on screen looks half as big when you sit twice as far from the ' +
        'monitor. Add screen size, refresh rate and mouse weight, and someone on another machine ' +
        'has several variables between their score and yours. So this page stores one best score ' +
        'locally, and splits the tiers finely: **change the mode, the difficulty or the duration ' +
        'and it is a different key**, so the scores are no longer compared together.',
    },
    {
      q: 'Why the system cursor rather than a crosshair I draw myself?',
      a:
        'Because a self-drawn crosshair **always lags by a frame** — you move the mouse and it ' +
        'only catches up at the next screen refresh. And you aim with it, so that frame’s lag ' +
        'turns into a real drop in score, with nothing to do with your aim. So this page uses ' +
        '`cursor: crosshair` (the system crosshair), which the browser composites directly, ' +
        'without going through the page’s painting. For the same reason it does not do the “hide ' +
        'the cursor and follow it with the DOM” trick either.',
    },
    {
      q: 'Do the targets disappear on their own?',
      a:
        'No. If you do not click one, it stays put, and **there is no “missed” count** — because ' +
        'this page measures speed and precision, and folding “did not react in time” into the ' +
        'accuracy denominator would only make that percentage impossible to read. So there are ' +
        'just two outcomes: a hit (it moves) and a miss.',
    },
    {
      q: 'What if I never click at all?',
      a:
        '**Accuracy shows a dash, not 0.** “0% accuracy” and “never fired a shot” are two ' +
        'different things, and in a division they look exactly alike — this is what the ' +
        'site-wide rule “no number, show a dash” looks like on this page. Hits and hits per ' +
        'second do show 0 here, truthfully, because those two really can be worked out.',
    },
    {
      q: 'Why can I not change the mode or difficulty once it is running?',
      a:
        'Because changing them **replaces the yardstick itself**: change the target diameter and ' +
        'the shots already recorded were on a different scale; change how many targets are on ' +
        'screen at once and the meaning of “hits per second” changes with it. So once you start, ' +
        'the three groups of buttons are disabled, and you can change them only after this round ' +
        'is voided or finished.',
    },
  ],
};
