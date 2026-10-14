/**
 * 回报率测试页(`/polling-rate-test/`)的文案。
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
 * `pollingEn` 声明成 `typeof pollingZh` —— 英文版漏一个键、拼错一个键、
 * 多出一个键,都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 带 `**强调**` 的段落
 *
 * 正文里那几个 `**` 是**故意留的标记**,渲染时走 `faq.ts` 的 `faqHtml()`
 * (和 FAQ 答案同一套)。模板里原来是 `<strong>…</strong>`,搬进目录时按这个
 * 约定改写成 `**…**`,句子因此是完整的、没有为了加粗被切成碎片。
 *
 * ## 这一页是全站最强调「测不准就不给数」的一页
 *
 * 它**刻意不给抖动、掉包率、长尾**这些指标,而且正文里有整节在讲为什么——
 * 那些指标的输入都是**间隔**,而间隔正是浏览器涂得最脏的东西。翻译时**不能
 * 把这层"拒绝"软化成一句中性的说明**,它是这一页的立场本身。
 *
 * ## 三条落地时的判断,写在这里免得被当成疏漏
 *
 * 1. **`explainPoints` / `limitsPoints` 是整段的字符串数组,不是 `{title, body}`。**
 *    源模板里每个 `<li>` 都是「开头一个 `<strong>` + 句中还有几处 `<strong>`」,
 *    而 `cps.ts` 那种 `{title, body}` 的形状(`<li><strong>{title}</strong>{body}</li>`)
 *    **body 是不走 `faqHtml` 的普通文本**——句中那些 `**` 会原样印成星号。
 *    所以这里整段一个键、一律走 `faqHtml`。
 * 2. **`limitsPoints` 第一条里那个 `{br}`** 是源模板中的 `<br />`。它没有文字、
 *    只有换行,所以不进 `**` 那条路;接线时先 `faqHtml()` 再 `fill(item, { br: '<br />' })`
 *    (同 `sensitivity.ts` 的 `{dpiTestLink}`,只是那枚占位符带文字、这枚不带)。
 * 3. **源模板里 `<span class="mark-warn">橙色柱子</span>` 保住了橙色。**
 *    `faqHtml()` 会转义 `<`,所以那两个字不能连 span 一起住进句子里;做法是
 *    把它**拆成自己的键**(`chartLedeWarn`),句子在 `{warn}` 处留一个洞,
 *    接线时 `fill(faqHtml(chartLede), { warn: '<span class="mark-warn">…</span>' })`
 *    把节点嵌回去 —— 同 `sensitivity.ts` 的 `{dpiTestLink}`。
 *    **别退回 `**…**`**:那样能过 `faqHtml()`,但代价是那两个字丢掉颜色,
 *    而它本来和图表里那根橙色柱子同色,颜色正是把那两处钉在一起的东西。
 *
 * ## 不在这一份里的东西
 *
 * - **`analysis.ts` 的 `assessQuality()` 产出的那六条提示**已经在 `zh.ts` /
 *   `en.ts` 的 `quality` 块里(它们是纯统计模块的出口,不属于某一页),
 *   这里**不重复**。本文件只管页面自己那个 `QUALITY_TEXT` 徽章文案。
 * - **`capabilities.ts` 的能力告警**同理,由 `ui.ts` 那份中央实现管。
 */

/** 参考值表的一行。`hz` 是数值 —— 页面拿它当 `data-ref-hz` 高亮当前档位 */
export interface PollingReferenceRow {
  hz: number;
  interval: string;
  use: string;
  note: string;
}

export interface PollingFaqItem {
  q: string;
  a: string;
}

