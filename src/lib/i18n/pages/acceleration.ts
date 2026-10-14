/**
 * 加速度测试页(`/acceleration-test/`)的文案。
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
 * `accelerationEn` 声明成 `typeof accelerationZh` —— 英文版漏一个键、拼错一个键、
 * 多出一个键,都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 这一页的立场:比的是"同一段物理距离,屏幕上的位移是否一致"
 *
 * 指针加速的意思是"移得越快,系统把位移放大得越多",所以测法是用**慢**和**快**
 * 两种速度各推**同一段物理距离**,再比两次的估算 DPI(像素 ÷ 距离)。
 *
 * **而这一页同时承认"两次速度差得太小时,它分不出有没有加速"**,那不是补一句
 * 免责声明,是这一页全部设计的来源:比值落在哪一档要看两次的速度差有多大,所以
 * 页面把两次的**实际速度**都列出来,让人自己判这个比值是在多大的速度差下得出的。
 * 这一层由三处一起说:
 *
 * | 键 | 说的是什么 |
 * | --- | --- |
 * | `noteSpeedGap` | 速度比不到 2 倍时,主动指出"这组数据得出的『没有加速』不能当数" |
 * | `limitsPoints[0]` | 「测不准的几种情况」第一条:最常见的失效方式 |
 * | `faq[3]` | 「结论说没有,就一定没有吗」 |
 *
 * **译文里不能把它弱化成一句泛泛的"仅供参考",更不能只保留结论那一半。**
 *
 * ## 手势是「先点开始,再推」,不是 DPI 页那套「点带子、推、再点一下」
 *
 * 这两页**共用 `ruler.ts`**,但用的不是同一个模式:本页是默认的
 * **`trigger: 'first-move'`**(DPI 页用的是 `'manual'`)—— 点「开始测量」之后推,
 * 推完**停住**,静止约 0.7 秒后自动结算;DPI 页则是"点起点带 → 推 → 再点一下结束"。
 * 所以 `steps` / `hint` / `runs.*.metaRunning` / FAQ 第 3 条说的都是"先开始,再推"。
 * **翻译时不要从 DPI 页或 `dpi.ts` 搬「点那条带子开始」那一套说法。**
 *
 * ## 带 `**强调**` 的段落
 *
 * 模板里原来是 `<strong>…</strong>`,搬进目录时按仓库的约定改写成 `**…**`,
 * 渲染走 `faq.ts` 的 `faqHtml()`(和 FAQ 答案同一套),所以句子是完整的、
 * 没有为了加粗被切成碎片。
 *
 * **`limitsPoints` 那三条住在 `<section class="prose prose--cards">` 里**,而
 * `.prose--cards li > strong:first-child` 会把每条**开头**那个 `<strong>` 显示成
 * 卡片标题 —— 所以 `**` 必须留在**开头**那一句上,不能挪到句子中间。
 *
 * ## 运行期填的占位符
 *
 * | 占位符 | 在哪 | 填什么 |
 * | --- | --- | --- |
 * | `{cm}` | `runMeta` | 这一次的目标距离(厘米,`distanceCm`) |
 * | `{px}` | `runMeta` | 这一次量到的屏幕位移(像素) |
 * | `{axis}` | `runMeta` | `axisX` / `axisY` —— 量到的是横向还是纵向 |
 * | `{dpi}` | `runMeta` | 这一次的估算 DPI,已经由 `format()` 格式化 |
 * | `{drift}` | `runMeta` | 推歪了的时候填 `runMetaDrift`,否则填空串 |
 * | `{speed}` | `speedMeta` | 这一次的平均速度(像素 / 秒) |
 * | `{ratio}` | `noteSpeedGap` | 两次速度的比值(快 ÷ 慢) |
 *
 * 每句都**整句住在一个键里**,由页面 `fill()` 填 —— 不在句子中间断开,理由同别页。
 * `runMeta` 里那个 `{drift}` 是**句尾那一小句**的挂载点:原文就是拼在句末的,
 * 拆成两个键(有 / 无)会让同一句话有两份、迟早漂掉。
 *
 * ## 按值查,不按下标
 *
 * - `distances` 按 **`cm`** 查(`DISTANCES` 里那三个 5 / 10 / 20),页面对着自己那份
 *   按 `cm` 找标签 —— **不要按下标对齐**。
 * - `refRows` 按 **`level`** 查(`compareAcceleration()` 给的
 *   `'none' | 'mild' | 'strong'`,和模板里那个 `data-ref-level` 是同一个值),
 *   同样不按下标。表里 `'unknown'` 那一档**没有行**(它只在读数栏里出现)。
 *
 * ## 刻意留在页面里的东西(不抄进目录)
 *
 * - 判定表**第一列那三个数**(`< 1.10` / `1.10 – 1.30` / `≥ 1.30`)是 `analysis.ts`
 *   的 `ACCEL_MILD_RATIO` / `ACCEL_STRONG_RATIO` 现算的,属于**判据不属于文案**
 *   (同 `scroll.ts` 里那条"换算除数不抄进目录")。`refRows` 只带走后两列。
 * - `notes.join(' ')` 那个空格分隔符:中英一样,不是文案。
 * - `<span class="run__unit">px</span>` 那一格走 `runUnit`,两边同值 —— 留着是为了
 *   让"这一页每一处可见文字都能在本文件里找到",而不是因为英文要换一个词。
 *
 * ## 不在这一份里的东西
 *
 * - 源文件里的代码注释(中英混着的那些)是给开发者看的,不是用户文案。
 * - **本页没有 `throw new Error(...)`、也没有 `console.*`**,所以没有要跳过的
 *   开发者字符串。
 * - **本页没有 `<span class="mark-danger">…</span>`(或任何着色的 span),
 *   也没有 `<br />`** —— 所以既不需要 `{mark}` 那类拆出来的锚文本键,
 *   也不需要 `{br}` 占位符。判读全靠文字和那三档徽章,不靠颜色指代。
 */

