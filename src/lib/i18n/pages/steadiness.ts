/**
 * 手稳度定靶测试页(`/steadiness-test/`)的文案。
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
 * `steadinessEn` 声明成 `typeof steadinessZh` —— 英文版漏一个键、拼错一个键、
 * 多出一个键,都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 这一页的立场:测的是**指针**的漂移,不是手的
 *
 * 指针已经被操作系统的平滑与(如果开着的)加速度处理过一遍,所以这里的读数是
 * `estimate` 而不是 `exact`,而且**只适合同一台机器前后对比** —— 同一个数在
 * 800 DPI 和 3200 DPI 下差四倍。译文里不能把这一层弱化成一句泛泛的"仅供参考":
 * 它是这一页不给分数、不给及格线、不给跨设备比较的全部理由。
 *
 * ## 带 `**强调**` 的段落
 *
 * 模板里原来是 `<strong>…</strong>`,搬进目录时按仓库的约定改写成 `**…**`,
 * 所以句子是完整的、没有为了加粗被切成碎片。渲染走 `faq.ts` 的 `faqHtml()`
 * (和 FAQ 答案同一套)。
 *
 * **那几个 `<strong>` 不只出现在正文里。** `steadyPoints` 那一节住在
 * `<section class="prose prose--cards">` 里,而 `.prose--cards li > strong:first-child`
 * 会把每条开头的那个 `<strong>` 显示成卡片标题 —— 所以 `**` 必须留在**开头**
 * 那一句上,不能顺手动到句子中间。`readingRows[].note` 里那几处句中 `**` 同理
 * (那三个是"总 / 最远两点 / 最好的结果",是句子里的强调,不是卡片标题)。
 *
 * ## 三个阶段,提示语是三套(整页最容易被漏掉的部分)
 *
 * 这一页的流程是 `idle → arming → settling → measuring`(`missed` 是出圈那一下),
 * 每一段都会同时改写**三处文字**:那枚徽章(`badges.*`)、判定横幅下面那句说明
 * (`runtime.note*`)、以及控件行那行小提示(`hint*`)。它们**互不复用**:同一个
 * 阶段里三处说的是三句不同的话,所以键也是分开的。
 *
 * | 阶段 | 徽章 | 说明 | 小提示 |
 * | --- | --- | --- | --- |
 * | `idle`(首屏 / 复位) | `badges.idle` | `verdictNoteIdle` | `hintIdle` |
 * | `arming` 等进靶心 | `badges.arming` | `runtime.noteArming` | `hintArming` |
 * | `settling` 等停手 | `badges.settling` | `runtime.noteSettling` | `hintSettling` |
 * | `measuring` 真正的 5 秒 | `badges.measuring` | `runtime.noteMeasuring` | `hintMeasuring` |
 *
 * `hintIdle` 和 `verdictNoteIdle` **各有两个出口**:首屏的模板,和 `endRound()` /
 * `resetReadouts()` 复位时写回去的那一次 —— 一处键,两处填,不要写成两份。
 *
 * ## 运行期填的占位符
 *
 * | 占位符 | 在哪 | 填什么 |
 * | --- | --- | --- |
 * | `{seconds}` | `lede1` / FAQ 第 4 条 / `runtime.noteMeasuring` / `noteStill` / `noteResult` | `HOLD_MS / 1000`,即那一轮的秒数(现在是 5) |
 * | `{armSeconds}` | `runtime.noteTimeout` | `ARM_TIMEOUT_MS / 1000`,等指针进靶心的上限(现在是 20) |
 * | `{path}` | `runtime.noteResult` | 这一轮的累计路程(`drift.pathPx.toFixed(1)`) |
 * | `{span}` | `runtime.noteResult` | 这一轮的抖动幅度(`drift.spanPx.toFixed(1)`) |
 *
 * 每句都**整句住在一个键里**,由页面 `fill()` 填 —— 不在句子中间断开,理由同别页。
 *
 * `runtime.noteResult` **刻意只装那句数据**,后面接的那句结论是另一个键
 * (`noteResultRecord` / `noteResultCompare`,**二选一追加**):它们是两句各自
 * 完整的话(中间本来就是一个句号),硬并进一条会逼出两个键之间的字符串拼接。
 *
 * ## 刻意写死的散文(改常量时要一起改)
 *
 * 下面这些在源模板里本来就是写死的中文,不是占位符 —— 同 `dpi.ts` 里那条
 * 「`1 厘米` 是散文不是占位符」:
 *
 * - `stats.samples.hint` 和 `readingRows[2].note` 里的 **`5 秒`**(= `HOLD_MS / 1000`);
 * - FAQ 第 3 条里的 **`110 像素`**(= 页面 `<style>` 里 `.steady-target` 的
 *   `width: 110px`,靶心半径就是它的 `getBoundingClientRect().width / 2`);
 * - FAQ 第 3 条里的 **`5 秒`**、FAQ 第 1 条里的 **`800 DPI` / `3200 DPI`** 和
 *   **`82 分`**(都是举例,页面上没有对应常量)。
 *
 * 上面这些**一处都不能改成占位符**:原文页面上它们就是散文,改成 `{…}` 等于凭空
 * 造一个"这一页会算它"的承诺。
 *
 * ## 两套引号,是**原样**保留的差异,不要统一
 *
 * - FAQ 与正文里的引号是 **ASCII `"…"`**(`不给"及格线"`、`比"最远漂了多少"`、
 *   `"先移动进靶心"`);
 * - 模板与 `<script>` 里那几句「点『开始挑战』」用的是**弯引号 `“…”`**。
 *
 * 两边目录里各自照抄,别顺手抹平成一种 —— 这不是排版疏忽,是源文件本来就这样。
 *
 * ## 那些名字要和别处对上(翻译时按同一条线索走)
 *
 * - `readingRows[].metric` 那三个名字(**累计路程** / **抖动幅度** / **采样点数**)
 *   就是 `verdictLabel` 和 `stats.span.label` / `stats.samples.label` —— 表格是
 *   手写的 `<td>`,不是从 `StatPanel` 派生的,**所以这里有两处,必须译成同一个词**
 *   (同 `dpi.ts` 里「`errors[2]` 指的是 `stats.drift.label`」那条)。
 * - FAQ 第 2 条和 `steadyPoints[0]` 都提到了轨迹测试页里的 **「静止漂移」**,
 *   两处要译成同一个名字。
 *
 * ## 不在这一份里的东西
 *
 * - 源文件里的代码注释(中英混着的那些)是给开发者看的,不是用户文案。
 * - `throw new Error('测试区未就绪')` 是开发者字符串,不面向用户,不进目录。
 * - `#live-left` 首屏那个 **`5.0`** 是一个数值(`(HOLD_MS / 1000).toFixed(1)`),
 *   不是文案;那行末尾的 `秒 · …` 才是(`liveLabel`)。
 * - `<div id="cap-notice">` 里那几条能力告警由 `ui.ts` 的
 *   `mountCapabilityNotices()` 渲染,住的是 `zh.ts` 的公共命名空间,不在这里
 *   (这一页传的是 `{ timing: false }`,一条定时告警都不发)。
 */

