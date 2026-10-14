/**
 * DPI 测试页(`/dpi-test/`)的文案。
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
 * `dpiEn` 声明成 `typeof dpiZh` —— 英文版漏一个键、拼错一个键、多出一个键,
 * 都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 带 `**强调**` 的段落
 *
 * 模板里原来是 `<strong>…</strong>`,搬进目录时按仓库的约定改写成 `**…**`,
 * 所以句子是完整的、没有为了加粗被切成碎片。渲染走 `faq.ts` 的 `faqHtml()`
 * (和 FAQ 答案同一套)。
 *
 * **那几个 `<strong>` 不只是加粗。** `errors` 那一节(`<h2>误差从哪里来</h2>`)
 * 住在 `<section class="prose prose--cards">` 里,而 `.prose--cards li > strong:first-child`
 * 会把每条开头的那个 `<strong>` 显示成卡片标题 —— 所以 `**` 必须留在**开头**
 * 那一句上,不能挪到句子中间。`steps` 同属一个 section,同理。
 *
 * ## 这一页的文案是被一个约束逼出来的
 *
 * **光标推不出屏幕边**:鼠标每移动一英寸产生的计数,系统 1:1 变成光标在屏幕上
 * 走的像素,所以 DPI 越高、同一段物理距离光标跑得越远,顶到边之后坐标就不再
 * 更新,量到的距离被静默截短。所以本页默认只推 1 厘米,测完再按实测 DPI 反算出
 * "这只鼠标最多能推多远"(`noteMaxDistance` 就是那句话)。**译文里不能把这一层
 * 弱化成一句泛泛的"建议测长一点"** —— 那个上限取决于 DPI,而 DPI 正是这一页
 * 要测的东西,这层因果是这一页全部设计的来源。
 *
 * ## 运行期填的占位符
 *
 * | 占位符 | 填什么 |
 * | --- | --- |
 * | `{cm}` | 这一次的目标距离(厘米) |
 * | `{dpi}` / `{px}` / `{maxCm}` / `{suggestCm}` | 实测 DPI、可用像素数、建议距离 |
 * | `{pixels}` / `{seconds}` / `{perMm}` | 这次量到的像素、用时秒数、1 毫米占的百分比 |
 * | `{delta}` | 与标称值的偏差(带正负号的一串) |
 * | `{tier}` | 判定出来的档位 |
 * | `{noisePercent}` | `DPI_NOISE_BAND` 的百分数(即 5) |
 * | `{nominal}` | 用户填的标称值 |
 * | `{scale}` | 显示缩放的候选值 |
 *
 * ## 三处刻意留下来的东西
 *
 * - **`stripHint` 里有一个 `\n`。** 原文那两句之间是一个 `<br />`。整句留在
 *   **一个键**里(拆开之后翻译的人看不到完整的句子),页面按 `\n` 拆开再接回
 *   `<br />`;若直接整句渲染,它会被 HTML 折成一个空格,读起来也通顺。
 * - **`compareMeta` 给的是整句**(`标称 {nominal} · 偏差 {delta}`),而模板里那两个
 *   值各自住在一个 `<span id="cmp-nominal">` / `<span id="cmp-delta">` 里,由脚本
 *   分别写。接线时可以选择 `fill()` 一次填整句,也可以把两个标签拆成两个键 ——
 *   这里给的是**整句**,理由和别处一样:翻译的人要先看到完整的句子。
 * - **`1 厘米`(`DEFAULT_CM`)在 `reachTrial` 和 FAQ 第 2 条里是写死的散文,不是
 *   占位符** —— 原文页面上它本来就是写死的。改 `DEFAULT_CM` 时这几处要一起改
 *   (另有一处是 `toastMeta`,那一条走 `{cm}`,不会漂)。
 *
 * ## 依赖上下文的句子(翻译时按同一条线索走)
 *
 * - `errors[2]` 里那句"上面的『推歪了』"指的是 **`stats.drift.label`** ——
 *   两处必须译成同一个词,而且 `errors[2]` 里还带引号。
 * - `errors[1]` 里"这正是上面那条『测完再推长一点』的理由"指的是
 *   `reachHeading` / `reachTrial` 那一节。
 * - FAQ 第 2 条("所以本页从 1 厘米起步…")和正文 `reachTrial` 说的是同一件事,
 *   两处的措辞要能对上。
 */