/** FAQ 一行的形状。**文案两边键必须一样**,见文件头 */
export interface AccelerationFaqItem {
  q: string;
  a: string;
}

/**
 * 距离选项一行。
 *
 * `cm` 是**数值**(写进按钮的 `data-cm`),两种语言里逐字相同;`label` 才是按钮上
 * 那行字。留着 `cm` 是为了让目录自洽、也让页面能按 `cm` 查到自己的那一行 ——
 * 见文件头「按值查,不按下标」。
 */
export interface AccelerationDistanceOption {
  cm: number;
  label: string;
}

/**
 * 判定表的一行。
 *
 * `level` 是 `compareAcceleration()` 给的档位代码(`none` / `mild` / `strong`),
 * 和模板里那个 `data-ref-level` 逐字相同 —— 它是**查表用的键,不翻译**。
 * 表的第一列(比值区间)不在这里,理由是判据不是文案,见文件头。
 */
export interface AccelerationRefRow {
  level: string;
  verdict: string;
  note: string;
}

/** 一张「这一次」卡片上那三处随状态变的字。两张卡各一份 */
export interface AccelerationRunCopy {
  /** 卡头左边那枚小小的序号徽章 */
  index: string;
  /** 卡头右边那个短标题 */
  title: string;
  /** 空态 / 复位时那行说明(`还没有测` / `先做完第一次`) */
  metaIdle: string;
  /** 开测那一刻换上的那行说明 */
  metaRunning: string;
}

