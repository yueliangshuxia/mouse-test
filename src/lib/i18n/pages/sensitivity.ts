/**
 * 灵敏度换算器页(`/sensitivity-converter/`)的文案。
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
 * `sensitivityEn` 声明成 `typeof sensitivityZh` —— 英文版漏一个键、拼错一个键、
 * 多出一个键,都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 带 `**强调**` 的段落
 *
 * 正文里那几个 `**` 是**故意留的标记**,渲染时走 `faq.ts` 的 `faqHtml()`
 * (和 FAQ 答案同一套)。模板里原来是 `<strong>…</strong>`,搬进目录时按这个
 * 约定改写成 `**…**`,句子因此是完整的、没有为了加粗被切成碎片。
 *
 * ## 两个占位符,`fill()` 在运行期替换
 *
 * - `{dpi}` / `{sens}` —— 那两处文案里嵌的是页面上的 `REF_DPI` / `REF_SENS`
 *   常量,所以整句留在目录里,数值由页面填(和 `cps.ts` 的 `{label}` 同一个办法)。
 * - `{dpiTestLink}` —— 正文第二段中间有一个指向 DPI 测试页的 `<a>`。**整句留在
 *   一个键里**,页面把 `{dpiTestLink}` 换成那枚链接(锚文本见 `dpiTestLink`)。
 *   它和 `**` 不冲突:先 `faqHtml()` 把 `**` 转成 `<strong>`,再 `fill()` 塞链接。
 *
 * ## 一处和 `tools.ts` 重复的字符串
 *
 * `dpiTestLink` 就是 `tools['dpi-test'].name`。这里**再存一份是为了让目录自洽**
 * (这一页的每一条可见文字都能在本文件里找到),代价是两处可能漂 —— 接线的
 * 时候若更希望单一事实来源,可以直接读 `tools` 目录,把这一条换掉。
 *
 * ## 游戏名
 *
 * `<option>` 和对照表里那四个游戏名来自 `sensitivity.ts` 的 `GAMES`(`label` 字段),
 * 不在页面文件里。它们是**用户可见文字**,所以在这里照 `GamePreset.id` 建了一份
 * `games` 对照 —— 页面用 `id` 去查译名(`GAMES` 本身一个字没动)。
 */

export interface SensitivityFaqItem {
  q: string;
  a: string;
}

/**
 * 公式那一节的两条。`title` 会被渲染成 `<strong>`,写法同 `cps.ts` 的 `fewerPoints`。
 *
 * **`body` 在英文里必须以一个空格开头。** 模板是
 * `<li><strong>{title}</strong>{body}</li>` —— 标签和正文**直接贴在一起**,
 * Astro 不会替它们在中间补一个空格(实测产物里就是 `</strong>It is…`)。
 * 中文那句 `</strong>它是一个纯乘积` 本来就该贴住(中文不需要词间空格),
 * 英文不补这一格就会印出 `sensitivity.It is a plain product`。
 * 这个空格是**内容**的一部分,所以它住在字符串里,不住在标记里。
 */
export interface SensitivityFormula {
  title: string;
  body: string;
}