/** FAQ 一行的形状。**文案两边键必须一样**,见文件头 */
export interface DpiFaqItem {
  q: string;
  a: string;
}

export const dpiZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'dpi-test',
  /** 页面自己的 `<title>` / meta description。**和 `tools.ts` 里那份逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '鼠标 DPI 测试 - 在线估算鼠标灵敏度',
  metaDescription:
    '在线估算鼠标 DPI(CPI):按提示移动固定物理距离,由屏幕像素位移反推灵敏度。需要关闭指针加速以获得准确结果。',

  h1: '鼠标 DPI 测试',
  lede:
    '浏览器读不到鼠标的硬件 DPI,只能反过来估:让你沿着尺子推一段**已知的物理距离**,' +
    '再量屏幕上光标走了多少像素,两者一除就是每英寸多少个计数(CPI/DPI)。' +
    '这项测试**需要一把尺子**,而且必须先关掉系统的指针加速,否则测出来的数字没有意义。',

  beforeHeading: '开始之前',
  /** 编号步骤。**开头的 `**…**` 是这一条的"点"**,见文件头 */
  steps: [
    '**关掉指针加速。**控制面板 → 鼠标 → 指针选项 → ' +
      '取消勾选“**提高指针精确度**”。这一步不做,后面的数字不用看。',
    '**把指针速度滑块拖到正中间(第 6 格)。**' +
      '只有这一格是 1:1 映射,偏一格结果就会差一截。',
    '**按 Ctrl+0 复位浏览器缩放**,把尺子横放在鼠标垫上,' +
      '让**0 刻度对准屏幕上那条虚线**。',
    '**把鼠标停在尺子的 0 刻度上,点一下虚线左边那条带子**,' +
      '然后沿尺子**水平**推出选定的距离,**再点一下结束**。',
  ] as string[],

  /** 面板外面那行控件 */
  fields: {
    distance: '目标距离(厘米)',
    nominal: '标称 DPI',
    scale: '显示缩放',
  },
  reset: '重测',

  /**
   * 测试面空态那两行提示。**中间那个 `\n` 就是原文的 `<br />`**,见文件头
   */
  stripHint:
    '把尺子的 0 刻度对准右边那条虚线,把鼠标停在那儿,点一下左边这条带子开始;\n' +
    '沿尺子水平推到目标刻度,再点一下结束。',
  /** 测量中那条提示。`{cm}` 是这一次的目标距离 */
  toastMeta: '请沿尺子水平推出 {cm} 厘米,再点一下结束',
  /** 指针顶到屏幕边时换上的那句(唯一一个"这次测量已经废了"的提示位) */
  toastEdge: '指针顶到屏幕边了 —— 再往前推光标也不会动。点一下结束,然后把目标距离改小重测。',
  /** 显示缩放那个 `<option>` 上标出"这个值是系统读出来的"。`{scale}` 是倍数 */
  scaleDetected: '{scale}× (系统检测)',

  /** 结果块左边那个标签 */
  verdictLabel: '估算 DPI',
  /**
   * 结果里那行偏差。**整句**,`{nominal}` / `{delta}` 两个值由脚本分别写进两个
   * `<span>` —— 见文件头里那条
   */
  compareMeta: '标称 {nominal} · 偏差 {delta}',
  /** 结果块里那句说明的空态(首屏和复位都用这一句) */
  noteIdle: '按上面的步骤准备好:把鼠标停在尺子的 0 刻度上,点一下虚线左边那条带子开始。',

  /** 右上角那枚徽章的六档。`tier` 那一档带档位值 */
  badges: {
    idle: '等待测量',
    measuring: '测量中',
    noMove: '没测到',
    failed: '算不出来',
    unknownTier: '未识别档位',
    tier: '约 {tier} DPI',
  },

  /** 四格读数。`hint` 为空串表示那一格没有说明 */
  stats: {
    pixels: { label: '屏幕位移', hint: '沿主轴量到的净位移' },
    duration: { label: '用时', hint: '' },
    speed: { label: '平均速度', hint: '' },
    drift: { label: '推歪了', hint: '垂直于主轴的偏移' },
  },

  /** 输入框下面那行距离说明。低于 2 厘米时是 `trial` 那句(还没测过 DPI) */
  distanceNotes: {
    trial: '这是试测量。测出 DPI 之后,本页会告诉你这只鼠标最多能推多远。',
    full: '推得越长越准。但光标顶到屏幕边之后再推就不动了,本页会当场提醒。',
  },

  /** 一次都没记录到移动 */
  noteNoMove:
    '这一次没记录到移动。把鼠标停在尺子的 0 刻度上,点一下左边那条带子,推出去之后再点一下。',
  /** 开测之后那行说明。`{cm}` 是这一次钉下来的目标距离 */
  noteMeasuring: '水平推到尺子上 {cm} 厘米那个刻度,然后点一下结束。',
  /** 位移太小,算不出 DPI */
  noteInsufficient: '数据不足,请重新推一次。',
  /** 结果第一句:`{cm}` 里走了 `{pixels}` 像素,用时 `{seconds}` 秒 */
  noteResult: '{cm} 厘米里光标走了 {pixels} 像素,用时 {seconds} 秒。',
  /** 偏轴太多会系统性偏低,所以单独提示 */
  noteDrift: '垂直于主轴偏了 {px} 像素,推弧线会让读数偏低,建议重推一次。',
  /** 偏差落在本页自身误差带里 —— **只算给你看,不判通过与否** */
  noteDeviationWithin:
    '偏差 {delta} 小于本页自身的测量误差(在 {cm} 厘米上差 1 毫米就是 {perMm}%),' +
    '所以它说明不了你的传感器偏了多少。',
  /** 偏差超出误差带 */
  noteDeviationOver: '偏差 {delta} 已经超出本页的误差范围,值得回鼠标驱动里核一下标称档位是不是填错了。',
  /** 光标能走多远的上限 —— 这一页最该给用户的那个数 */
  noteMaxDistance:
    '你的鼠标大约 {dpi} DPI,光标一共只有约 {px} 像素可以走,' +
    '所以这一页最多能推 {maxCm} 厘米 —— 想要更准的结果,' +
    '把目标距离改成 {suggestCm} 厘米重测一次。',

  cpiHeading: 'D 是多少就是多少?其实是 CPI',
  cpiBody:
    '严格说这个量叫 **CPI**(counts per inch,每英寸计数),' +
    '而 **DPI**(dots per inch,每英寸点数)原本是打印机的指标。' +
    '但鼠标行业从很多年前就把这两个词混着用了,现在厂商、驱动、玩家社群一律写 DPI,' +
    '所以本站也跟着写 DPI——你要知道的是它们在这里指的是同一件事。',

  referenceHeading: '参考档位',
  referenceLede:
    '下面这些是常见的标称档位,只用来给一句“大约相当于”。' +
    '**它不构成判定**:鼠标标称值和实测值差 5% 是常态,' +
    '而本页靠手动推一段距离来量,误差本来就有几个百分点。',
  referenceColumns: { tier: '档位', counts: '计数 / 厘米', use: '常见用途' },
  /**
   * 表格第三列那四句,键对应的是**标称值区间**不是档位值
   * (`≤800` / `≤1600` / `≤3200` / 其余)。区间本身是结构,住在页面里
   */
  referenceUses: {
    office: '办公、多屏、低灵敏度玩家',
    game: '最常见的游戏档位',
    highRes: '高分辨率屏幕或高灵敏度设置',
    driver: '通常是配合驱动里的降敏倍率在用',
  },
  /** 表格第一列。`{dpi}` 是 `STANDARD_DPI` 里的档位值 */
  referenceTier: '{dpi} DPI',

  reachHeading: '推多远,由你的鼠标说了算',
  reachBody:
    '这项测试看起来可以“推得越长越准”,实际不行:**光标在屏幕上是有边界的**。' +
    '鼠标每移动一英寸产生的计数,系统会 1:1 变成光标走的像素,所以同一段物理距离,' +
    'DPI 越高光标跑得越远。800 DPI 推 10 厘米,光标要走 3150 像素;3200 DPI 推 10 厘米,' +
    '就是 12600 像素——早就出了屏幕。光标顶到边之后**再推鼠标,坐标也不会更新**,' +
    '量到的距离被截短,结果偏低,而且页面上一点异常都看不出来。',
  reachTrial:
    '所以本页默认从 **1 厘米**起步。这一次的目的不是给你一个准确的数,' +
    '而是问出**你这只鼠标最多能推多远**——拿到大致 DPI 之后,页面会把这个长度' +
    '算出来告诉你,再用它重测一次,那一次才是这个页面上能拿到的最准的结果。',

  errorsHeading: '误差从哪里来',
  /** 四条误差来源。**开头的 `**…**` 是卡片标题**,见文件头 */
  errors: [
    '**手推的距离不准。**这是最大的一项,而且**距离越短它越致命**:' +
      '在 1 厘米上差 1 毫米就是 10%,在 10 厘米上同样的 1 毫米只有 1%。这正是上面那条' +
      '“测完再推长一点”的理由。对着尺子的刻度起止,能好一截。',
    '**指针速度滑块不在正中间。**不在第 6 格时,系统会先做一次整数倍缩放,' +
      '你测到的是乘积。这一项带来的偏差可以很大,务必先归位。',
    '**推歪了。**本页取的是**净位移**,只在起点和终点之间量直线距离。' +
      '如果你推的是条弧线,量到的会小于实际走过的路程,结果偏低。上面的“推歪了”就是给你看这个的。',
    '**系统仍在做加速。**有些鼠标驱动会绕过系统的“提高指针精确度”自己再加速一次。' +
      '如果两次测量(慢推一次、快推一次)结果差很多,那就是还有加速没关掉——' +
      '去用加速度测试页确认。',
  ] as string[],

  faqHeading: '常见问题',
  faq: [
    {
      q: '为什么必须关掉“提高指针精确度”?',
      a:
        '因为那是**指针加速度**。开着它的时候,系统会根据你移动的快慢额外放大位移——' +
        '同样移动 10 厘米,快着推光标会走得更远。于是“每厘米对应多少像素”这个换算关系根本不存在,' +
        '测出来的数与你的手速绑定,不可复现。关掉它是这项测试的前提,不是可选项。' +
        '位置在:控制面板 → 鼠标 → 指针选项 → 取消勾选“提高指针精确度”。',
    },
    {
      q: '为什么默认只推 1 厘米?推长一点不是更准吗?',
      a:
        '**是更准,而且推得越长越准——但屏幕上推不了那么远。**' +
        '鼠标每移动一英寸产生的计数,系统会 1:1 变成光标在屏幕上走的像素,' +
        '所以 800 DPI 的鼠标推 10 厘米,光标要走 3150 像素;而一屏 1920 的窗口,' +
        '从左边推到右边也就 1800 上下。**光标顶到屏幕边就再也不动了**,再推鼠标' +
        '坐标也不会更新,量到的距离会被悄悄截短,算出来的 DPI 跟着偏低。' +
        '更麻烦的是这个上限**取决于你的 DPI**,而 DPI 正是这一页要测的东西。' +
        '所以本页从 1 厘米起步:先测出一个大致数值,再按它告诉你这只鼠标最多能推多远,' +
        '那时候用那个距离重测一次,结果会准得多。测量中一旦指针顶到屏幕边,' +
        '提示条会当场改口。',
    },
    {
      q: '显示缩放为什么要填?',
      a:
        '因为浏览器报的坐标是 **CSS 像素**,不是鼠标计数。屏幕上 150% 缩放时,一个鼠标计数只对应 ' +
        '1/1.5 个 CSS 像素,所以量到的 CSS 像素要乘回 1.5 才是真实计数。' +
        '页面会自动读系统的缩放比例,但如果你的浏览器缩放不是 100%(按 Ctrl+0 可以复位),' +
        '读到的值会被浏览器缩放污染,这时需要手动指定。',
    },
    {
      q: '测出来的数和我鼠标标称的 DPI 差一点,正常吗?',
      a:
        '正常,而且几乎一定会有偏差。误差有三个来源:你手动推的那段距离本身就不可能精确' +
        '(在 1 厘米上差 1 毫米就是 10%),指针速度滑块如果不在正中间(第 6 格)会引入一个固定比例,' +
        '鼠标自己标称的 DPI 也常有 5% 左右的出入。所以本页把结果显示成“大约相当于”某个档位,' +
        '并且把你填的标称值和实测值的差**如实算给你看**,而不是判一个通过或不通过——' +
        '那个差在 {noisePercent}% 以内时,它和本页自身的误差是同一个量级,说明不了你的鼠标偏没偏。',
    },
    {
      q: '为什么要把指针速度滑块放在正中间?',
      a:
        'Windows 的指针速度滑块共 11 格,只有正中间那一格(第 6 格)是 1:1 映射——' +
        '一个鼠标计数对应一个屏幕像素。往左会被缩小,往右会被放大,而且是**整数倍的阶梯式缩放**, ' +
        '不是平滑的。滑块不在正中间时,本页测出的是“滑块缩放 × 硬件 DPI”的乘积。',
    },
  ] as DpiFaqItem[],
};