/** FAQ 一行的形状。**文案两边键必须一样**,见文件头 */
export interface SteadinessFaqItem {
  q: string;
  a: string;
}

/**
 * 「怎么读这些数」那张表的一行。
 *
 * 第一列 `metric` 和 `verdictLabel` / `stats.*.label` 说的是同一批名字,
 * **必须译成同一个词** —— 见文件头。
 */
export interface SteadinessReadingRow {
  metric: string;
  check: string;
  note: string;
}

export const steadinessZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'steadiness-test',
  /** 页面自己的 `<title>` / meta description。**和 `tools.ts` 里那份逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '鼠标手稳度测试 - 定靶挑战,测量指针漂移',
  metaDescription:
    '把指针停进靶心里保持几秒,测量这段时间指针漂移了多远。它会先等你停手再开始计时,所以量到的确实是"停住之后的漂移"。读数是估算:指针已经被系统的平滑与加速处理过一遍,只适合同一台机器前后对比。',

  h1: '鼠标手稳度定靶挑战',
  /**
   * `<h1>` 下面那两段正文。**`{seconds}` 是这一轮的秒数**(`HOLD_MS / 1000`),
   * 见文件头。
   */
  lede1:
    '点开始,把指针移进靶心,然后**尽量别动**——页面会等你停手,' +
    '再记满 {seconds} 秒,量这段时间里指针一共漂了多远。' +
    '**中途指针出圈就作废重来**。',
  lede2:
    '要看的是**累计路程**:指针来回微抖多少下,都会一格一格累加上去,' +
    '比"最远漂了多少"更能反映手有多稳。它测的是**指针**的稳定度 —— ' +
    '指针已经被系统平滑和加速处理过一遍,所以里面混着系统的账,只适合同一台机器前后对比。',

  /** 控件行那两颗按钮 */
  start: '开始挑战',
  giveUp: '放弃这一轮',

  /**
   * 控件行末尾那行小提示的**四个状态**。`hintIdle` 有两个出口(首屏模板 +
   * `endRound()` 复位),见文件头那张表。
   */
  hintIdle: '点开始后把指针移进靶心,然后停手',
  hintArming: '把指针移进圆里,然后停手…',
  hintSettling: '保持不动…',
  hintMeasuring: '别动…',

  /** 测试面中间那句提示(开测后由脚本 `hidden` 收起,文字不变) */
  overlay: '点“开始挑战”,然后把指针移进中间的圆里',
  /** 测试面里那行倒计时。`#live-left` 那个数是脚本写的,**这里只有它后面那截** */
  liveLabel: '秒 · 保持住,别出圈',

  /** 判定横幅左边那个标签 */
  verdictLabel: '累计路程',
  /** 判定横幅那个数后面的单位 */
  verdictUnit: 'px',
  /** 判定横幅下面那句说明的**空态**(首屏与复位共用,见文件头) */
  verdictNoteIdle: '点“开始挑战”,把指针移进靶心,然后尽量别动',
  /** 没数据时那个破折号 —— 判定横幅和几格读数共用 */
  dash: '—',

  /**
   * 右上角那枚徽章。**一档一个键**,阶段之间的对应关系见文件头那张表。
   * 颜色档(`good` / `idle` / `poor`)由页面按阶段给,不在目录里。
   */
  badges: {
    idle: '等待开始',
    arming: '等你进靶心',
    settling: '等指针停下',
    measuring: '测量中',
    missed: '出圈了',
    timeout: '没等到',
    still: '纹丝未动',
    failed: '测不出来',
    record: '刷新纪录',
    done: '完成',
    gaveUp: '已放弃',
    interrupted: '已中断',
  },

  /** 四格读数。`hint` 为空串表示那一格没有说明;`unit` 只有两格有 */
  stats: {
    span: { label: '抖动幅度', unit: 'px', hint: '最远两点之间的距离' },
    samples: { label: '采样点数', hint: '5 秒里指针动了多少下' },
    best: { label: '最好成绩', unit: 'px', hint: '越小越稳,只存在本机' },
    rounds: { label: '有效轮数', hint: '作废的不计' },
  },

  readingHeading: '怎么读这些数',
  /** 那张表的三个表头 */
  readingColumns: { metric: '指标', check: '看什么', note: '说明' },
  /**
   * 表格三行。**第一列和 `verdictLabel` / `stats.*.label` 是同一批名字**,
   * 见文件头;`note` 里那几处 `**…**` 是句中强调(不是卡片标题)。
   */
  readingRows: [
    {
      metric: '累计路程',
      check: '手稳不稳',
      note:
        '这段时间里指针走过的**总**距离。手不动时指针会因为手抖、桌面振动、' +
        '传感器噪声在几个像素的范围里来回走,每一下都算进去 —— ' +
        '所以它比"最远漂了多少"灵敏得多,也是这一页的主指标。',
    },
    {
      metric: '抖动幅度',
      check: '抖成了什么样',
      note:
        '所有采样点里**最远两点**的距离。它和累计路程要一起看:' +
        '累计路程大而幅度小,说明指针在原地高频微抖;两个都大,说明手是真的在挪。',
    },
    {
      metric: '采样点数',
      check: '指针动了多少下',
      note:
        '0 是**最好的结果**——那说明传感器在这 5 秒里一个计数都没产生。' +
        '但这个 0 只有在走完了"先移动进靶心"那一步之后才有意义,理由见下面的 FAQ。',
    },
  ] as SteadinessReadingRow[],

  scoringHeading: '定靶为什么不算分',
  scoringP1:
    '这一页刻意**不给分数、不给等级、不给及格线**。' +
    '换算成"手稳度 82 分"需要一套权重,而那套权重是编出来的 —— ' +
    '本站不为这种事编数字。能说的只有:这次比上次稳,或者没有。',
  scoringP2:
    '还有一个更实际的理由:同样一段手抖,在 800 DPI 和 3200 DPI 下走出的像素数差四倍。' +
    '所以那个数**只和你自己的历史成绩比**,而且最好在同一个 DPI 设置下比。',

  steadyHeading: '如果想更稳',
  /** 三条。**开头的 `**…**` 是卡片标题**,见文件头 */
  steadyPoints: [
    '**先排除鼠标自己有问题。**去轨迹测试页做一次「静止漂移」,' +
      '把手完全离开鼠标再测 —— 那一步测的是鼠标会不会自己爬。鼠标自己在动的话,' +
      '后面练什么都是白练。',
    '**换一块深色布垫再测一次。**玻璃、纯白纸、太光滑的桌面上,' +
      '大多数鼠标的读数都会明显变差。',
    '**别悬着手腕。**这一条不是这个页面教的,但这是这个页面能量出来的:' +
      '手臂有支撑时测一次、悬空时再测一次,两个数会差很远。',
  ] as string[],

  faqHeading: '常见问题',
  faq: [
    {
      q: '这个数越小越好吗?多少算好?',
      a:
        '**越小越稳,但不给"及格线"。**原因有两个:第一,这个数和你鼠标的 DPI 绑在一起 —— ' +
        'DPI 越高,同样的手抖会走出更多像素,所以在 800 DPI 下很漂亮的成绩,' +
        '换到 3200 DPI 就会难看一大截;第二,它还和你握鼠标的姿势、手臂有没有支撑有关。' +
        '所以这一页只做**同机前后对比**:和上次比、和换鼠标垫之前比。' +
        '跨设备比一个手抖距离,比的是设备设置,不是手。',
    },
    {
      q: '为什么说是"指针"的漂移,不是鼠标的?',
      a:
        '因为中间隔了一层操作系统。你手上的每一次微小移动,系统会先做**平滑**和' +
        '(如果开着)加速度处理,再变成屏幕上的指针位置。这一页拿到的就是处理之后的结果,' +
        '所以它测的是**整条链路**的稳定度,里面混着系统、驱动和屏幕的账。' +
        '想单独看鼠标硬件有没有自激,请用轨迹测试页里的「静止漂移」那一段 —— ' +
        '那个要求你把手完全离开鼠标。',
    },
    {
      q: '靶子为什么要画这么大?',
      a:
        '因为它不是难度设置,是**一个边界**。指针一旦离开圆,这一轮就作废重来 —— ' +
        '圆太小的话,你会一直在跟边界较劲,而不是在"保持不动"这件事上。' +
        '画成 110 像素直径是让正常的手抖(几个像素)根本碰不到边,' +
        '于是这个圆的存在只是为了保证"这 5 秒里你确实在瞄准同一个点"。',
    },
    {
      q: '为什么按了开始之后要我先动一下?',
      a:
        '因为**"收到 0 个采样"本身是有歧义的**。指针在浏览器窗口外、鼠标没接上,' +
        '页面同样一个事件都收不到,和"你的手稳如磐石"在数据上完全一样,结论却相反。' +
        '所以流程多了一步:先等你把指针移进靶心,确认页面真的收得到信号,再等你停手,' +
        '最后才开始记这 {seconds} 秒。走过这一步之后,0 才真的等于 0。',
    },
  ] as SteadinessFaqItem[],

  // -------------------------------------------------------------------------
  // 以下都是 `<script>` 里写出来的句子。整句一个键,占位符由 `fill()` 填。
  // -------------------------------------------------------------------------

  /**
   * 判定横幅下面那句说明的**六个出口**(空态和首屏那个不在这一组,是
   * `verdictNoteIdle`)。阶段之间的对应关系见文件头那张表。
   */
  runtime: {
    /** `arming`:刚点开始,等指针进靶心 */
    noteArming: '把指针移进中间的圆里。',
    /** `settling`:指针进来了,等它停下 */
    noteSettling: '好,现在尽量别动,我确认一下你停手了就开测。',
    /** `measuring`:真正的 5 秒窗口。`{seconds}` 是这一轮的秒数 */
    noteMeasuring: '保持住,{seconds} 秒。',
    /** 出圈作废 */
    noteMissed: '指针离开了圆,这一轮作废。点“开始挑战”重来。',
    /** 一直没等到指针进靶心。`{armSeconds}` 是那个上限 */
    noteTimeout:
      '这 {armSeconds} 秒里指针一直没有进到圆里。' +
      '请确认指针在浏览器窗口内、鼠标真的接上了,再试一次。',
    /**
     * 这一轮收到 0 个采样。**这是最好的一档,不是"没数据"** —— 走到这里说明
     * `arming` 阶段确实收到过信号,所以此刻的 0 是"真的纹丝未动"。
     * 别和 `noteFailed` 弄混(那一条是 `measureDrift` 返回 `null`)。
     */
    noteStill: '这 {seconds} 秒里传感器一个计数都没产生 —— 这是最好的一档,没有更好的了。',
    /** `measureDrift` 返回 `null`(样本不足),和 `noteStill` 是两回事 */
    noteFailed: '数据异常,请重新测一次。',
    /**
     * 这一轮的数据句。**结尾那句结论是下面两个键二选一追加的**,
     * 见文件头。`{path}` / `{span}` 是这一轮的两个读数
     */
    noteResult: '这 {seconds} 秒里指针走了 {path} px,最远的两点相距 {span} px。',
    /** 追加:刷新了本机最好成绩 */
    noteResultRecord: '这是你在本机的最好成绩。',
    /** 追加:没有刷新纪录 */
    noteResultCompare:
      '要跟别的成绩比,只能比本机历史 —— 这个数和 DPI 绑在一起,跨设备比不出手稳不稳。',
    /** 用户自己按了「放弃这一轮」 */
    noteGaveUp: '这一轮自己结束了,没有计入成绩。点“开始挑战”重来。',
    /** 窗口失焦:后台标签页里计时会停,继续测出的数不可信 */
    noteInterrupted:
      '页面切走了,这一轮作废(后台标签页里计时会停,继续测出的数不可信)。',
  },
};

