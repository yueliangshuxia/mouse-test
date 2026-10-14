/**
 * 鼠标轨迹测试页(`/trail-test/`)的文案。
 *
 * ## 为什么一页一个文件
 *
 * 理由写在 `pages/cps.ts` 的文件头:全站要做双语,量是约 2000 条字符串、
 * 21 个页面。**每页一份文件**是为了让这件事可以一页一页做、也可以几页同时做
 * 而互不冲突 —— 都塞进 `zh.ts` / `en.ts` 那两个大文件的话,两个人(或两个 agent)
 * 同时动一页就会撞在一起。
 *
 * ## 两边的键必须一样,而这是**机制**不是约定
 *
 * `trailEn` 声明成 `typeof trailZh` —— 英文版漏一个键、拼错一个键、多出一个键,
 * 都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 带 `**强调**` 的段落
 *
 * 模板里那些 `<strong>…</strong>` 按仓库的约定改写成 `**…**`,渲染走 `faq.ts`
 * 的 `faqHtml()`(和 FAQ 答案同一套)。所以句子是完整的、没有为了加粗被切成
 * 碎片。**受影响的键**(都会被 `set:html` 渲染):`lede` / `noticePoints` /
 * `metrics[].note` / `driftLede` / `driftZero` / `driftAmbiguity` / `driftHandOff` /
 * `limitsPoints` / `faq[].a`。**脚本里那几个 `runtime.*` 一律不带 `**`** —— 它们走
 * `setText`,不进 `faqHtml`,写了星号只会原样印出来。
 *
 * ## 这一页的立场:标题那个数是**孤立尖峰**,不是超线间隔
 *
 * 页面上反复讲「跳变不等于丢帧」,所以标题端出来的必须是**孤立尖峰**
 * (`detectTrailJumps` 的 `isolated`:自己超线、**左右两个邻居都没超**),
 * 而 `超线间隔` 只是分母 —— 它里面混着「手甩快了」造成的连续隆起。
 * 译文里**不能把这两个数合并、也不能把「孤立尖峰」弱化成「疑似丢帧」**,
 * 那是这一页全部设计的来源。同理「跳变」≠「丢帧」这条区分要保住。
 *
 * ## 三处机械替换,都不是改写
 *
 * - `<strong>…</strong>` → `**…**`(见上)。
 * - **引号原样保留。** 原文里**同时**有直角引号 `"…"` 和中文弯引号 `“…”`,
 *   都不是手滑:`"相邻两点距离变大"`、`"线够长、画的时候手也确实在抖"` 这类
 *   是直角引号,而 FAQ 问句的 `“跳变”`、`“有没有丢帧”` 是弯引号。**逐字照抄,
 *   别统一。**
 * - **本页没有 `<code>`/反引号**(可见文字里一处都没有),所以没有需要降级的
 *   等宽片 —— 那一条权衡(`<code>` → `**`)在 `button.ts` / `scroll.ts` 的文件头。
 *
 * ## 运行期填的占位符
 *
 * | 占位符 | 在哪 | 填什么 |
 * | --- | --- | --- |
 * | `{factor}` / `{floor}` | `metrics[2].note` | `analysis.ts` 的 `TRAIL_JUMP_FACTOR` / `TRAIL_JUMP_FLOOR_PX` |
 * | `{steps}` / `{jumps}` / `{isolated}` / `{maxStep}` | `runtime.jumps*` | 相邻间隔总数 / 超线间隔数 / 孤立尖峰数 / 最大步长 |
 * | `{threshold}` | `runtime.jumps*` | 判定门槛(像素,已格式化) |
 * | `{near}` / `{snapped}` / `{segments}` | `runtime.strokes*` | 近轴笔画数 / 判为吸附数 / 切出的段数 |
 * | `{deg}` | `runtime.strokeAxisDeviation` | 轴偏离角度(已格式化) |
 * | `{seconds}` | `runtime.driftHintRunning` / `driftHintTimeout` | 剩余秒数 / 超时秒数 |
 * | `{samples}` / `{path}` | `runtime.driftHintDrift` | 漂移期采样数 / 累计路程 |
 *
 * `metrics[2].note` 里的 `{factor}` / `{floor}` 在**接线时**填,而且 `fill()` 要
 * **在 `faqHtml()` 之后**(同 `Scroll.astro` 的 `stripLede`):先填的话,填进去的
 * 数字会被后面的转义当句子的一部分处理。每句都**整句住在一个键里**,不在句子
 * 中间断开,理由同别页 —— 拆开之后翻译的人看不到完整的句子。
 *
 * ## 刻意写死的散文(改常量时要一起改,但**不进目录当占位符**)
 *
 * 这些在源模板/脚本里本来就是写死的中文,不是运行期值:
 *
 * - `stats.snapNear.hint` 里的 **`15°`**、`stats.snapHit.hint` 里的 **`0.35px`**
 *   (与 `analysis.ts` 的 `isNearAxis` / `isSnapped` 阈值同源);
 * - `runtime.strokesSnapped` 里的 **`0.35px`** / **`31 个采样`** / **`0.2px`** /
 *   **`27%`**(那是实测写下的数,和常量无关);
 * - `runtime.strokesTooShort` / `metrics[1].note` 里的 **`100px`**、`metrics[1].note`
 *   里的 **`0`**、`runtime.strokesInconclusive` 里的 **`3 条`**、FAQ 里的
 *   **`8 个报文`** / **`7 个`** / **`十几圈`**;
 * - `driftStart` 的 **`(5 秒)`** 与 `runtime.driftHintStill` / `driftHintDrift` 里的
 *   **`这 5 秒`**(对应脚本的 `DRIFT_MS = 5000`,但脚本里是字面写死的);
 * - `driftHintTimeout` 里那个 **`{seconds}`** 是运行期值(`ARM_TIMEOUT_MS / 1000`),
 *   所以它**是**占位符,不是散文 —— 别和上面几条混起来。
 *
 * ## 不在这一份里的东西
 *
 * - 源文件里的代码注释(中英混着的那些)是给开发者看的,不是用户文案。
 * - **本页有一句开发者字符串 `throw new Error('测试区未就绪')`**(脚本里那处
 *   前置断言),它只在代码出错时出现、不进目录。同 `scroll.ts` 文件头那条
 *   「没有要跳过的开发者字符串」是同一件事的另一面 —— 这一页有一句,照实记着。
 * - 表格里 `#` / `ms` / `px` / `°` 这类符号是结构不是文案,两语言逐字相同,
 *   留在 `strokeColumns` / `stats[].unit` / `runtime.strokeAxisDeviation` 里只为
 *   让目录自洽(这一页每一条可见文字都能在本文件里找到)。
 * - 方向带里 `0` 那种初值、以及 `runtime` 里 `'0'`(静止测试收到 0 个采样)
 *   是**数值不是文案**,由页面按结果显示,不在目录里。
 */