export const pollingZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'polling-rate-test',
  /** 页面自己的 <title> / meta description。**和 `tools.ts` 里那份逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '鼠标回报率测试 - 在线检测 125Hz 至 8000Hz 轮询率',
  metaDescription:
    '在线测量鼠标回报率(轮询率),支持 125Hz 至 8000Hz,给出实测回报率、峰值与窗口波动,并对照标称档位判定。基于浏览器原生 Pointer Events,数据全部在本地计算。',

  h1: '鼠标回报率测试',
  lede:
    '回报率(轮询率)是鼠标每秒向电脑报告位置的次数,单位 Hz。1000Hz 意味着约 1ms 报告一次,' +
    '数值越高光标越跟手。点下面的按钮开始,然后**在这个页面的任意位置按住并快速画圈**——' +
    '画得越快,读数越接近真实值。',

  /** 判定横幅左边那个标题 */
  verdictLabel: '当前回报率',
  /** 那颗开关按钮的两档文案 */
  startTest: '开始测试',
  stopTest: '停止测试',
  reset: '重置',
  /** 开关旁边那行提示(首屏)。**和 `noteIdle` 是两句**,只在中间多了「在页面任意位置」 */
  hint: '点“开始测试”,然后在页面**任意位置**按住鼠标快速画圈',
  /** 判定横幅下方那行说明。**首屏和脚本复位时用的是同一句** */
  noteIdle: '点“开始测试”,然后按住鼠标快速画圈',

  /** 档位徽章的三档:还没测 / 认不出 / 认出来了 */
  badgeWaiting: '等待测试',
  badgeUnrecognized: '未识别档位',
  badgeTier: '{tier} Hz',

  stats: {
    peak: { label: '峰值', hint: '各 200ms 窗口的最高值' },
    stability: { label: '窗口波动', hint: '各窗口速率的离散度' },
    speed: { label: '移动速度', hint: '越快读数越准' },
    samples: { label: '有效采样', hint: '主段样本数' },
  },

  chart: {
    heading: '实时回报率',
    left: '{from}s',
    right: '{to}s · 满格 {max} Hz',
    barTitle: '{hz} Hz · {samples} 个采样',
  },

  /**
   * 图表下面那段说明。
   *
   * **`{warn}` 和句子分开是一条刻意留的接缝**:源模板里那四个字原来住在一个
   * `<span class="mark-warn">` 里,**橙色和图表里那根低于档位的柱子是同一个色**
   * —— 看见橙色柱子再去读"橙色柱子表示…",颜色把这两处钉在一起。
   * 那层意思过不了 `faqHtml()`(它会转义 `<`),所以句子留在 `chartLede` 里、
   * 短语单独一个键,接线时 `fill(faqHtml(chartLede), { warn: '<span …>' })`
   * 把节点嵌回去。和 `sensitivity.ts` 的 `{dpiTestLink}` 是同一个形状。
   */
  chartLede:
    '每根柱子是一个 200ms 窗口的实测值,横轴是时间。稳定的鼠标应该是一排差不多高的柱子;' +
    '{warn}表示这个窗口明显低于标称档位——多半是那一瞬间画慢了,而不是鼠标出了问题。',
  chartLedeWarn: '橙色柱子',

  referenceHeading: '参考值',
  referenceLede: '下面是常见档位。间隔就是 1000 ÷ Hz——鼠标每多少毫秒报告一次位置。',
  referenceColumns: { hz: '回报率', interval: '间隔', use: '常见定位', note: '说明' },
  reference: [
    { hz: 125, interval: '8 ms', use: '办公 / 基础鼠标', note: '光标移动能看出台阶感' },
    { hz: 250, interval: '4 ms', use: '入门游戏', note: '比 125Hz 明显跟手' },
    { hz: 500, interval: '2 ms', use: '游戏', note: '大多数玩家的性价比档位' },
    { hz: 1000, interval: '1 ms', use: '专业电竞', note: '目前最主流的高端档位' },
    { hz: 2000, interval: '0.5 ms', use: '高端电竞', note: '需要 144Hz 以上屏幕才看得出差别' },
    { hz: 4000, interval: '0.25 ms', use: '顶级电竞', note: 'CPU 占用开始变得可观' },
    { hz: 8000, interval: '0.125 ms', use: '旗舰', note: '刷新率会先成为瓶颈' },
  ] as PollingReferenceRow[],

  explainHeading: '怎么看结果',
  explainPoints: [
    '**当前回报率**用的是计数法:在最长的一段连续运动里,拿样本数除以时长。' +
      '浏览器会拖延事件的派发,但**不会丢报文**,所以事件总数和总时长都是准的,' +
      '相除正好把派发的抖动平均掉。这是浏览器里唯一无偏的算法。',
    '**判定档位**是把实测值归到最近的标称档位,容差 ±8%。超出容差就显示' +
      '“未识别”,不硬凑——880Hz 不会替你说成 1000Hz。',
    '**峰值**是把这段运动切成 200ms 的窗口,取其中最高的一个,' +
      '反映这只鼠标最多能跑到多少。**它天生会比真实值略高**——' +
      '一组带噪声的数里取最大值,拿到的总是“真值 + 正向噪声”。好在每个窗口的噪声很小,' +
      '3 秒数据上通常只高出 1% 左右,当作上界看就好。',
    '**窗口波动**是各窗口速率的离散程度,反映读数稳不稳。' +
      '它和峰值一样建立在**计数**上,不碰间隔,所以在浏览器里是可信的。' +
      '通常 5% 以内属于稳定。',
    '**移动速度**——这是读数偏低时最该先看的数字。鼠标只在产生了新位移时' +
      '才发报文,所以每秒报文数 ≈ 每秒移动的像素数。**这不是 bug**,' +
      '但移动太慢时测出的数值没有意义。',
  ],

  releaseHeading: '中途松开鼠标不影响结果',
  releaseBody:
    '你松手、换方向的瞬间不会产生任何指针事件,缓冲区里会留下一个几百毫秒的空档。' +
    '本页的做法是**在空档处把序列整段切开**,只在最长的连续段上做统计。' +
    '这也是“每次测都不一样”的根源:如果直接把空档算进去,一个 500ms 的停顿混进' +
    '2000 个 1ms 的间隔里,平均值会从 1ms 变成 1.25ms,读数从 1000Hz 掉到 800Hz——' +
    '而它跌多少,完全取决于你什么时候松手。',

  noJitterHeading: '本页不提供“抖动”“掉包率”',
  noJitterBody:
    '这是刻意的,而且是被实测逼出来的。这类指标都要靠**相邻事件的间隔**算,' +
    '而间隔恰恰是浏览器里最不可信的东西:时间戳是浏览器**处理到这条消息的时刻**,' +
    '不是硬件上报的时刻,实测有 **0.3–0.6ms** 的批处理延迟' +
    '(原生驱动接口只有 ±2µs)。1000Hz 的周期是 1ms,这点延迟足以让一个完全正常的间隔' +
    '越过任何“偏长”的门槛,于是好鼠标也会稳定报出百分之几的掉包率。' +
    '**把门槛往上调只是把这个假象藏起来,治不了根**,所以本页不给这类数字。' +
    '页面上保留的每一个指标——回报率、峰值、窗口波动——都只建立在**计数**上。',

  limitsHeading: '测不准的情况',
  limitsPoints: [
    '**移动太慢。**每秒报文数 ≈ 每秒移动的像素数。要打满 1000Hz,' +
      '你需要在屏幕上每秒移动约 1000 像素;要打满 8000Hz 就是每秒 8000 像素。' +
      '页面上的“移动速度”会实时告诉你够不够。**画圈要甩开膀子画**——' +
      '整个页面都是测试面,不必拘束在某一块区域里,幅度越小速度越上不去,' +
      '读数就越低。{br}换个写法:**每秒报文数 = DPI × 每秒移动的英寸数**。' +
      '800 DPI 要每秒推 1.25 英寸(约 3 厘米)才够 1000Hz,1600 DPI 只要一半。' +
      '所以读数偏低时,**先把 DPI 调高**通常比甩得更快省力得多。',
    '**时间戳被钳在 100µs,逐条间隔没有意义。**' +
      '浏览器只在页面处于**跨域隔离**时才给出 5µs 精度的时间戳,否则钳在' +
      '**100µs**。8000Hz 鼠标的报文周期是 125µs,和量化台阶是同一个数量级,' +
      '落进同一格的报文会被丢在一起——本页会实时统计这个比例,一旦偏高就把数据质量判为' +
      '“不可信”。**但主读数不受这一条限制**:它用的是「报文数 ÷ 时长」,' +
      '量化只作用在首尾两个时间戳上,几秒的运动里那是万分之一级的误差。真正会让它偏低的是' +
      '被丢掉的报文和浏览器自身的批处理,所以 **4000Hz 以上把这个数当下限看**。' +
      '页面顶部会标明当前精度(本站用 service worker 在 GitHub Pages 上补出了隔离,' +
      '浏览器支持的话那里显示的就是 5µs)。',
    '**不是 HTTPS**——Chrome 142 起,合并事件只在安全上下文中可用。' +
      '用 http 访问时本页会直接失效,顶部会有提示。',
    '**Firefox**——部分版本把合并事件的时间戳设为 0,此时只能给出平均回报率,' +
      '**无法给出峰值和窗口波动**。这是浏览器实现差异,不是你的鼠标问题。',
    '**无线鼠标**——接收器插在 USB 3.0 口旁边可能受干扰,读数会不稳。可以换个口再测。',
  ],

  faqHeading: '常见问题',
  faq: [
    {
      q: '为什么我测出来的数值比鼠标标称的低?',
      a:
        '最常见的原因是移动速度不够,而不是鼠标有问题。鼠标只在产生了新位移时才发报文,所以每秒报文数 ≈ 每秒移动的像素数。要打满 1000Hz,你需要每秒在屏幕上移动约 1000 像素;' +
        '要打满 8000Hz 就是每秒 8000 像素,那已经相当快了。本页会实时显示你的移动速度,读数偏低时先看它。' +
        '其次要确认驱动里确实开了高回报率模式——有些鼠标出厂默认是 125Hz,不装驱动改不了。无线鼠标的接收器插在 USB 3.0 口旁边也可能受干扰。',
    },
    {
      q: '为什么高回报率鼠标测出来还是 1000Hz 左右?',
      a:
        '按可能性从高到低排:第一是**移动速度**,也就是上一问那条——鼠标只在产生新位移时才发报文,' +
        '推得慢自然读不满,先看页面上的“移动速度”够不够。' +
        '第二是**系统与驱动**:Windows 会限制**非前台窗口**接收原始输入(测的时候让本页保持聚焦),' +
        '有些无线鼠标会为省电动态调整回报率,接收器挨着 USB 3.0 口也可能受干扰。' +
        '第三才是**浏览器**:它派发指针事件本身有开销,回报率越高打折越多,' +
        '有浏览器工具作者实测 4000Hz 以上比硬件级工具低一两成;' +
        '要拿硬件级的数字得用操作系统底层的接口(如 Windows Raw Input),那不是网页能做的。' +
        '所以本页在 4000Hz 以上给出的数请当作**下限**看。',
    },
    {
      q: '峰值和当前回报率有什么区别?该看哪个?',
      a:
        '当前回报率是在最长的一段连续运动上,用样本总数除以总时长算出来的,最稳,适合判断鼠标实际工作在哪个档位。' +
        '峰值是把这段运动切成 200ms 的小窗口,取其中最高的那个,反映“这只鼠标最多能跑到多少”。' +
        '峰值天生会比真实值略高一点,因为它是许多个带噪声的窗口里取最大值;当作上界看,不要当作典型值。',
    },
    {
      q: '回报率越高越好吗?',
      a:
        '收益是递减的。125Hz 到 500Hz 是质的差别,500Hz 到 1000Hz 明显,1000Hz 往上对绝大多数人已经难以分辨——' +
        '屏幕刷新率通常先成为瓶颈。更高的回报率还会增加 CPU 占用,8000Hz 鼠标通常占 1–2%。',
    },
    {
      q: '中途松开鼠标会影响结果吗?',
      a:
        '不会。松手和换方向的瞬间不产生任何指针事件,程序会在这些空档处把数据整段切开,' +
        '只在最长的一段连续运动上做统计。这正是本页读数比同类工具稳定的原因——把空档算进去的算法,' +
        '结果会取决于你什么时候松手,每次测出来都不一样。',
    },
    {
      q: '为什么没有“抖动”“掉包率”这些指标?',
      a:
        '因为它们在浏览器里测不准,给出来只会误导人。这类指标都要靠相邻事件的间隔计算,' +
        '而浏览器给事件打的时间戳是它自己处理到这条消息的时刻,实测有 0.3–0.6ms 的批处理延迟,' +
        '而 1000Hz 的周期只有 1ms。一个完全正常的间隔光靠浏览器自身的延迟就能变成 1.6ms,' +
        '于是任何“明显偏长就算掉包”的判据都会让一只好鼠标报出百分之几的掉包率。本页只给计数类的结论。',
    },
  ] as PollingFaqItem[],

  // -------------------------------------------------------------------------
  // 以下都是 `<script>` 里拼出来的句子。整句一个键,占位符由 `fill()` 填。
  // -------------------------------------------------------------------------

  /** 页面顶部那条精度提示。`{isolated}` 取 `isolatedOn` / `isolatedOff` */
  precisionMeta: '{isolated}跨域隔离 · 计时精度 {resolution} · 采样通道 {channel}',
  isolatedOn: '已开启',
  isolatedOff: '未开启',
  /** 采样通道的两档 + 探测中 */
  channelRaw: 'pointerrawupdate(不等帧)',
  channelMove: 'pointermove(对齐刷新率)',
  channelProbing: '探测中',

  /** 聚合模式(部分 Firefox)下三个指标都做不了 */
  hintUnsupported: '本浏览器不支持',
  samplesHintMerged: '含被合并的采样',
  noteAvgOnly: '本浏览器只能给出平均回报率',

  /** 移动速度的两档判词 */
  speedHintSlow: '偏慢,读数可能被速度限制',
  speedHintOk: '速度充足',

  /** 峰值 hint:认出窗口数时的版本(认不出时用 `stats.peak.hint`) */
  peakHintWindows: '{windows} 个窗口中最高',
  /** 窗口波动 hint:窗口不够时的版本(够时用 `stats.stability.hint`) */
  stabilityHintFew: '窗口不足 {min} 个',

  /** 有效采样 hint 的两档:`{seconds}` 是「3.5」这样的字符串 */
  samplesMetaSingle: '{seconds} 秒 · 单段',
  samplesMetaMulti: '{seconds} 秒 · 另有 {segments} 段',

  /** 判定横幅下方那行说明的两档:纯一段 / 中途停顿切过段 */
  noteMetaPlain: '{seconds} 秒 · {samples} 个采样',
  noteMetaSegmented: '{seconds} 秒 · {samples} 个采样 · 中途停顿 {segments} 次(已切段)',

  /** 数据质量徽章。**这条和 `analysis.ts` 的六条提示是两回事**,见文件头 */
  qualityText: {
    good: '数据可信',
    fair: '数据一般',
    poor: '数据不可信',
  },
};