export const sensitivityZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'sensitivity-converter',
  /** 页面自己的 `<title>` / meta description。**和 `tools.ts` 里那份逐字相同** */
  metaTitle: '鼠标灵敏度换算器 - eDPI 与 cm/360 在线换算',
  metaDescription:
    '输入鼠标 DPI 和游戏内灵敏度,换算成 eDPI 与 cm/360°。eDPI 只在同一款游戏里可比,cm/360° 才是跨游戏的手感。它算的是换算,不是测量——输入的 DPI 是标称值,想要真值请先去 DPI 测试页量一次。',

  h1: '鼠标灵敏度换算器',
  lede:
    '填上你的 DPI 和游戏内灵敏度,换算出 **eDPI** 与 **cm/360°**(视角转满一圈,' +
    '鼠标要在桌面上走多少厘米)。这一步**不测任何东西**——它把你填的两个数按各游戏的固定常数' +
    '推成另外两个数。所以填进去的 DPI 准不准,直接决定结果准不准。',

  /** `{dpiTestLink}` 由页面填成一枚指向 DPI 测试页的链接,锚文本见下面那个键 */
  dpiLede:
    '你填的 DPI 是驱动里标的**标称值**。厂商标的值和实测值差 5% 是常态,' +
    '想拿真值请先去 {dpiTestLink}沿着尺子量一次 —— 再回到这里把量到的数填进去。' +
    '这一页算得再准,也救不回一个错的前提。',
  /** 就是 `tools['dpi-test'].name`,页面若走 tools 目录取名字可以不要这一条 */
  dpiTestLink: '鼠标 DPI 测试',

  fields: {
    game: '游戏',
    dpi: '鼠标 DPI',
    sens: '游戏内灵敏度',
  },

  /** 四个游戏名,键是 `GamePreset.id` —— 页面拿 id 查译名,`GAMES` 不用改 */
  games: {
    cs2: 'CS2 / CS:GO',
    apex: 'Apex 英雄',
    valorant: '无畏契约',
    overwatch2: '守望先锋 2',
  },

  stats: {
    cm360: { label: 'cm / 360°', hint: '视角转满一圈要走的距离,跨游戏可比的就是它' },
    edpi: { label: 'eDPI', hint: 'DPI × 灵敏度,只在同一款游戏里可比' },
    cm180: { label: '转身 180°', hint: '半个 360°,大约是一次甩枪的距离' },
  },

  /** 输入不成立时那一行说明(脚本里拼的) */
  noteInvalid:
    '填一个大于 0 的 DPI 和灵敏度才会出数。空着或填 0 时这里显示破折号 —— ' +
    '"算不出来"和"结果是 0"是两件事。',
  /** 查不到游戏时的兜底名 */
  gameFallback: '这款游戏',
  /** 结果那一行。`{game}` / `{dpi}` / `{sens}` / `{cm}` 都是运行期填的 */
  noteResult:
    '{game}里,{dpi} DPI 配上灵敏度 {sens},视角转满一圈要在桌面上走 {cm} 厘米。' +
    '换游戏时 eDPI 不变,cm/360° 会变 —— 后者才是真正在描述手感的那一个。',

  constantsHeading: '各游戏的常数',
  constantsLede:
    '换算要靠一个游戏自己写死的数:**yaw** —— 灵敏度为 1 时,鼠标每走一个计数,' +
    '视角转过多少度。它是玩家改不了的,也正是"同一个灵敏度数字在这款游戏和那款游戏里' +
    '手感完全不同"的全部原因。',
  /** 里面的 `{dpi}` / `{sens}` 对应 `REF_DPI` / `REF_SENS` */
  constantsTableLede:
    '下面把这个数和它算出来的结果一起印出来,是为了让你**能核对**,而不是只能信一个' +
    '不透明的结果。第三列是 {dpi} DPI、灵敏度 {sens} 时的 cm/360°,可以拿来对你自己的设置。',
  tableColumns: {
    game: '游戏',
    yaw: 'yaw(度 / 计数)',
    round: '{dpi} DPI、灵敏度 {sens} 时转一圈',
  },

  formulasHeading: '这两个数都怎么来的',
  formulas: [
    {
      title: 'eDPI = DPI × 游戏内灵敏度。',
      body: '它是一个纯乘积,不含任何游戏常数,所以只在同一款游戏里横着比才有意义。',
    },
    {
      title: 'cm/360° = (360 × 2.54) ÷ (DPI × 灵敏度 × yaw)。',
      body:
        '分子是"转满一圈要转过多少度 × 一英寸多少厘米",分母是"鼠标走一个计数,' +
        '视角转多少度 × 每个计数对应多少灵敏度点"。两者一除,单位就落到了厘米上。',
    },
  ] as SensitivityFormula[],

  feelHeading: '手感的其他变量',
  feelBody:
    'cm/360° 一样、手感却不一样,这种事很常见。除开上面 FAQ 里那几条,' +
    '还有一个容易被忽略的:**鼠标握法和手臂 / 手腕的分工**。同样 40cm 转一圈,' +
    '靠手腕甩的人会觉得太慢,靠整条手臂带的人会觉得刚好 —— 公式里没有手,只有距离。',

  faqHeading: '常见问题',
  faq: [
    {
      q: 'eDPI 和 cm/360° 有什么区别?为什么说 eDPI 不能跨游戏比?',
      a:
        'eDPI = DPI × 游戏内灵敏度,它**完全由你自己填的两个数决定**,和你在玩哪款游戏无关。' +
        '问题就在这里:两款游戏里填同样的数,eDPI 一样,可视角转起来的速度完全不同 ——' +
        '因为每款游戏对"灵敏度 1"的定义不一样(下面表格里那个 yaw 就是各家的定义)。' +
        '所以 eDPI 只能**在同一款游戏里**横着比。真正跨游戏可比的是 cm/360°,' +
        '它把游戏自己的常数也算了进去,问的是"鼠标要在桌面上走多少厘米,视角才转满一圈"。',
    },
    {
      q: '我填的是驱动里标的 DPI,这个数准吗?',
      a:
        '**不一定准,而且这一页不会替你验证它。**厂商标的 DPI 和实测值差 5% 左右是常态,' +
        '有些鼠标在驱动里改过几档之后偏差更大。这一页做的是**换算**,输入一个不准确的' +
        'DPI,算出来的 cm/360° 会按同样的比例一起偏 —— 数字看着很精确,错的却是里面那个前提。' +
        '想知道手上这只鼠标的真实值,请先去 DPI 测试页沿着尺子量一次,再把量到的数填到这里来。',
    },
    {
      q: '算出来的 cm/360° 和我实际手感对不上?',
      a:
        '几个常见原因:**(1)** 驱动里的 DPI 不是真值(见上一条);' +
        '**(2)** 游戏里开了"鼠标加速"或原始输入相关的选项,那会让物理位移和视角转角不再成比例,' +
        '而这个公式的前提正是"成正比";**(3)** 视角范围(FOV)不同 —— cm/360° 与 FOV 无关,' +
        '但 FOV 一变,同样的转角在屏幕上看起来的位移就变了,手感自然跟着变。' +
        '这个数是一个**换算结果**,不是对你手感的判决。',
    },
    {
      q: '为什么只有这几款游戏?',
      a:
        '因为只有这几款的 yaw 取值是明确的,而且我们把每一个都印在下面的表格里,方便你核对。' +
        '**宁可少收几款,也不给一个看起来精确的错数字** —— 猜错一个常数,算出来的 cm/360° ' +
        '会一路错到用户在游戏里重新适应一套手感。要加新游戏,先去把该游戏的 yaw 核实清楚。',
    },
  ] as SensitivityFaqItem[],
};