export const dpiEn: typeof dpiZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'dpi-test',
  metaTitle: 'Mouse DPI test — estimate your mouse sensitivity online',
  metaDescription:
    'Estimate your mouse DPI (CPI) online: move a fixed physical distance as prompted and work the sensitivity back from the cursor travel on screen. Pointer acceleration must be off for an accurate result.',

  h1: 'Mouse DPI test',
  lede:
    'A browser cannot read a mouse’s hardware DPI, so this runs the sum backwards: you push along a ' +
    'ruler for a **known physical distance**, the page measures how many pixels the cursor travelled ' +
    'on screen, and dividing one by the other gives counts per inch (CPI/DPI). This test **needs an ' +
    'actual ruler**, and pointer acceleration has to be switched off first — otherwise there is no ' +
    'point reading the numbers.',

  beforeHeading: 'Before you start',
  steps: [
    '**Turn off pointer acceleration.** Control Panel → Mouse → Pointer Options → ' +
      'uncheck “**Enhance pointer precision**”. Skip this and there is no point reading anything below.',
    '**Drag the pointer speed slider to the middle (notch 6).** ' +
      'That is the only notch with 1:1 mapping; one notch either way and the result is out by a chunk.',
    '**Press Ctrl+0 to reset browser zoom**, lay the ruler across the mousepad, ' +
      'and line its **0 mark up with the dashed line on screen**.',
    '**Rest the mouse at the ruler’s 0 mark and click the strip to the left of the dashed line**, ' +
      'then push **straight along the ruler** for the chosen distance and **click once more to finish**.',
  ],

  fields: {
    distance: 'Target distance (cm)',
    nominal: 'Nominal DPI',
    scale: 'Display scaling',
  },
  reset: 'Measure again',

  stripHint:
    'Line the ruler’s 0 mark up with the dashed line on the right, rest the mouse there, and click ' +
    'the strip on the left to begin;\npush straight along the ruler to the target mark, then click ' +
    'once more to finish.',
  toastMeta: 'Push {cm} cm straight along the ruler, then click once more to finish',
  toastEdge:
    'The cursor has hit the edge of the screen — pushing further will not move it. Click once to ' +
    'finish, then lower the target distance and measure again.',
  scaleDetected: '{scale}× (detected)',

  verdictLabel: 'Estimated DPI',
  compareMeta: 'Nominal {nominal} · off by {delta}',
  noteIdle:
    'Follow the steps above: rest the mouse at the ruler’s 0 mark, then click the strip to the left ' +
    'of the dashed line to begin.',

  badges: {
    idle: 'Waiting',
    measuring: 'Measuring',
    noMove: 'No movement',
    failed: 'Cannot compute',
    unknownTier: 'No matching tier',
    tier: 'About {tier} DPI',
  },

  stats: {
    pixels: { label: 'Cursor travel', hint: 'net travel along the main axis' },
    duration: { label: 'Duration', hint: '' },
    speed: { label: 'Average speed', hint: '' },
    drift: { label: 'Off-axis', hint: 'movement perpendicular to the main axis' },
  },

  distanceNotes: {
    trial: 'This is a trial run. Once DPI is worked out, the page will tell you how far this mouse ' +
      'can actually be pushed.',
    full: 'The longer the push, the more accurate the result. But once the cursor hits the screen ' +
      'edge it will not move any further, and this page will say so the moment it happens.',
  },

  noteNoMove:
    'No movement was recorded this time. Rest the mouse at the ruler’s 0 mark, click the strip on the ' +
    'left, push, then click once more.',
  noteMeasuring: 'Push straight along the ruler to the {cm} cm mark, then click once more to finish.',
  noteInsufficient: 'Not enough data — push again.',
  noteResult: 'Over {cm} cm the cursor travelled {pixels} pixels in {seconds} seconds.',
  noteDrift:
    'It drifted {px} pixels off the main axis; pushing in an arc makes the reading low, so push once more.',
  noteDeviationWithin:
    'A deviation of {delta} is smaller than this page’s own measurement error (1 mm off over {cm} cm ' +
    'is already {perMm}%), so it says nothing about whether your sensor is off.',
  noteDeviationOver:
    'A deviation of {delta} is beyond this page’s error, so it is worth checking in your mouse ' +
    'driver whether the nominal tier is set correctly.',
  noteMaxDistance:
    'Your mouse is about {dpi} DPI and the cursor only has around {px} pixels of travel in total, ' +
    'so the longest push this page can measure is {maxCm} cm — for a more accurate result, set the ' +
    'target distance to {suggestCm} cm and measure again.',

  cpiHeading: 'Is D really D? It is actually CPI',
  cpiBody:
    'Strictly, this quantity is **CPI** (counts per inch), while **DPI** (dots per inch) was ' +
    'originally a printer specification. But the mouse industry has muddled the two together for ' +
    'decades, and makers, drivers and player communities all write DPI today, so this site does too — ' +
    'what you need to know is that here they mean the same thing.',

  referenceHeading: 'Reference tiers',
  referenceLede:
    'These are common nominal tiers, and all they give you is a rough “about the same as”. ' +
    '**They are not a verdict**: a 5% gap between nominal and measured is normal, and this page ' +
    'measures by hand-pushing a short distance, so a few percent of error is built in.',
  referenceColumns: { tier: 'Tier', counts: 'Counts / cm', use: 'Typical use' },
  referenceUses: {
    office: 'Office work, multi-monitor setups, low-sensitivity players',
    game: 'The most common gaming tier',
    highRes: 'High-resolution screens or high-sensitivity settings',
    driver: 'Usually paired with a sensitivity-reduction multiplier in the driver',
  },
  referenceTier: '{dpi} DPI',

  reachHeading: 'How far you can push is up to your mouse',
  reachBody:
    'This looks like a test where the longer the push the better, and it is not: **the cursor has ' +
    'edges on screen**. Every count the mouse produces per inch of movement becomes one pixel of ' +
    'cursor travel, so for the same physical distance a higher DPI sends the cursor further. Push ' +
    '10 cm at 800 DPI and the cursor has to cover 3150 pixels; at 3200 DPI the same 10 cm is 12600 ' +
    'pixels — long past the edge of the screen. Once the cursor reaches that edge, **pushing the ' +
    'mouse further does not update its coordinates at all**; the distance you measured is cut short, ' +
    'the result comes out low, and nothing on the page looks wrong.',
  reachTrial:
    'So this page starts from **1 cm** by default. The point of that run is not to hand you an ' +
    'accurate number but to find out **how far this mouse can actually be pushed** — once it has a ' +
    'rough DPI, the page works that length out and tells you, and you measure again at that ' +
    'distance. That second run is the most accurate result this page can give you.',

  errorsHeading: 'Where the error comes from',
  errors: [
    '**A hand-pushed distance is imprecise.** This is the biggest one, and **the shorter the ' +
      'distance the worse it bites**: 1 mm off over 1 cm is 10%, while the same 1 mm over 10 cm is ' +
      'only 1%. That is exactly why the section above tells you to push further on the second run. ' +
      'Starting and stopping on the ruler’s marks makes it noticeably better.',
    '**The pointer speed slider is not in the middle.** Off notch 6, the system applies a ' +
      'whole-number scale first and what you measure is the product. This one can skew the result ' +
      'badly, so put it back where it belongs first.',
    '**Pushing off-axis.** This page uses **net displacement**: it measures the straight line ' +
      'between the start and the end point. Push in an arc and what you measure is less than the ' +
      'path you actually travelled, so the result comes out low. The “Off-axis” reading above is ' +
      'there to show you exactly this.',
    '**The system is still accelerating.** Some mouse drivers ignore the system’s “Enhance pointer ' +
      'precision” and apply acceleration of their own. If two runs — one pushed slowly, one pushed ' +
      'fast — come out far apart, something is still accelerating; go and confirm with the ' +
      'acceleration test page.',
  ],

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'Why do I have to turn off “Enhance pointer precision”?',
      a:
        'Because that is **pointer acceleration**. With it on, the system scales your movement up ' +
        'according to how fast you move — push the same 10 cm quickly and the cursor travels ' +
        'further. So the conversion “how many pixels per centimetre” simply does not exist, and the ' +
        'number you measure is tied to how fast your hand moved and cannot be reproduced. Turning ' +
        'it off is a precondition for this test, not an option. Where it lives: Control Panel → ' +
        'Mouse → Pointer Options → uncheck “Enhance pointer precision”.',
    },
    {
      q: 'Why does it only push 1 cm by default? Is a longer push not more accurate?',
      a:
        '**It is, and the longer the better — but you cannot push that far on screen.** Every count ' +
        'the mouse produces per inch of movement becomes one pixel of cursor travel, so an 800 DPI ' +
        'mouse pushed 10 cm has to send the cursor 3150 pixels, while a 1920-wide window gives you ' +
        'only somewhere around 1800 from the left edge to the right. **Once the cursor hits the ' +
        'screen edge it stops for good**: push the mouse further and its coordinates never update, ' +
        'the measured distance is quietly cut short and the DPI comes out low. What makes it worse ' +
        'is that this ceiling **depends on your DPI** — and DPI is the very thing this page is here ' +
        'to measure. So the page starts from 1 cm: get a rough figure first, then use it to tell ' +
        'you how far this mouse can actually be pushed, and measure again at that distance for a ' +
        'much better result. If the cursor reaches the screen edge mid-run, the toast changes its ' +
        'wording on the spot.',
    },
    {
      q: 'Why do I have to enter the display scaling?',
      a:
        'Because the coordinates the browser reports are **CSS pixels**, not mouse counts. At 150% ' +
        'scaling on the desktop, one mouse count is only 1/1.5 CSS pixels, so the CSS pixels you ' +
        'measured have to be multiplied back by 1.5 to give real counts. The page reads the system ' +
        'scale by itself, but if your browser zoom is not 100% (Ctrl+0 resets it) the value it ' +
        'reads is polluted by that zoom, and you have to set it by hand.',
    },
    {
      q: 'The number I measure is a little off my mouse’s rated DPI — is that normal?',
      a:
        'Yes, and there will almost always be a gap. The error has three sources: the distance you ' +
        'push by hand can never be exact (1 mm off over 1 cm is 10%), a pointer speed slider away ' +
        'from the middle (notch 6) adds a fixed multiplier, and a mouse’s own rated DPI is commonly ' +
        'out by around 5%. So this page presents its result as roughly equal to some tier, and ' +
        '**shows you the gap between the DPI you entered and the one it measured** rather than ' +
        'passing or failing it — below {noisePercent}% that gap is the same order of magnitude as ' +
        'this page’s own error, so it says nothing about whether your mouse is off.',
    },
    {
      q: 'Why does the pointer speed slider have to be in the middle?',
      a:
        'Windows’ pointer speed slider has 11 notches, and only the middle one (notch 6) is a 1:1 ' +
        'mapping — one mouse count to one screen pixel. To the left it scales down, to the right it ' +
        'scales up, and it does so in **whole-number steps**, not smoothly. With the slider off ' +
        'centre, what this page measures is the product of the slider’s scale and the hardware DPI.',
    },
  ],
};