/** FAQ 一行的形状。**文案两边键必须一样**,见文件头 */
export interface TrailFaqItem {
  q: string;
  a: string;
}

/**
 * 「怎么读这些数」那张表的一行。
 *
 * `note` **含 `**` 标记**(渲染走 `faqHtml`),第三行的 `note` 还带 `{factor}` /
 * `{floor}` 两个占位符(见文件头)。`metric` / `look` 是那张表的另外两列。
 */
export interface TrailMetricRow {
  metric: string;
  look: string;
  note: string;
}

export const trailZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'trail-test',
  /** 页面自己的 `<title>` / meta description。**和 `tools.ts` 里那份逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '鼠标轨迹测试 - 检测平滑度、抖动与丢帧',
  metaDescription:
    '在线绘制鼠标移动轨迹,检测传感器是否丢帧、是否出现抖动或漂移,判断鼠标垫与传感器兼容性。',

  h1: '鼠标轨迹测试',
  lede:
    '在下面的区域里**匀速画十几圈**,看画出来的线是不是圆滑。' +
    '页面会数出轨迹里有多少处**孤立尖峰**——相邻采样点之间的距离突然变大、' +
    '而两边又都正常——以及鼠标完全静止时传感器会不会自己产生计数(**静止漂移**)。',

  /** 测试区上面那条 `.notice` 里的两条 */
  noticePoints: [
    '"相邻两点距离变大"**不等于丢帧**:传感器漏点和手甩快了在数据上是同一个样子。' +
      '所以这一页数的是**形状**——一串均匀小步里冒出的孤立尖峰才是丢帧的嫌疑,' +
      '连着一起变大的是你的手。',
    '影响结果的还有鼠标垫。玻璃面、纯白纸、太光滑的桌面上,大多数鼠标都会明显变差——' +
      '测出来不理想时,先换一块深色布垫再测一次。',
  ] as string[],

  /** 模式开关那一行。` · ` 中间那个间隔号是内容,不是排版 */
  modeLabel: '模式',
  modeLoop: '画圈 · 查丢帧',
  modeLine: '画直线 · 查角度吸附',

  /** 控件那一排。绘制按钮的文字会随状态换 `drawStart` → `drawStop` → `drawRestart` */
  drawStart: '开始绘制',
  drawStop: '停止绘制',
  drawRestart: '重新开始',
  clear: '清空轨迹',

  /** 测试区空态那句覆盖提示(`#overlay`),按模式换一条 */
  overlayLoop: '点“开始绘制”,然后在这里匀速画十几圈',
  overlayLine: '点“开始绘制”,然后在这里画几条横线和竖线,每条之间停一下',

  /**
   * 控件右边那行小提示(`#hint`)。**四条**:
   * `…Idle` 两条是空态(`LOOP_HINT` / `LINE_HINT` 两个脚本常量,模式切换和
   * 「清空轨迹」都写回它们),`…Drawing` 两条是绘制中(startDrawing 写进去的)。
   * **后两条与后两条不是同一句**,别合并。
   */
  hintLoopIdle: '点开始之后,在这个区域里匀速画圈',
  hintLineIdle: '画几条横线和竖线,每条之间停一下再画下一条',
  hintLoopDrawing: '匀速画十几圈,画完点“停止绘制”',
  hintLineDrawing: '画几条横线和竖线,每条之间停一下',

  /** 判定横幅。标签和单位都按模式换一套 */
  verdictLabelLoop: '孤立尖峰',
  verdictLabelLine: '判为吸附',
  verdictUnitLoop: '处',
  verdictUnitLine: '条',
  /** 判定横幅下那句说明的**空态**。**和脚本里 `clearReadouts()` 写回的是同一句**
   *  (一处键,两处出口:首屏的模板 + 脚本复位时) */
  verdictNoteIdle: '画完之后点“停止”或松开,这里会给出统计',

  /**
   * 右上角那枚徽章的每一档。`idle` 与 `clearReadouts()` 写回的是同一句。
   * 剩下几档全是脚本按结果写的,**三档分界最容易漏岔路**,所以一条不落。
   */
  badges: {
    idle: '等待绘制',
    drawing: '绘制中',
    tooFewStrokes: '笔画不足',
    inconclusive: '还判不了',
    noSnapping: '未见吸附',
    snapping: '疑似吸附',
    insufficient: '数据不足',
    noJumps: '未发现跳变',
    noIsolated: '未见孤立尖峰',
    isolated: '有孤立尖峰,需自行对照',
  },

  /**
   * 十三格读数。`hint` 为空串表示那一格没有说明;`unit` 只有几格有
   * (和页面上的 `<StatPanel>` 一一对应)。**分成四组**:共用的一格、
   * 画圈模式四格、直线模式四格、静止漂移四格。
   */
  stats: {
    samples: { label: '采样点数', hint: '' },
    duration: { label: '分析时长', unit: 'ms', hint: '最长的一段连续运动' },
    overCount: { label: '超线间隔', hint: '含连着出现的,只作分母' },
    medianStep: { label: '中位步长', unit: 'px', hint: '相邻两点的典型间距' },
    maxStep: { label: '最大步长', unit: 'px', hint: '' },
    snapStrokes: { label: '有效笔画', hint: '够长、采样够多才计入' },
    snapNear: { label: '近轴笔画', hint: '离坐标轴 15° 以内' },
    snapHit: { label: '判为吸附', hint: '贴轴,且最大残差小于 0.35px' },
    snapAxes: { label: '检出轴', hint: '' },
    driftSamples: { label: '静止期间采样', hint: '好鼠标应当是 0' },
    driftPath: { label: '累计路程', unit: 'px', hint: '来回抖动的总量' },
    driftSpan: { label: '抖动幅度', unit: 'px', hint: '最远两点的距离' },
    driftVerdict: { label: '判定', hint: '' },
  },

  /** 直线模式下那张逐条笔画表的六列。第一列是行号,两语言逐字相同 */
  strokeColumns: {
    index: '#',
    direction: '方向',
    length: '长度',
    axisDeviation: '轴偏离',
    maxResidual: '最大残差',
    verdict: '判定',
  },

  /** 「怎么读这些数」那一节 */
  metricsHeading: '怎么读这些数',
  /** 那张表的三个表头 */
  metricColumns: { metric: '指标', look: '看什么', note: '说明' },
  /** 四行。`note` 带 `**` 标记;第三行还带 `{factor}` / `{floor}` —— 见文件头 */
  metrics: [
    {
      metric: '孤立尖峰',
      look: '丢帧的形状',
      note:
        '自己超过门槛,而**左右两个邻居都没超**。在一串均匀的小步里插进一个' +
        '大跨步,这正是丢帧该有的样子。首尾两步只有一侧有邻居,不参与判断。',
    },
    {
      metric: '超线间隔',
      look: '分母,不是结论',
      note:
        '超过门槛的间隔总数,**把连着出现的一起算了进去**。' +
        '匀速甩动时正常的间距会成串超线,所以它本身说明不了任何问题——' +
        '要和孤立尖峰对比着看:两者差不多,说明超线的基本都是尖峰;' +
        '超线很多而孤立尖峰是 0,那就是你画快了。',
    },
    {
      metric: '中位步长',
      look: '平滑度',
      note:
        '匀速画圈时它约等于"每个采样点走多远"。这个数本身无所谓好坏,' +
        '它取决于你画多快和鼠标回报率多高——它的用处是当基准,也就是上面那个门槛:' +
        '判定门槛是**中位步长的 {factor} 倍且不低于 {floor} 像素**' +
        '。两个条件缺一不可:光有倍数的话,慢速移动时中位步长只有零点几像素,' +
        '手一抖就满屏"丢帧";光有绝对值的话,快速甩动时正常的间距也会全部超线。',
    },
    {
      metric: '最大步长',
      look: '有没有突变',
      note:
        '和门槛比一比。如果最大步长只比门槛高一点点,那基本是人手的抖动;' +
        '如果高出好几倍,那一下确实不正常。',
    },
  ] as TrailMetricRow[],

  /** 静止漂移那一节 */
  driftHeading: '静止漂移:手离开鼠标单独测',
  driftLede:
    '轨迹测试只能看出"动的时候有没有问题"。传感器的另一个常见毛病是**静不下来**:' +
    '鼠标明明搁在桌上没人碰,光标却自己缓慢爬动。这个必须单独测,方法就是把鼠标放着不动。',
  driftStart: '开始静止测试(5 秒)',
  /** 漂移测试那行提示的**空态**。`finishDrift()` 收尾时也写回这一句(一处键,两处出口) */
  driftHintIdle: '点开始后先晃一下鼠标确认信号,然后停手',
  driftZero:
    '判据很干脆:**鼠标不发报文,事件就不会派发**,所以一只没有自激的鼠标在完全静止时,' +
    '采样数应当是 **0**。真收到了采样,说明传感器在动——可能是自激,' +
    '也可能是表面干扰(玻璃、反光、灰尘、桌面共振)。',
  driftAmbiguity:
    '但"0 个采样"本身是有歧义的:指针根本不在浏览器窗口里、或者鼠标没接上,' +
    '页面同样一个事件都收不到,和"鼠标很安静"在数据上完全一样,' +
    '而这两种情况的结论天差地别。所以流程多了一步——**先让你把鼠标晃一下,' +
    '确认页面真的收得到信号**(这一步的采样随后会全部丢掉,不计入结果),' +
    '再等你停手。走过这一步之后,"0"才真正等于静止。要是一直收不到信号,' +
    '页面会直接说"没收到信号",而不是替你判成静止。',
  driftHandOff:
    '需要说明的是:**手放上去就不算数了**。心跳、呼吸、甚至桌子被碰一下,' +
    '都会让手带着鼠标动,那测出来的是你的手,不是鼠标。所以要么把手完全拿开,' +
    '要么只用一根手指轻轻搭着不施力。',

  /** 「轨迹测试测不到什么」那一节。**每条开头的 `**…**` 是卡片标题**,见文件头 */
  limitsHeading: '轨迹测试测不到什么',
  limitsPoints: [
    '**浏览器拿不到鼠标报文的序列号**——丢帧的本质是“本该有 8 个报文,' +
      '只来了 7 个”,而浏览器看到的只有它收到的那些,它不知道应该有 8 个。' +
      '所以“有没有丢帧”这个问题,网页在原理上就无法直接回答,' +
      '只能从轨迹的形状上找线索——而线索不是证据。',
    '**传感器的“加速度”和“平滑处理”也测不出来**——' +
      '有些鼠标会在固件里对原始数据做插值、去抖或加速,让画出来的线看着更顺滑,' +
      '代价是真实的微小移动被抹掉了。这两者网页都看不见,只有原始数据对比才能发现。',
  ] as string[],

  faqHeading: '常见问题',
  faq: [
    {
      q: '“跳变”是不是就是丢帧?',
      a:
        '不是,**页面抓到的跳变有两种来源,浏览器分不出来**。一是传感器漏报了几个计数——' +
        '那是真的丢帧;二是你的手真的甩快了,一个采样间隔里本来就该走那么远。' +
        '两者在数据上都是"相邻两个采样点之间距离特别大",没有任何字段能区分。' +
        '所以本页只说"跳变",不说"丢帧"。',
    },
    {
      q: '那我怎么判断到底是哪一种?',
      a:
        '看形态,别看总数。丢帧是"在一串均匀的小间距里插进一个孤立的大间距",像尖峰;' +
        '手甩快了会让连续一串间距一起变大,是一条整体的隆起。页面就是按这个来的:' +
        '标题那个数只数"孤立尖峰"(自己超线、左右两个邻居都没超),把连着出现的一起排除在外。' +
        '所以正确的用法是匀速画上十几圈——孤立尖峰反复出现,那是丢帧;' +
        '超线间隔很多而孤立尖峰是 0,那是你画快了。',
    },
    {
      q: '静止漂移测试为什么要求手离开鼠标?',
      a:
        '因为这个测试要测的是"鼠标完全不动时,传感器会不会自己产生计数"。' +
        '手搭在鼠标上,心跳和呼吸带来的微动就会被算进去——那不是传感器的问题,是你的手在动。' +
        '所以要么把手完全拿开,要么只用一根手指轻轻搭着不施力。',
    },
    {
      q: '为什么轨迹会自己慢慢消失?',
      a:
        '这是刻意做的渐隐,不是画丢了。鼠标在高回报率下每秒产生上千个点,画满十几秒之后' +
        '整个区域会糊成一团黑,反而看不清轨迹的形状。渐隐让最近的轨迹最清楚,' +
        '而分析用的数据一直在缓冲区里,不受影响。',
    },
  ] as TrailFaqItem[],

  // -------------------------------------------------------------------------
  // 以下都是 `<script>` 里拼出来的句子。整句一个键,占位符由 `fill()` 填。
  // 它们走 `setText`,**不带 `**` 标记**(见文件头)。
  // -------------------------------------------------------------------------

  /** `<script>` 里那几个字面量。**它们不是正文,但都是用户看得见的字** */
  runtime: {
    /** 轴方向的两种说法。方向带里加入用的连接符,以及逐条表的判定列 */
    axisHorizontal: '水平',
    axisVertical: '垂直',
    axisJoiner: '、',
    /** 逐条笔画表「判定」列的三档 */
    strokeVerdictNotJudged: '斜的,不判',
    strokeVerdictSnapped: '吸附',
    /** 「轴偏离」那一格。`{deg}` 是已经格式化好的角度,`°` 是单位 */
    strokeAxisDeviation: '{deg}°',

    // ---- 画圈模式:查丢帧 ----

    /** 一段太短 / 停顿太多,取不到足够的连续运动 */
    jumpsTooShort: '这一段太短或停顿太多,没能取到足够的连续运动,请多画几圈。',
    /** 采样点太少 */
    jumpsTooFewSamples: '采样点太少,不足以判断轨迹的平滑度。',
    /** 全部在门槛以内(没跳变)。`{steps}` / `{threshold}` / `{maxStep}` */
    jumpsAllWithin:
      '{steps} 个相邻间隔全部在门槛({threshold} px)以内,' +
      '最大的一次也只有 {maxStep} px。这段轨迹是连续的。',
    /** 有超线但一个都不孤立 —— 是一整段隆起,不是丢帧 */
    jumpsAllClustered:
      '有 {jumps} 个间隔超过门槛({threshold} px),' +
      '但它们全是连着出现的,连成一个整体的隆起——这个形状对应的是"手甩快了",' +
      '不是丢帧。想确认的话,下回把速度压匀再画一遍。',
    /** 有孤立尖峰(标题那个数)。判读权留给用户 */
    jumpsIsolated:
      '共 {steps} 个相邻间隔,其中 {jumps} 个超过门槛 ' +
      '({threshold} px),这里面有 {isolated} 个是孤立的' +
      '——左右两个邻居都没超线,最大的一次 {maxStep} px。' +
      '孤立尖峰是丢帧的形状;如果你当时确实是匀速画的,那这几处就是传感器漏了计数。',

    // ---- 直线模式:查角度吸附 ----

    /** 一段笔画都没切出来(靠停顿切段) */
    strokesNone: '没找到成形的笔画。每条线之间停一下再画下一条 —— 页面靠这个停顿把笔画切开。',
    /** 切出段了但都太短。`{segments}` 是段数 */
    strokesTooShort:
      '切出了 {segments} 段,但都太短(不足 100px 或采样太少),量不出形状。把线画长一点。',
    /** 近轴笔画不到 3 条,给不出结论。`{near}` 是近轴笔画数 */
    strokesInconclusive:
      '只画出了 {near} 条近轴笔画,不到 3 条给不出结论 —— ' +
      '一条说明不了问题,只能说明运气。再画几条横的和竖的。',
    /** 近轴够多,但看不出吸附。`{near}` / `{snapped}` */
    strokesNoSnap:
      '{near} 条近轴笔画里,只有 {snapped} 条直到了' +
      '人手做不到的程度,看不出固件在拉直线。',
    /** 疑似吸附。判定不可信,所以把话说完并把判读权交回用户 */
    strokesSnapped:
      '{near} 条近轴笔画里有 {snapped} 条严格贴在轴上' +
      '(最大残差小于 0.35px,人手做不到)。但先别下结论:这个判定只在' +
      '"线够长、画的时候手也确实在抖"时才可信 —— 手抖是亚像素的,取整之后' +
      '可能被整个抹平,那样一条手画的线也会显示成严格贴轴。短笔画尤其容易误判' +
      '(实测 31 个采样、手抖 0.2px 时误判率约 27%)。' +
      '所以请看上面那张表里每条线自己的残差,别只看这个结论。',

    // ---- 静止漂移:「判定」那一格的每一档 ----

    driftPreparing: '准备中',
    driftMeasuring: '测量中',
    driftNoSignal: '没收到信号',
    driftCompletelyStill: '完全静止',
    driftCannotMeasure: '测不出来',
    driftMostlyStill: '基本静止',
    driftHasDrift: '有漂移',

    // ---- 静止漂移:提示条每一档 ----

    /** `arming`:让用户先晃一下确认信号 */
    driftHintArmed: '把鼠标在这个页面上轻轻晃一下,先确认页面收得到信号…',
    /** `settling`:收到信号了,等用户停手 */
    driftHintSettling: '好,现在停手,把手离开鼠标…',
    /** `measuring`:倒计时。`{seconds}` 是剩余秒数 */
    driftHintRunning: '正在测,别碰鼠标… 还剩 {seconds} 秒',
    /** 一直等不到采样。`{seconds}` 是超时的秒数。**不能说成「静止」** */
    driftHintTimeout:
      '这 {seconds} 秒里页面一个鼠标事件都没收到,' +
      '所以这次测不出任何结果——注意这不是"鼠标很安静"。' +
      '请确认指针在浏览器窗口内、鼠标确实接上了,再试一次。',
    /** 收到 0 个采样 —— 这是最好的结果,不是「没数据」 */
    driftHintStill:
      '这 5 秒里传感器一个计数都没产生,这是最好的结果。' +
      '换几个不同的位置和方向再测两次更保险。',
    /** `measureDrift` 返回 null(数据异常) */
    driftHintError: '数据异常,请重新测一次。',
    /** 有极少量漂移。`pathPx <= 2`,基本算静止 */
    driftHintMostlyStill:
      '收到的采样很少,基本可以认为是静止的——剩余的一点点多半是桌面振动或手没完全离开。',
    /** 确实有漂移。`{samples}` / `{path}` */
    driftHintDrift:
      '这 5 秒里传感器产生了 {samples} 个计数,累计走了 {path} px。' +
      '如果手确实已经完全离开鼠标,那说明传感器在自激或受表面干扰——换一块鼠标垫再测一次。',
  },
};