export const accelerationZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'acceleration-test',
  /** 页面自己的 `<title>` / meta description。**和 `tools.ts` 里那份逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '鼠标加速度测试 - 检测指针加速是否影响瞄准',
  metaDescription:
    '在线检测系统鼠标加速:以不同速度移动相同物理距离,比较屏幕位移是否一致,判断加速度是否开启。',

  h1: '鼠标加速度测试',
  lede:
    '指针加速的意思是:**你移得越快,系统把位移放大得越多**。' +
    '所以测试的方法就是——用**慢**和**快**两种速度,各推同一段物理距离,' +
    '看屏幕上光标走的距离是不是一样。一样,说明没有加速;快的那次明显走得更远,就是有。',
  /** 第二段:`这一页**不需要**先关掉加速…`。**和 DPI 页那句是反的**,别抄错 */
  ledeNoDisable:
    '这一页**不需要**先关掉加速,它测的正是加速现在开着没开着。' +
    '需要一把尺子,并保证两次推的距离一致。',

  stepsHeading: '怎么测',
  /**
   * 三条编号步骤。**开头的 `**…**` 只是加粗**(`ol.steps` 不在 `.prose--cards`
   * 里,不会被排成卡片标题)。手势是"先点开始,再推",见文件头。
   */
  steps: [
    '在下面选好距离(默认 10 厘米),把鼠标放在尺子的起点刻度上,' +
      '然后点**第一次**的“开始测量”。**慢慢**推完这段距离,停住。',
    '停下约 0.7 秒后自动结算。然后把鼠标放回起点,点**第二次**的“开始测量”,' +
      '这次**快速地**推完**同样的距离**,推到头立刻停手。',
    '两次都有数之后,下面会给出结论。',
  ] as string[],

  /** 距离选项。**按 `cm` 查,别按下标**,见文件头 */
  distances: [
    { cm: 5, label: '5 厘米' },
    { cm: 10, label: '10 厘米' },
    { cm: 20, label: '20 厘米' },
  ] as AccelerationDistanceOption[],

  reset: '重置',
  /** 「重置」旁边那行小提示 */
  hint: '两次必须推同样长的距离,否则不可比',

  /** 两张「这一次」卡片。**两张卡的字不一样,所以各一份,不是什么共用常量** */
  runs: {
    slow: {
      index: '第一次',
      title: '慢慢推',
      metaIdle: '还没有测',
      metaRunning: '慢慢推,推完停住',
    },
    fast: {
      index: '第二次',
      title: '快速推',
      metaIdle: '先做完第一次',
      metaRunning: '快速推,推到头立刻停',
    },
  } as Record<'slow' | 'fast', AccelerationRunCopy>,

  /** 两张卡上那个按钮,同一个词 */
  startButton: '开始测量',
  /** 大读数后面那个单位(`px`) */
  runUnit: 'px',
  /** 所有"没测到"的读数位写的那个破折号(不是 0) */
  dash: '—',
  /** 这一次太短 / 一个采样都没收到时,卡片里换上的那行说明 */
  noteTooShort: '这次太短或没记录到,请重新推一次。',
  /** 卡片里那行结果。`{drift}` 是句尾那一小句,见文件头 */
  runMeta: '{cm} 厘米走了 {px} px({axis})约 {dpi} DPI{drift}',
  /** `runMeta` 末尾那个 `{drift}` 的值:推歪了的时候 */
  runMetaDrift: ',推歪了,建议重推',
  /** `{axis}` 的两个值 —— 量到的是哪一个轴 */
  axisX: '横向',
  axisY: '纵向',
  /** 卡片右下角那行平均速度。`{speed}` 是像素 / 秒 */
  speedMeta: '{speed} px/s',

  /** 右边那块结论。`unit` 是比值后面那个字 */
  verdict: {
    label: '指针加速度',
    unit: '倍',
    noteIdle: '两次都测完之后,这里会给出结论',
  },

  /** 右上角那枚徽章的档。**和 `notes` 的四档一一对应** */
  badges: {
    idle: '等待测量',
    none: '没测到加速',
    mild: '轻微加速',
    strong: '明显加速',
    unknown: '测不出来',
  },

  /** 结论下面那句说明,按 `comparison.level` 取。**和 `refRows` 的措辞要对得上** */
  notes: {
    none: '两次同样距离,屏幕上走的距离基本一致。',
    mild: '快速那次明显走得更远,存在与速度相关的放大。',
    strong: '快速那次的位移被大幅放大了,加速是开着的。',
    unknown: '数据不足,无法判定。',
  },

  /**
   * 两次速度差得太小时**主动**追加的那句。
   *
   * 这一句不是可选的:没有它,用户会把"加速藏起来了"读成"没有加速" ——
   * 见文件头。`{ratio}` 是快慢两次的速度比。
   */
  noteSpeedGap:
    '但这次两次的速度只差 {ratio} 倍,差得不够大时加速度本来就显不出来 —— ' +
    '这组数据得出的“没有加速”不能当数,建议快的那次再快些重测。',
  /** 判出有加速时给出的关闭方法 */
  noteTurnOff: '关闭方法:控制面板 → 鼠标 → 指针选项 → 取消勾选“提高指针精确度”。',

  criteriaHeading: '这背后的判定标准',
  criteriaBody:
    '读数是**快速那次的估算 DPI ÷ 慢速那次的估算 DPI**。' +
    '两次推的是同一段物理距离,如果系统没有加速,这个比值应当是 1 左右——' +
    '不会精确等于 1,因为手推的距离本来就有几毫米的出入。',
  /** 判定表的三个表头。**第一列那三个比值不在这里**,见文件头 */
  refColumns: { ratio: '比值', verdict: '判定', note: '说明' },
  /** 判定表的三行。**按 `level` 查,别按下标**,见文件头 */
  refRows: [
    {
      level: 'none',
      verdict: '没测到加速',
      note: '差异在手速变化和测量误差能解释的范围内',
    },
    {
      level: 'mild',
      verdict: '轻微加速',
      note: 'Windows 的“提高指针精确度”在中等速度下大约是这个量级',
    },
    {
      level: 'strong',
      verdict: '明显加速',
      note: '开了加速并且快速甩动时会到 2 倍甚至更多',
    },
  ] as AccelerationRefRow[],

  whyHeading: '为什么不直接告诉我“加速已开启”',
  whyBody1:
    '因为网页**读不到那个开关**。系统有没有勾上“提高指针精确度”,' +
    '浏览器没有 API 能查。它也不告诉你当前鼠标驱动有没有自己再加一层加速——' +
    '有些游戏鼠标的驱动会绕过系统设置单独处理。',
  whyBody2:
    '能观测到的只有行为:同样的手部动作,快慢两种速度下光标的响应是否一致。' +
    '所以这一页**只能给出行为上的结论,不能断言那个复选框的状态**。' +
    '如果你测出了加速,那无论开关在哪,你手上的确感觉到了加速——这就够你去做决定了。',

  limitsHeading: '测不准的几种情况',
  /** 三条。**开头的 `**…**` 是卡片标题**,见文件头 */
  limitsPoints: [
    '**两次速度差得不够大。**这是最常见的一种。如果第一次和第二次的速度只差一点点,' +
      '加速就基本不显现,结论会偏向“没有”。页面上把两次的实际速度都列了出来,' +
      '**速度差太小的时候,请把结论当成无效**——不是鼠标没问题,是这次没测出来。',
    '**快速那次光标撞到屏幕边缘。**开了加速时光标会走得很远,一旦撞边,' +
      '坐标就不再变化,量到的位移会偏小,把加速给掩盖掉。距离选短一点可以避免。',
    '**手推的距离不一致。**这一项没法自动检测——页面只知道屏幕上走了多少像素,' +
      '不知道你的手实际推了多少。所以两次都要对着尺子的同一段刻度。',
  ] as string[],

  faqHeading: '常见问题',
  faq: [
    {
      q: '这个测试需要先关掉指针加速吗?',
      a:
        '恰恰相反——**开着才测得出东西**。这一页问的就是"我的系统现在有没有加速"。' +
        '所以按你平时用鼠标的状态测就行。测完之后如果结论是"有加速",再决定要不要去关。',
    },
    {
      q: '为什么两次移动的距离必须一样?',
      a:
        '因为要比的是"同样一段物理距离,屏幕上的位移是否相同"。距离不一样的话,两次的读数就不可比了。' +
        '如果你第一次推了 10 厘米、第二次推了 12 厘米,那差异里混着手推的误差,得不出任何结论。' +
        '所以页面会把两次的距离锁定成同一个值。',
    },
    {
      q: '为什么快速那次要"推到头就停"?',
      a:
        '开了加速之后,同样推 10 厘米,快推会让光标走得更远——屏幕上可能根本放不下,光标会在中途撞到屏幕边缘。' +
        '一旦撞边,浏览器报的坐标就停住了,量到的位移会小于实际,结果反而偏低。所以选一个短一点的距离,' +
        '并且推到头立刻停手。',
    },
    {
      q: '结论说"没有加速度",就一定没有吗?',
      a:
        '不是。这一页只能给出"在你刚才那个速度区间内,没有观察到放大"。如果你两次移动的速度其实差不太多,' +
        '加速度就藏起来了——它只在速度差足够大时才显形。所以页面会把两次的实际速度显示出来,' +
        '你可以自己看这个比值是在多大的速度差下得出的。速度差太小的话,结论不成立。',
    },
  ] as AccelerationFaqItem[],
};