export const pollingEn: typeof pollingZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'polling-rate-test',
  metaTitle: 'Mouse polling rate test — check 125 Hz to 8000 Hz online',
  metaDescription:
    'Measure your mouse polling rate online, from 125 Hz to 8000 Hz. Reports the measured rate, the peak and the window spread, and matches it against the nominal tiers. Built on native Pointer Events; everything is computed locally.',

  h1: 'Mouse polling rate test',
  lede:
    'The polling rate is how many times a second the mouse reports its position to the computer, in Hz. ' +
    '1000 Hz means a report about every 1 ms, and the higher the number the more closely the cursor tracks. ' +
    'Press the button below to start, then **hold and draw fast circles anywhere on this page** — ' +
    'the faster you draw, the closer the reading gets to the truth.',

  verdictLabel: 'Current polling rate',
  startTest: 'Start test',
  stopTest: 'Stop test',
  reset: 'Reset',
  hint: 'Click "Start test", then hold the mouse and draw fast circles **anywhere** on the page',
  noteIdle: 'Click "Start test", then hold the mouse and draw fast circles',

  badgeWaiting: 'Waiting',
  badgeUnrecognized: 'Tier not recognised',
  badgeTier: '{tier} Hz',

  stats: {
    peak: { label: 'Peak', hint: 'highest of the 200 ms windows' },
    stability: { label: 'Window spread', hint: 'how much the window rates scatter' },
    speed: { label: 'Move speed', hint: 'faster means a truer reading' },
    samples: { label: 'Valid samples', hint: 'samples in the main segment' },
  },

  chart: {
    heading: 'Live polling rate',
    left: '{from}s',
    right: '{to}s · full scale {max} Hz',
    barTitle: '{hz} Hz · {samples} samples',
  },

  chartLede:
    'Each bar is the measured rate for one 200 ms window, with time along the horizontal axis. ' +
    'A steady mouse should give a row of bars of about the same height; ' +
    '{warn} mean that window fell clearly below the nominal tier — usually you just drew ' +
    'slower for that instant, not a fault in the mouse.',
  chartLedeWarn: 'orange bars',

  referenceHeading: 'Reference values',
  referenceLede:
    'These are the common tiers. The interval is 1000 ÷ Hz — how many milliseconds apart the mouse will report its position.',
  referenceColumns: { hz: 'Rate', interval: 'Interval', use: 'Typical use', note: 'Notes' },
  reference: [
    { hz: 125, interval: '8 ms', use: 'Office / basic mice', note: 'Stepping is visible in cursor movement' },
    { hz: 250, interval: '4 ms', use: 'Entry gaming', note: 'Noticeably smoother than 125 Hz' },
    { hz: 500, interval: '2 ms', use: 'Gaming', note: 'The value sweet spot for most players' },
    { hz: 1000, interval: '1 ms', use: 'Pro esports', note: 'The mainstream high-end tier today' },
    {
      hz: 2000,
      interval: '0.5 ms',
      use: 'High-end esports',
      note: 'Needs a 144 Hz or faster screen to show any difference',
    },
    { hz: 4000, interval: '0.25 ms', use: 'Top-tier esports', note: 'CPU usage starts to become noticeable' },
    { hz: 8000, interval: '0.125 ms', use: 'Flagship', note: 'The refresh rate becomes the bottleneck first' },
  ],

  explainHeading: 'How to read the result',
  explainPoints: [
    '**Current polling rate** uses the counting method: over the longest continuous movement, take the ' +
      'sample count divided by the duration. The browser delays when events are dispatched but ' +
      '**never drops reports**, so the total event count and the total duration are both exact, and the ' +
      'division cancels the dispatch jitter. This is the only unbiased algorithm available in a browser.',
    '**Tier matching** snaps the measured value to the nearest nominal tier, within ±8%. Outside that ' +
      'tolerance it reads "unrecognised" rather than forcing a fit — 880 Hz will not be rounded up to ' +
      '1000 Hz for you.',
    '**Peak** cuts the movement into 200 ms windows and takes the highest one: the most this mouse can ' +
      'do. **It always runs a little above the true value** — the maximum of a noisy set comes back as ' +
      '"true value + positive noise". The good news is the per-window noise is small: over 3 seconds of ' +
      'data it typically overshoots by about 1%, so read it as an upper bound.',
    '**Window spread** is how much the per-window rates scatter — how steady the reading is. Like the ' +
      'peak it is built on **counts** and never touches intervals, so it is trustworthy in a browser. ' +
      'Under 5% is normally steady.',
    '**Move speed** — this is the first number to look at when the reading is low. A mouse only sends a ' +
      'report when it has moved somewhere new, so reports per second ≈ pixels moved per second. ' +
      '**This is not a bug**, but at too low a speed the value it measures means nothing.',
  ],

  releaseHeading: 'Releasing the mouse mid-run does not change the result',
  releaseBody:
    'The moment you let go or change direction produces no pointer events, leaving a gap of a few ' +
    'hundred milliseconds in the buffer. What this page does is **cut the sequence into segments at ' +
    'those gaps**, and work only on the longest continuous segment. That is also the root of "it ' +
    'measures differently every time": count the gaps in and a 500 ms pause mixed into 2000 ' +
    'one-millisecond intervals drags the average from 1 ms to 1.25 ms, and the reading falls from ' +
    '1000 Hz to 800 Hz — and how far it falls depends entirely on when you let go.',

  noJitterHeading: 'This page gives no "jitter" or "packet loss"',
  noJitterBody:
    'That is deliberate, and it was forced by measurement. These metrics all have to be computed from ' +
    '**the interval between adjacent events**, and the interval is precisely the least trustworthy ' +
    'thing in a browser: the timestamp is **the moment the browser got around to that message**, not ' +
    'the moment the hardware reported it, and the measured batching smear is **0.3–0.6 ms** (a native ' +
    'driver interface is within ±2 µs). The period at 1000 Hz is 1 ms, so that smear alone is enough to ' +
    'push a perfectly normal interval past any "too long" threshold — and a good mouse ends up ' +
    'reporting a packet-loss rate of a few percent. **Raising the threshold only hides the illusion, ' +
    'it does not fix the cause**, so this page gives no such numbers. Every metric kept on the page — ' +
    'rate, peak, window spread — is built on **counts** only.',

  limitsHeading: 'When it cannot be measured',
  limitsPoints: [
    '**Moving too slowly.** Reports per second ≈ pixels moved per second. To saturate 1000 Hz you need ' +
      'to move about 1000 pixels per second on screen; to saturate 8000 Hz, 8000 pixels per second. The ' +
      '"Move speed" figure tells you live whether you are there. **Draw with your whole arm** — the ' +
      'whole page is the test surface, you do not have to stay inside one small area, and the smaller ' +
      'the circle the lower the speed and the lower the reading.{br}Put another way: **reports per ' +
      'second = DPI × inches moved per second**. 800 DPI needs 1.25 inches (about 3 cm) per second to ' +
      'reach 1000 Hz; 1600 DPI needs half that. So when the reading is low, **turning the DPI up** is ' +
      'usually far less effort than swinging faster.',
    '**Timestamps are clamped to 100 µs, so per-event intervals mean nothing.** The browser only hands ' +
      'out 5 µs timestamps while the page is **cross-origin isolated**; otherwise it clamps to ' +
      '**100 µs**. An 8000 Hz mouse reports every 125 µs, the same order of magnitude as the ' +
      'quantisation step, so reports landing in the same bucket get lumped together — this page tracks ' +
      'that share live and flags the data as "not trustworthy" once it climbs. **The main reading is ' +
      'not bound by this**: it uses "reports ÷ duration", and the quantisation touches only the first ' +
      'and last timestamp, a part in ten thousand over a few seconds of movement. What really pulls it ' +
      'down is dropped reports and the browser\'s own batching, so **treat the number above 4000 Hz as ' +
      'a floor**. The top of the page states the current resolution (this site restores isolation on ' +
      'GitHub Pages with a service worker; where the browser supports it, that reads 5 µs).',
    '**Not HTTPS** — as of Chrome 142, coalesced events are only available in a secure context. Over ' +
      'http this page simply stops working, and there is a notice at the top.',
    '**Firefox** — some versions set the timestamp of coalesced events to 0; then only the average rate ' +
      'can be given, **with no peak and no window spread**. That is a browser implementation ' +
      'difference, not your mouse.',
    '**Wireless mice** — a receiver plugged next to a USB 3.0 port can pick up interference and the ' +
      'reading goes unsteady. Try another port.',
  ],

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'Why is my reading lower than the mouse\'s nominal rate?',
      a:
        'The most common cause is not moving fast enough, not a faulty mouse. A mouse only sends a report when it has moved somewhere new, so reports per second ≈ pixels moved per second. To saturate 1000 Hz you need to move about 1000 pixels per second on screen; ' +
        '8000 Hz means 8000 pixels per second, which is already quite fast. This page shows your move speed live — check it first when the reading is low. ' +
        'Second, confirm the driver really has the high polling rate mode on: some mice ship at 125 Hz by default and you cannot change it without the driver. A wireless receiver sitting next to a USB 3.0 port can also pick up interference.',
    },
    {
      q: 'Why does a high-polling-rate mouse still measure around 1000 Hz?',
      a:
        'Most to least likely. First, **move speed** — as in the previous answer: a mouse only reports when it moves somewhere new, ' +
        'so a slow drag simply cannot read full, and you should check whether the on-page "Move speed" is high enough. ' +
        'Second, **the system and the driver**: Windows stops **non-foreground windows** from receiving raw input (keep this page focused while testing), ' +
        'some wireless mice throttle the polling rate to save power, and a receiver next to a USB 3.0 port can suffer interference. ' +
        'Third, and last, **the browser**: dispatching pointer events has a cost of its own, and the higher the rate the bigger the discount — ' +
        'one browser-tool author measured 4000 Hz and up coming in one or two tenths below hardware-level tools; ' +
        'getting hardware-level numbers needs an operating-system-level interface (such as Windows Raw Input), which a web page cannot do. ' +
        'So treat anything this page gives above 4000 Hz as a **floor**.',
    },
    {
      q: 'What is the difference between peak and current rate, and which should I read?',
      a:
        'The current rate is computed over the longest continuous movement, total samples divided by total duration: the steadiest figure, and the right one for telling which tier the mouse is actually running at. ' +
        'The peak cuts that movement into small 200 ms windows and takes the highest, showing "the most this mouse can reach". ' +
        'The peak always runs a little above the true value, because it is the maximum of many noisy windows; read it as an upper bound, not a typical value.',
    },
    {
      q: 'Is a higher polling rate always better?',
      a:
        'The returns diminish. 125 Hz to 500 Hz is a difference in kind; 500 Hz to 1000 Hz is obvious; above 1000 Hz most people can no longer tell at all — ' +
        'the screen refresh rate usually becomes the bottleneck first. Higher rates also cost CPU: an 8000 Hz mouse typically uses 1–2%.',
    },
    {
      q: 'Does releasing the mouse mid-run affect the result?',
      a:
        'No. The instant you release or change direction produces no pointer events, and the program cuts the data into segments at those gaps, ' +
        'computing only over the longest continuous one. That is exactly why this page reads steadier than similar tools: an algorithm that counts the gaps in ' +
        'gives a result that depends on when you happened to let go, different on every run.',
    },
    {
      q: 'Why are there no "jitter" or "packet loss" figures?',
      a:
        'Because they cannot be measured reliably in a browser, and printing them would only mislead. These metrics all depend on the interval between adjacent events, ' +
        'and the timestamp a browser puts on an event is the moment it processed that message — the measured batching delay is 0.3–0.6 ms, ' +
        'while the period at 1000 Hz is only 1 ms. A perfectly normal interval can stretch to 1.6 ms from the browser\'s own delay alone, ' +
        'so any "clearly too long means packet loss" rule would have a good mouse reporting a packet-loss rate of a few percent. This page only gives counting-type conclusions.',
    },
  ],

  precisionMeta: '{isolated} cross-origin isolation · timer resolution {resolution} · sampling channel {channel}',
  isolatedOn: 'On',
  isolatedOff: 'Not on',
  channelRaw: 'pointerrawupdate (no frame alignment)',
  channelMove: 'pointermove (refresh-aligned)',
  channelProbing: 'probing',

  hintUnsupported: 'Not supported in this browser',
  samplesHintMerged: 'includes coalesced samples',
  noteAvgOnly: 'This browser can only give the average rate',

  speedHintSlow: 'Slow — the reading may be limited by speed',
  speedHintOk: 'Fast enough',

  peakHintWindows: 'highest of {windows} windows',
  stabilityHintFew: 'fewer than {min} windows',

  samplesMetaSingle: '{seconds}s · single segment',
  samplesMetaMulti: '{seconds}s · plus {segments} more segments',

  noteMetaPlain: '{seconds}s · {samples} samples',
  noteMetaSegmented: '{seconds}s · {samples} samples · {segments} pauses (segmented)',

  qualityText: {
    good: 'Data trustworthy',
    fair: 'Data fair',
    poor: 'Data not trustworthy',
  },
};