export const sensitivityEn: typeof sensitivityZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'sensitivity-converter',
  metaTitle: 'Mouse sensitivity converter — eDPI and cm/360 online',
  metaDescription:
    'Enter your mouse DPI and in-game sensitivity to convert them to eDPI and cm/360°. eDPI is only comparable within a single game; cm/360° is the figure that carries across games. This is a conversion, not a measurement — the DPI you enter is the nominal value, so measure it on the DPI test page first if you want the real one.',

  h1: 'Mouse sensitivity converter',
  lede:
    'Enter your DPI and in-game sensitivity to get **eDPI** and **cm/360°** (how many centimetres ' +
    'the mouse must travel on the desk for the view to turn a full circle). This step **measures ' +
    'nothing** — it pushes the two numbers you enter through each game’s fixed constant to produce ' +
    'two other numbers. So how accurate the DPI you enter is directly decides how accurate the ' +
    'result is.',

  dpiLede:
    'The DPI you enter is the **nominal value** printed in your driver. A gap of around 5% between ' +
    'the maker’s figure and the measured one is normal; for the real figure, go to the ' +
    '{dpiTestLink} and measure along a ruler first — then come back and enter what you measured. ' +
    'However precise this page is, it cannot rescue a wrong premise.',
  dpiTestLink: 'Mouse DPI test',

  fields: {
    game: 'Game',
    dpi: 'Mouse DPI',
    sens: 'In-game sensitivity',
  },

  games: {
    cs2: 'CS2 / CS:GO',
    apex: 'Apex Legends',
    valorant: 'VALORANT',
    overwatch2: 'Overwatch 2',
  },

  stats: {
    cm360: {
      label: 'cm / 360°',
      hint: 'distance to travel for a full turn — the figure that compares across games',
    },
    edpi: { label: 'eDPI', hint: 'DPI × sensitivity, only comparable within one game' },
    cm180: { label: '180° turn', hint: 'half a 360°, roughly one flick' },
  },

  noteInvalid:
    'Only a DPI and sensitivity greater than 0 will produce a result. Left blank or set to 0, this ' +
    'shows a dash — "cannot compute" and "the result is 0" are two different things.',
  gameFallback: 'This game',
  noteResult:
    'In {game}, {dpi} DPI with sensitivity {sens} means the mouse must travel {cm} centimetres on ' +
    'the desk for a full turn. Switch games and eDPI stays the same while cm/360° changes — the ' +
    'latter is the one that actually describes the feel.',

  constantsHeading: 'Each game’s constant',
  constantsLede:
    'The conversion rests on one number baked into each game: **yaw** — how far the view turns per ' +
    'count of mouse movement at sensitivity 1. Players cannot change it, and it is the entire ' +
    'reason the same sensitivity number feels completely different in this game and that one.',
  constantsTableLede:
    'The table below prints that number alongside the result it produces so you can **check it ' +
    'yourself**, rather than having to trust an opaque result. The third column is cm/360° at ' +
    '{dpi} DPI and sensitivity {sens}, which you can hold against your own settings.',
  tableColumns: {
    game: 'Game',
    yaw: 'yaw (degrees per count)',
    round: 'Full turn at {dpi} DPI, sensitivity {sens}',
  },

  formulasHeading: 'Where both numbers come from',
  formulas: [
    {
      title: 'eDPI = DPI × in-game sensitivity.',
      body:
        ' It is a plain product with no game constant in it, so it only means anything compared ' +
        'sideways within a single game.',
    },
    {
      title: 'cm/360° = (360 × 2.54) ÷ (DPI × sensitivity × yaw).',
      body:
        ' The numerator is "degrees in a full turn × centimetres in an inch"; the denominator is ' +
        '"degrees the view turns per count × how many sensitivity points each count is worth". ' +
        'Divide one by the other and the units land on centimetres.',
    },
  ],

  feelHeading: 'Other things that change the feel',
  feelBody:
    'The same cm/360° with a different feel is very common. Beyond the points in the FAQ above, ' +
    'there is one that is easy to miss: **how you grip the mouse and how the work is split between ' +
    'arm and wrist**. At the same 40 cm for a full turn, someone who flicks from the wrist will ' +
    'find it too slow, while someone who drives with the whole arm will find it just right — the ' +
    'formula has no hand in it, only distance.',

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'What is the difference between eDPI and cm/360°, and why can’t eDPI be compared across games?',
      a:
        'eDPI = DPI × in-game sensitivity, and it is **decided entirely by the two numbers you ' +
        'enter**, with no reference to which game you play. That is exactly the problem: enter the ' +
        'same numbers in two games and eDPI matches, yet the view turns at completely different ' +
        'speeds — because each game defines "sensitivity 1" differently (the yaw in the table below ' +
        'is each one’s definition). So eDPI can only be compared sideways **within a single game**. ' +
        'What does carry across games is cm/360°, which folds the game’s own constant in and asks ' +
        '"how many centimetres must the mouse travel on the desk for the view to turn a full circle".',
    },
    {
      q: 'I entered the DPI shown in my driver — is that number accurate?',
      a:
        '**Not necessarily, and this page will not verify it for you.** A gap of around 5% between ' +
        'the maker’s DPI and the measured value is normal, and some mice drift further once you ' +
        'have changed steps in the driver. This page does a **conversion**: feed in an inaccurate ' +
        'DPI and the cm/360° comes out off by the same proportion — the number looks precise, but ' +
        'the premise inside it is wrong. To find the real value for the mouse in your hand, go to ' +
        'the DPI test page and measure along a ruler once, then enter what you measured here.',
    },
    {
      q: 'The cm/360° it works out does not match how it actually feels?',
      a:
        'A few common causes: **(1)** the DPI in the driver is not the real value (see above); ' +
        '**(2)** the game has "mouse acceleration" or a raw-input option switched on, which stops ' +
        'physical movement and view rotation being proportional — and this formula assumes they ' +
        'are; **(3)** a different field of view (FOV) — cm/360° is independent of FOV, but change ' +
        'the FOV and the same rotation looks like a different amount of movement on screen, so the ' +
        'feel changes with it. This number is a **conversion result**, not a verdict on your feel.',
    },
    {
      q: 'Why only these few games?',
      a:
        'Because only these games have a clearly defined yaw, and we print every one of them in the ' +
        'table below so you can check. **We would rather cover fewer games than hand you a wrong ' +
        'number that looks precise** — get one constant wrong and the cm/360° is off all the way ' +
        'to the user re-learning a whole new feel in-game. To add a new game, verify its yaw first.',
    },
  ],
};