export const trailEn: typeof trailZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'trail-test',
  metaTitle: 'Mouse trail test — check smoothness, jitter and dropped frames',
  metaDescription:
    'Draw a mouse trail online and check whether the sensor drops frames, jitters or drifts, and how well the mousepad suits the sensor.',

  h1: 'Mouse trail test',
  lede:
    'Draw **ten-odd even circles** in the area below and watch whether the line comes out round. ' +
    'The page counts how many **isolated spikes** the trail holds — places where the distance ' +
    'between two neighbouring samples suddenly jumps while both sides stay normal — and checks ' +
    'whether the sensor produces counts of its own while the mouse sits completely still ' +
    '(**static drift**).',

  noticePoints: [
    '**“The distance between two samples grew” is not the same as a dropped frame**: a skipped ' +
      'count and a fast flick look identical in the data. So this page counts the **shape** — an ' +
      'isolated spike poking out of a run of even, small steps is the suspect; a whole stretch that ' +
      'grows together is your hand.',
    'The mousepad matters too. On glass, plain white paper or a very glossy desk most mice get ' +
      'noticeably worse — if the result looks poor, switch to a dark cloth pad and test again.',
  ],

  modeLabel: 'Mode',
  modeLoop: 'Circles · check drops',
  modeLine: 'Lines · check angle snapping',

  drawStart: 'Start drawing',
  drawStop: 'Stop drawing',
  drawRestart: 'Start again',
  clear: 'Clear trail',

  overlayLoop: 'Click “Start drawing”, then draw ten-odd even circles here',
  overlayLine:
    'Click “Start drawing”, then draw several horizontal and vertical lines here, pausing between each',

  hintLoopIdle: 'Once you start, draw even circles in this area',
  hintLineIdle: 'Draw a few horizontal and vertical lines, pausing between each',
  hintLoopDrawing: 'Draw ten-odd even circles, then click “Stop drawing”',
  hintLineDrawing: 'Draw a few horizontal and vertical lines, pausing between each',

  verdictLabelLoop: 'Isolated spikes',
  verdictLabelLine: 'Judged snapped',
  verdictUnitLoop: '',
  verdictUnitLine: '',
  verdictNoteIdle: 'After you finish, click “Stop” or release and the statistics appear here',

  badges: {
    idle: 'Waiting to draw',
    drawing: 'Drawing',
    tooFewStrokes: 'Too few strokes',
    inconclusive: 'Cannot judge yet',
    noSnapping: 'No snapping seen',
    snapping: 'Suspected snapping',
    insufficient: 'Not enough data',
    noJumps: 'No jumps found',
    noIsolated: 'No isolated spikes',
    isolated: 'Isolated spikes — compare them yourself',
  },

  stats: {
    samples: { label: 'Samples', hint: '' },
    duration: { label: 'Analysis span', unit: 'ms', hint: 'the longest continuous movement' },
    overCount: { label: 'Over-threshold gaps', hint: 'includes runs; denominator only' },
    medianStep: { label: 'Median step', unit: 'px', hint: 'the typical gap between two samples' },
    maxStep: { label: 'Largest step', unit: 'px', hint: '' },
    snapStrokes: { label: 'Valid strokes', hint: 'long enough and sampled enough to count' },
    snapNear: { label: 'Near-axis strokes', hint: 'within 15° of an axis' },
    snapHit: { label: 'Judged snapped', hint: 'on-axis, with a max residual under 0.35px' },
    snapAxes: { label: 'Axes found', hint: '' },
    driftSamples: { label: 'Samples while still', hint: 'a good mouse should show 0' },
    driftPath: { label: 'Total travel', unit: 'px', hint: 'the total of the back-and-forth jitter' },
    driftSpan: { label: 'Jitter span', unit: 'px', hint: 'the distance between the two furthest points' },
    driftVerdict: { label: 'Verdict', hint: '' },
  },

  strokeColumns: {
    index: '#',
    direction: 'Direction',
    length: 'Length',
    axisDeviation: 'Axis off',
    maxResidual: 'Max residual',
    verdict: 'Verdict',
  },

  metricsHeading: 'How to read these numbers',
  metricColumns: { metric: 'Metric', look: 'What to look at', note: 'Notes' },
  metrics: [
    {
      metric: 'Isolated spikes',
      look: 'the shape of a dropped frame',
      note:
        'It exceeds the threshold while **neither neighbour does**. One large step inserted into a ' +
        'run of even small ones is exactly what a dropped frame looks like. The first and last ' +
        'steps have a neighbour on one side only and take no part in the judgement.',
    },
    {
      metric: 'Over-threshold gaps',
      look: 'a denominator, not a conclusion',
      note:
        'The total number of gaps over the threshold, **counting runs along with the rest**. When ' +
        'you flick evenly the normal gaps go over the threshold in whole runs, so on its own it ' +
        'proves nothing — read it against the isolated spikes: if the two are about equal, the ' +
        'over-threshold gaps are mostly spikes; if there are many gaps and 0 isolated spikes, you ' +
        'were simply drawing fast.',
    },
    {
      metric: 'Median step',
      look: 'smoothness',
      note:
        'When you draw at a steady speed it is roughly “how far each sample travels”. The number ' +
        'is neither good nor bad in itself — it depends how fast you draw and how high the mouse’s ' +
        'polling rate is. Its use is as a baseline, which is the threshold above: the threshold is ' +
        '**{factor} times the median step and no lower than {floor} pixels**. Both conditions are ' +
        'needed: with only the multiplier, a slow move gives a median step of a fraction of a ' +
        'pixel and the slightest wobble floods the screen with “dropped frames”; with only the ' +
        'absolute value, the normal gaps of a fast flick all go over the threshold too.',
    },
    {
      metric: 'Largest step',
      look: 'whether there is a sudden change',
      note:
        'Compare it with the threshold. If the largest step is only a little above the threshold ' +
        'it is mostly hand tremor; if it is several times higher, that one really was abnormal.',
    },
  ],

  driftHeading: 'Static drift: test it on its own, hand off the mouse',
  driftLede:
    'A trail test only shows whether something is wrong “while you move”. Another common sensor ' +
    'fault is **failing to sit still**: the mouse is resting on the desk untouched and the cursor ' +
    'creeps along by itself. That has to be tested on its own, by leaving the mouse alone.',
  driftStart: 'Start the still test (5 s)',
  driftHintIdle: 'Once you start, shake the mouse once to confirm the signal, then stop',
  driftZero:
    'The rule is blunt: **if the mouse sends no reports, no events are dispatched**, so a mouse ' +
    'with no self-oscillation should show **0** samples when it is completely still. If samples do ' +
    'arrive, the sensor is moving — either self-oscillating, or disturbed by the surface (glass, ' +
    'reflections, dust, desk resonance).',
  driftAmbiguity:
    'But “0 samples” is ambiguous in itself: if the pointer is not in the browser window at all, ' +
    'or the mouse is not plugged in, the page receives no events either — identical in the data ' +
    'to “a very quiet mouse”, and the opposite conclusion. So the flow adds one step: **you shake ' +
    'the mouse once first, to confirm the page really receives a signal** (those samples are then ' +
    'discarded and not counted), and only then wait for you to stop. Only after that does “0” ' +
    'really mean still. If no signal ever arrives, the page says “no signal” outright rather than ' +
    'judging it still for you.',
  driftHandOff:
    'One thing to be clear about: **a hand on the mouse does not count**. A heartbeat, breathing, ' +
    'even the desk being knocked, all move the mouse through your hand — and what you measure is ' +
    'your hand, not the mouse. So either take your hand right off, or rest one finger on it ' +
    'lightly without pressing.',

  limitsHeading: 'What a trail test cannot tell you',
  limitsPoints: [
    '**A browser cannot see the sequence numbers of mouse reports.** A dropped frame is “there ' +
      'should have been 8 reports and only 7 arrived”, and all the browser sees is the ones it ' +
      'received — it does not know there should have been 8. So “did frames drop?” is a question a ' +
      'web page cannot answer directly at all; it can only look for clues in the shape of the ' +
      'trail — and a clue is not proof.',
    '**The sensor’s own “acceleration” and “smoothing” cannot be measured either.** Some mice ' +
      'interpolate, debounce or accelerate the raw data in firmware to make the drawn line look ' +
      'smoother, at the cost of wiping out real tiny movements. A web page sees neither; only a ' +
      'raw-data comparison can expose them.',
  ],

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'Is a “jump” just a dropped frame?',
      a:
        'No — **a jump the page catches has two possible causes, and the browser cannot tell them ' +
        'apart**. One is that the sensor skipped a few counts, which really is a dropped frame; the ' +
        'other is that your hand really did flick fast, and that far apart is exactly how far two ' +
        'samples should be. Both look the same in the data: “the distance between two neighbouring ' +
        'samples is unusually large”, and no field can separate them. So this page says “jump”, ' +
        'never “dropped frame”.',
    },
    {
      q: 'So how do I tell which one it is?',
      a:
        'Look at the shape, not the total. A dropped frame is “one isolated large gap inserted ' +
        'into a run of even small ones”, like a spike; a fast flick makes a whole run of gaps grow ' +
        'together, a single broad bump. That is exactly how the page works: the headline figure ' +
        'counts only “isolated spikes” (a sample over the threshold with neither neighbour over ' +
        'it), leaving the runs out. So the right way to use it is to draw a dozen-odd even ' +
        'circles — if isolated spikes keep appearing, that is a dropped frame; if there are many ' +
        'over-threshold gaps and 0 isolated spikes, you were drawing fast.',
    },
    {
      q: 'Why does the still-drift test ask me to take my hand off the mouse?',
      a:
        'Because what it measures is “does the sensor produce counts of its own when the mouse is ' +
        'completely still”. With your hand on the mouse, the tiny movement from your heartbeat ' +
        'and breathing gets counted — and that is not the sensor, that is your hand moving. So ' +
        'either take your hand right off, or rest one finger on it lightly without pressing.',
    },
    {
      q: 'Why does the trail fade away on its own?',
      a:
        'That is a deliberate fade, not the drawing being lost. At a high polling rate a mouse ' +
        'produces thousands of points a second, and after a dozen-odd seconds the whole area would ' +
        'be a smear of black that hides the shape of the trail. The fade keeps the most recent ' +
        'trail clearest, and the data used for analysis stays in the buffer, unaffected.',
    },
  ],

  runtime: {
    axisHorizontal: 'Horizontal',
    axisVertical: 'Vertical',
    axisJoiner: ', ',
    strokeVerdictNotJudged: 'angled, not judged',
    strokeVerdictSnapped: 'snapped',
    strokeAxisDeviation: '{deg}°',

    jumpsTooShort:
      'This stretch was too short or too full of pauses to get enough continuous movement; draw a ' +
      'few more circles.',
    jumpsTooFewSamples: 'Too few samples to judge how smooth the trail is.',
    jumpsAllWithin:
      'All {steps} neighbouring gaps are within the threshold ({threshold} px), and the largest ' +
      'was only {maxStep} px. This stretch of trail is continuous.',
    jumpsAllClustered:
      'There are {jumps} gaps over the threshold ({threshold} px), but they all occur in a run, ' +
      'joining into one broad bump — that shape means “you flicked fast”, not a dropped frame. To ' +
      'confirm, draw again next time at a steadier speed.',
    jumpsIsolated:
      '{steps} neighbouring gaps in all, {jumps} of them over the threshold ({threshold} px), and ' +
      '{isolated} of those isolated — neither neighbour over the line, the largest {maxStep} px. ' +
      'An isolated spike is the shape of a dropped frame; if you really were drawing at a steady ' +
      'speed, those are the sensor missing counts.',

    strokesNone:
      'No formed strokes found. Pause between each line before drawing the next — the page cuts ' +
      'the strokes apart on that pause.',
    strokesTooShort:
      '{segments} segments were cut, but all too short (under 100px, or too few samples) to ' +
      'measure a shape. Draw longer lines.',
    strokesInconclusive:
      'Only {near} near-axis strokes were drawn, and fewer than 3 gives no conclusion — one ' +
      'proves nothing, only luck. Draw a few more horizontal and vertical lines.',
    strokesNoSnap:
      'Of {near} near-axis strokes, only {snapped} came straight enough that a hand could not ' +
      'have done it, so there is no sign of the firmware pulling a line straight.',
    strokesSnapped:
      'Of {near} near-axis strokes, {snapped} sit strictly on the axis (max residual under ' +
      '0.35px, which a hand cannot do). But do not conclude yet: this judgement is only ' +
      'trustworthy when “the line is long enough and your hand really was trembling while ' +
      'drawing” — hand tremor is sub-pixel and rounding can wipe it out entirely, so a hand-drawn ' +
      'line can show as strictly on-axis too. Short strokes are especially easy to misjudge ' +
      '(measured: with 31 samples and 0.2px of tremor the misjudgement rate is about 27%). So ' +
      'look at each line’s own residual in the table above, not just this conclusion.',

    driftPreparing: 'Getting ready',
    driftMeasuring: 'Measuring',
    driftNoSignal: 'No signal',
    driftCompletelyStill: 'Completely still',
    driftCannotMeasure: 'Cannot measure',
    driftMostlyStill: 'Basically still',
    driftHasDrift: 'Drifting',

    driftHintArmed: 'Shake the mouse lightly on this page to confirm the page receives a signal…',
    driftHintSettling: 'Good, now stop and take your hand off the mouse…',
    driftHintRunning: 'Measuring — do not touch the mouse… {seconds}s left',
    driftHintTimeout:
      'In these {seconds} seconds the page received not one mouse event, so this run measures ' +
      'nothing — note that this is not “a very quiet mouse”. Check that the pointer is inside the ' +
      'browser window and the mouse really is connected, then try again.',
    driftHintStill:
      'The sensor produced not one count in these 5 seconds — the best possible result. Test ' +
      'twice more from different positions and directions to be safer.',
    driftHintError: 'Abnormal data — please measure again.',
    driftHintMostlyStill:
      'Very few samples arrived, so it can basically be called still — the little that is left is ' +
      'most likely desk vibration or a hand not quite off.',
    driftHintDrift:
      'The sensor produced {samples} counts in these 5 seconds, travelling {path} px in total. If ' +
      'your hand really was completely off the mouse, the sensor is self-oscillating or being ' +
      'disturbed by the surface — try again on another mousepad.',
  },
};