export const accelerationEn: typeof accelerationZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'acceleration-test',
  metaTitle: 'Mouse acceleration test — check whether pointer acceleration affects your aim',
  metaDescription:
    'Detect system pointer acceleration online: move the same physical distance at two different speeds and compare the cursor travel on screen to judge whether acceleration is on.',

  h1: 'Mouse acceleration test',
  lede:
    'Pointer acceleration means: **the faster you move, the more the system scales your movement up**. ' +
    'So the way to test it is to push the same physical distance at two speeds, **slow** and **fast**, ' +
    'and see whether the cursor covers the same distance on screen. If it does, there is no ' +
    'acceleration; if the fast run clearly goes further, there is.',
  ledeNoDisable:
    'This page **does not need** acceleration switched off first — what it measures is precisely ' +
    'whether acceleration is on right now. It does need a ruler, and both runs have to cover the ' +
    'same distance.',

  stepsHeading: 'How to test',
  steps: [
    'Pick the distance below (10 cm by default), rest the mouse at the ruler’s starting mark, then ' +
      'click **Start measuring** on the **first** run. Push the whole distance **slowly**, then stop.',
    'About 0.7 seconds after you stop, it settles on its own. Put the mouse back at the start, click ' +
      '**Start measuring** on the **second** run, push the **same distance** this time **quickly**, ' +
      'and stop the instant you reach the end.',
    'Once both runs have a number, the verdict appears below.',
  ],

  distances: [
    { cm: 5, label: '5 cm' },
    { cm: 10, label: '10 cm' },
    { cm: 20, label: '20 cm' },
  ],

  reset: 'Reset',
  hint: 'Both runs have to cover the same distance, or they cannot be compared',

  runs: {
    slow: {
      index: 'First',
      title: 'Slow push',
      metaIdle: 'Not measured yet',
      metaRunning: 'Push slowly, then stop',
    },
    fast: {
      index: 'Second',
      title: 'Fast push',
      metaIdle: 'Do the first run first',
      metaRunning: 'Push fast, stop the instant you reach the end',
    },
  },

  startButton: 'Start measuring',
  runUnit: 'px',
  dash: '—',
  noteTooShort: 'This run was too short or nothing was recorded — push again.',
  runMeta: 'Over {cm} cm the cursor travelled {px} px ({axis}), about {dpi} DPI{drift}',
  runMetaDrift: ', pushed off-axis — push again',
  axisX: 'horizontal',
  axisY: 'vertical',
  speedMeta: '{speed} px/s',

  verdict: {
    label: 'Pointer acceleration',
    unit: '×',
    noteIdle: 'Once both runs are done, the verdict appears here',
  },

  badges: {
    idle: 'Waiting',
    none: 'No acceleration found',
    mild: 'Slight acceleration',
    strong: 'Clear acceleration',
    unknown: 'Cannot tell',
  },

  notes: {
    none: 'Both runs covered the same distance, and the cursor travelled about the same distance on screen.',
    mild: 'The fast run clearly went further — there is scaling that depends on speed.',
    strong: 'The fast run’s travel was scaled up heavily — acceleration is on.',
    unknown: 'Not enough data to decide.',
  },

  noteSpeedGap:
    'But this time the two speeds were only {ratio}× apart, and acceleration does not show itself ' +
    'unless the gap is big enough — the “no acceleration” this data suggests does not count, so run ' +
    'the fast one faster and measure again.',
  noteTurnOff:
    'To turn it off: Control Panel → Mouse → Pointer Options → uncheck “Enhance pointer precision”.',

  criteriaHeading: 'How the verdict is decided',
  criteriaBody:
    'The reading is **the fast run’s estimated DPI ÷ the slow run’s estimated DPI**. Both runs ' +
    'cover the same physical distance, so with no acceleration on the system the ratio should be ' +
    'around 1 — not exactly 1, because a hand-pushed distance is always a few millimetres out.',
  refColumns: { ratio: 'Ratio', verdict: 'Verdict', note: 'Meaning' },
  refRows: [
    {
      level: 'none',
      verdict: 'No acceleration found',
      note: 'the difference is within what a change of hand speed and measurement error can explain',
    },
    {
      level: 'mild',
      verdict: 'Slight acceleration',
      note: 'Windows’ “Enhance pointer precision” is around this order of magnitude at moderate speeds',
    },
    {
      level: 'strong',
      verdict: 'Clear acceleration',
      note: 'with acceleration on and a fast flick it reaches 2× or more',
    },
  ],

  whyHeading: 'Why not just tell me “acceleration is on”',
  whyBody1:
    'Because a web page **cannot read that switch**. Whether “Enhance pointer precision” is ticked ' +
    'is not something the browser has an API for. Nor does it tell you whether your mouse driver ' +
    'adds a layer of acceleration of its own — some gaming mouse drivers bypass the system setting ' +
    'and handle it separately.',
  whyBody2:
    'All that can be observed is behaviour: whether the cursor answers the same hand movement ' +
    'consistently at two different speeds. So this page **can only give a behavioural verdict; it ' +
    'cannot state the state of that checkbox**. If you do measure acceleration, then wherever the ' +
    'switch sits, you have felt it in your own hand — and that is enough to decide with.',

  limitsHeading: 'The cases where it cannot be measured',
  limitsPoints: [
    '**The two speeds were not far enough apart.** This is the most common one. If the first and ' +
      'second runs differed only slightly, acceleration barely shows at all and the verdict leans ' +
      'towards “none”. The page lists both actual speeds, and **when the gap is too small, treat ' +
      'the verdict as void** — it is not that the mouse is fine, it is that this run did not ' +
      'measure it.',
    '**The cursor hit the edge of the screen on the fast run.** With acceleration on the cursor ' +
      'travels a long way, and once it hits the edge its coordinates stop changing: the measured ' +
      'travel comes out short and the acceleration gets hidden. Choosing a shorter distance avoids it.',
    '**The hand-pushed distance was not the same.** This one cannot be detected automatically — the ' +
      'page only knows how many pixels were covered on screen, not how far your hand actually ' +
      'pushed. So both runs have to be lined up on the same stretch of the ruler.',
  ],

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'Does this test need pointer acceleration switched off first?',
      a:
        'Quite the opposite — **it only measures anything with acceleration on**. What this page asks ' +
        'is “does my system have acceleration on right now?”. So measure with the mouse set up the ' +
        'way you normally use it. If the verdict afterwards is “acceleration on”, then decide whether ' +
        'to turn it off.',
    },
    {
      q: 'Why do both runs have to cover the same distance?',
      a:
        'Because what is being compared is “the same physical distance — does it come out as the same ' +
        'travel on screen?”. With different distances the two readings are not comparable. If you ' +
        'pushed 10 cm the first time and 12 cm the second, the difference has your own hand error ' +
        'mixed into it and no conclusion can be drawn. That is why the page locks both runs to the ' +
        'same distance.',
    },
    {
      q: 'Why does the fast run have to stop the instant it reaches the end?',
      a:
        'With acceleration on, the same 10 cm pushed quickly sends the cursor much further — further ' +
        'than the screen may have room for, so the cursor hits the edge part-way through. Once it ' +
        'hits the edge, the coordinates the browser reports stop moving, the measured travel comes ' +
        'out smaller than the real one, and the result is low rather than high. So pick a shorter ' +
        'distance, and stop the instant you reach the end.',
    },
    {
      q: 'If the verdict says “no acceleration”, is it definitely off?',
      a:
        'No. All this page can say is “within the speed range you just used, no scaling was ' +
        'observed”. If your two runs were in fact at much the same speed, the acceleration stayed ' +
        'hidden — it only shows itself once the speed difference is big enough. So the page shows ' +
        'both actual speeds, and you can see for yourself how big a speed difference that ratio came ' +
        'from. If the speed difference was too small, the verdict does not hold.',
    },
  ],
};