export const steadinessEn: typeof steadinessZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'steadiness-test',
  metaTitle: 'Mouse steadiness test — hold a target and measure pointer drift',
  metaDescription:
    'Hold the pointer inside the target for a few seconds and measure how far it drifted in that time. It waits for your hand to stop before the clock starts, so what you measure really is the drift after you stopped. The reading is an estimate: the pointer has already been through the system’s smoothing and acceleration, so it is only good for comparing the same machine before and after.',

  h1: 'Mouse steadiness target challenge',
  lede1:
    'Click start, move the pointer into the target, then **keep as still as you can** — the page ' +
    'waits for your hand to stop, then times {seconds} seconds and measures how far the pointer ' +
    'travelled in that stretch. **If the pointer leaves the circle mid-round the round is void — ' +
    'start over.**',
  lede2:
    'The figure to watch is **total travel**: every little tremor back and forth adds up notch by ' +
    'notch, which says more about a steady hand than “how far did it drift at most”. It measures ' +
    'how steady the **pointer** is — the pointer has already been through the system’s smoothing ' +
    'and acceleration, so the system’s share is mixed in, and it is only good for comparing one ' +
    'machine with itself.',

  start: 'Start challenge',
  giveUp: 'Give up this round',

  hintIdle: 'After you click start, move the pointer into the target, then stop moving',
  hintArming: 'Move the pointer into the circle, then hold still…',
  hintSettling: 'Hold still…',
  hintMeasuring: 'Don’t move…',

  overlay: 'Click “Start challenge”, then move the pointer into the circle in the middle',
  liveLabel: 's · hold it, stay in the circle',

  verdictLabel: 'Total travel',
  verdictUnit: 'px',
  verdictNoteIdle: 'Click “Start challenge”, move the pointer into the target, then keep as still as you can',
  dash: '—',

  badges: {
    idle: 'Waiting to start',
    arming: 'Waiting for the target',
    settling: 'Waiting for you to stop',
    measuring: 'Measuring',
    missed: 'Left the circle',
    timeout: 'Never arrived',
    still: 'Perfectly still',
    failed: 'Cannot compute',
    record: 'New record',
    done: 'Done',
    gaveUp: 'Gave up',
    interrupted: 'Interrupted',
  },

  stats: {
    span: { label: 'Tremor span', unit: 'px', hint: 'distance between the two furthest points' },
    samples: { label: 'Samples', hint: 'how many times the pointer moved in 5 seconds' },
    best: { label: 'Best score', unit: 'px', hint: 'lower is steadier; stored on this device only' },
    rounds: { label: 'Valid rounds', hint: 'void rounds are not counted' },
  },

  readingHeading: 'How to read these numbers',
  readingColumns: { metric: 'Reading', check: 'What to look at', note: 'Notes' },
  readingRows: [
    {
      metric: 'Total travel',
      check: 'How steady the hand is',
      note:
        'The **total** distance the pointer covered over this stretch. With your hand still, the ' +
        'pointer still walks back and forth over a few pixels from hand tremor, desk vibration and ' +
        'sensor noise, and every bit of it counts — so it is far more sensitive than “how far did ' +
        'it drift at most”, and it is the main figure on this page.',
    },
    {
      metric: 'Tremor span',
      check: 'What the tremor looks like',
      note:
        'The distance between the **two furthest** of all the sample points. Read it together ' +
        'with total travel: large travel with a small span means the pointer is trembling fast in ' +
        'place; when both are large, the hand is really moving.',
    },
    {
      metric: 'Samples',
      check: 'How many times the pointer moved',
      note:
        '0 is the **best result** — it means the sensor produced not a single count over those ' +
        '5 seconds. But that 0 only means anything once the “move into the target” step has been ' +
        'completed; the reason is in the FAQ below.',
    },
  ],

  scoringHeading: 'Why holding a target gives no score',
  scoringP1:
    'This page deliberately **gives no score, no grade and no pass mark**. Turning it into ' +
    '“steadiness 82/100” needs a set of weights, and those weights would be made up — this site ' +
    'does not invent numbers for that. All it can say is: this run was steadier than the last, or ' +
    'it was not.',
  scoringP2:
    'There is a more practical reason too: the same tremor covers four times as many pixels at ' +
    '3200 DPI as at 800 DPI. So that number is **only worth comparing against your own history**, ' +
    'and ideally at the same DPI setting.',

  steadyHeading: 'If you want to be steadier',
  steadyPoints: [
    '**Rule out the mouse itself first.** Run the “Stationary drift” test on the trail-test page ' +
      'with your hand completely off the mouse — that one measures whether the mouse creeps on its ' +
      'own. If the mouse is moving by itself, any practice afterwards is wasted.',
    '**Try again on a dark cloth pad.** On glass, plain white paper or a very slick desk, most ' +
      'mice read noticeably worse.',
    '**Don’t float your wrist.** This is not something this page teaches, but it is something this ' +
      'page can measure: take one run with your arm supported and another with it floating, and the ' +
      'two numbers come out far apart.',
  ],

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'Is a smaller number better? What counts as good?',
      a:
        '**Steadier is smaller, but there is no pass mark.** Two reasons: first, the number is tied ' +
        'to your mouse’s DPI — the higher the DPI, the more pixels the same tremor covers, so a ' +
        'lovely score at 800 DPI looks far worse at 3200 DPI; second, it also depends on how you ' +
        'grip the mouse and whether your arm is supported. So this page does **same-machine ' +
        'before/after comparisons** only: against last time, against before you changed the ' +
        'mousepad. Comparing a tremor distance across devices compares device settings, not hands.',
    },
    {
      q: 'Why is it the “pointer” drifting and not the mouse?',
      a:
        'Because there is an operating system in between. Every tiny movement of your hand is first ' +
        'put through **smoothing** and (if it is switched on) acceleration by the system, and only ' +
        'then becomes the pointer position on screen. What this page gets is the result after that ' +
        'processing, so it measures how steady the **whole chain** is, with the system’s, the ' +
        'driver’s and the screen’s share mixed in. To look at the mouse hardware alone for ' +
        'self-oscillation, use the “Stationary drift” section on the trail-test page — that one ' +
        'asks you to take your hand completely off the mouse.',
    },
    {
      q: 'Why is the target drawn so big?',
      a:
        'Because it is not a difficulty setting, it is **a boundary**. The moment the pointer ' +
        'leaves the circle the round is void and you start over — and if the circle were small you ' +
        'would be fighting the edge the whole time instead of concentrating on holding still. ' +
        'Drawing it 110 pixels across means normal tremor (a few pixels) cannot reach the edge at ' +
        'all, so the circle is there for one reason only: to make sure you really are aiming at ' +
        'the same point for those 5 seconds.',
    },
    {
      q: 'Why do you want me to move first after I press start?',
      a:
        'Because **“received 0 samples” is ambiguous on its own**. With the pointer outside the ' +
        'browser window, or the mouse not connected, the page also receives not a single event — ' +
        'which is indistinguishable in the data from “your hand was rock steady”, and the ' +
        'conclusion is the opposite. So the flow has an extra step: first it waits for you to move ' +
        'the pointer into the target and confirms the page really is receiving a signal, then it ' +
        'waits for you to stop, and only then does it start timing those {seconds} seconds. Once ' +
        'that step is done, 0 really does mean 0.',
    },
  ],

  runtime: {
    noteArming: 'Move the pointer into the circle in the middle.',
    noteSettling:
      'Good — now keep as still as you can while I confirm you have stopped, then the timing starts.',
    noteMeasuring: 'Hold it, {seconds} seconds.',
    noteMissed: 'The pointer left the circle, so this round is void. Click “Start challenge” to try again.',
    noteTimeout:
      'The pointer never came into the circle in those {armSeconds} seconds. Check that the ' +
      'pointer is inside the browser window and that the mouse really is connected, then try again.',
    noteStill:
      'The sensor produced not a single count over those {seconds} seconds — this is the best ' +
      'possible band; there is nothing better.',
    noteFailed: 'The data looks wrong — please measure again.',
    noteResult:
      'Over those {seconds} seconds the pointer travelled {path} px, and the two furthest points ' +
      'were {span} px apart.',
    noteResultRecord: 'That is your best score on this machine.',
    noteResultCompare:
      'To compare with other scores you can only compare against your own history on this machine ' +
      '— this number is tied to DPI, so comparing across devices says nothing about how steady a ' +
      'hand is.',
    noteGaveUp: 'You ended this round yourself, so it was not counted. Click “Start challenge” to try again.',
    noteInterrupted:
      'The page was switched away, so this round is void (timers stop in a background tab, and ' +
      'numbers measured past that point cannot be trusted).',
  },
};
