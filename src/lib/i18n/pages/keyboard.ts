/**
 * 键盘按键测试页(`/keyboard-test/`)的文案。
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
 * `keyboardEn` 声明成 `typeof keyboardZh` —— 英文版漏一个键、拼错一个键、
 * 多出一个键,都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 搬进来时的机械替换
 *
 * - `<strong>…</strong>` → `**…**`。渲染走 `faq.ts` 的 `faqHtml()` +
 *   `set:html`(和 FAQ 答案同一套),整段因此可以住在一个键里,不必为了加粗
 *   把句子切成碎片 —— 拆开之后翻译的人看不到完整的句子。
 * - `<code>…</code>` → `` `…` ``(反引号)。源模板里的 `<code>` 标签留着会被
 *   `faqHtml()` 的转义原样印出来,所以必须换;而反引号**现在也是 `faqHtml()`
 *   认的标记**(渲染成 `<code>`),所以这一条是**等价替换**,连等宽都保住了。
 *   **这里原先记的是"只能退化成 `**`(粗体)",那条权衡已经作废** ——
 *   `faq.ts` 补上反引号之后不必要了。本页受它影响的是井下面那条 notice
 *   (`noticeBlocked` / `noticeFnKeys`),源模板里 `Ctrl+W`、`F11` 这些共七处。
 * - **FAQ 第 4 条里那对反引号是同一个成因、同一个修法**:源文件里那句写的
 *   就是 `` `KeyboardEvent.repeat` ``,当时 `faqHtml()` 不认反引号,于是页面上
 *   真的印着两个反引号(上线很久的旧账)。反引号进了 `faqHtml()` 之后这一处
 *   顺带修好了 —— 转换后的页面上它会从"两个反引号"变成一段等宽片,那是好的变化。
 *
 * ## 这一页没有 `mark-danger` 那类带颜色的 span,也没有 `<br />`
 *
 * 全页的强调只有 `<strong>` 和 `<code>` 两种,分别落成 `**` 和反引号。
 * 所以这份目录里**没有 `{mark}` 那一套**,也没有 `{br}` 占位符 ——
 * 和 `scroll.ts` 的 `{redMark}`、`holdDrag.ts` 的 `{logLedeMark}`、
 * `polling.ts` 的 `{br}` 不一样,不是漏了。
 *
 * ## 104 枚键帽上的字**不在这份文件里**,而且**也不需要翻**
 *
 * 键帽的 `label`(以及日志里那个"这个键叫什么")来自 `keyboard-layout.ts` 的
 * `ALL_KEYS`,由 `keyLabel(code)` 翻出来。那些字是**物理键帽上印的东西**
 * (`Esc` / `F1` / `Q` / `Ctrl` / `Win` / `Space` / `PgUp` / `↑` …),
 * 中文版和英文版逐字相同,所以**没有一条需要进目录**;
 * `keyLabel()` 对没收录的键原样返回 `KeyboardEvent.code`(如 `NumpadAdd`),
 * 那是一个**标识符**而不是文案。
 * 本页也**没有**任何逐键生成的提示语:键帽上没有 `title`、没有 `aria-label`,
 * 只有一个数字节点(`.kb-key__n`),而那个数是纯数字。
 *
 * ## 运行期填的占位符
 *
 * | 占位符 | 在哪 | 填什么 |
 * | --- | --- | --- |
 * | `{count}` | `lede`、`stats.unique.hint` | `keyboard-layout.ts` 的 `ALL_KEYS.length`(104,构建期常量) |
 * | `{n}` | `runtime.logIndex` | 日志条目的序号 |
 * | `{ms}` | `runtime.logHold` | 这一次按住持续了多久(毫秒,由 `performance.now()` 量出) |
 * | `{unique}` / `{total}` | `runtime.uniqueValue` | 「已触发的键」那一格的值与总数 |
 *
 * 每句都**整句住在一个键里**,由页面 `fill()` 填 —— 不在句子中间断开,
 * 理由同别页。
 *
 * `runtime.uniqueValue`(`12 / 104` 那个格式)一条字都没有,**但它是脚本拼出来、
 * 用户看得见的字符串**,所以照样收进来 —— 同 `doubleClick.ts` 的 `logIndex`、
 * `scroll.ts` 的 `dash`。两种语言里逐字相同。
 *
 * ## 刻意写死的散文(改常量时要一起改)
 *
 * 下面这些在源文件里本来就是写死的中文,不是占位符 —— 同 `dpi.ts` 里那条
 * 「`1 厘米` 是散文不是占位符」、`holdDrag.ts` 的同名小节:
 *
 * - `logLede` 里的 **`12`**(对应脚本的 `LOG_LIMIT = 12`);
 * - FAQ 第 1 条里的 **`6 个键`**(薄膜键盘的典型上限,和任何常量无关);
 * - `steps[1]` 里的 **`三到六个键`** / **`6 个`**、`steps[2]` 里的
 *   **`五个键`** / **`三个`**、`boundaryPoints[0]` 里的 **`上面第 1 步`**
 *   (`steps` 的编号由 `ol.steps` 的 CSS 画,不是文案)。
 *
 * 还有一处**不该翻、也不该动**的字面量:`FAQ` 第 2 条里的 `Alt+Tab`、
 * `Ctrl+W`、`Ctrl+T`、`Win` 和 `BIOS`(按键与专名),两边目录里逐字相同。
 *
 * ## 不在这一份里的东西
 *
 * - 源文件里的代码注释(中英混着的那些)是给开发者看的,不是用户文案。
 * - **本页没有 `throw new Error(...)` 文案、也没有 `console.*`**,
 *   所以没有要跳过的开发者字符串。
 * - `INTERCEPTED` 那一组 `KeyboardEvent.code` 和 `logIndex` 里的 `#` 是结构,
 *   按上面那条只留下带字的那个键。
 * - **能力告警**由 `ui.ts` 的 `mountCapabilityNotices()` 中央渲染
 *   (`capabilities.ts` 只负责探测),不归这一页。
 */

/** FAQ 一行的形状。**文案两边键必须一样**,见文件头 */
export interface KeyboardFaqItem {
  q: string;
  a: string;
}

export const keyboardZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'keyboard-test',
  /** 页面自己的 `<title>` / meta description。**和 `tools.ts` 里那份逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '键盘按键测试 - 在线检测按键失灵与鬼键',
  metaDescription:
    '在线键盘测试,按下任意键即时高亮,检测失灵按键与同时按键冲突(鬼键),支持全键位显示。',

  h1: '键盘按键测试',
  /** 导语。`{count}` 是收录的键位数,见文件头 */
  lede:
    '按下键盘上的任意键,对应的键帽会立即高亮。用来排查**某个键失灵**,' +
    '或者验证**同时按下多个键时会不会有键被漏掉**(键盘的无冲能力)。' +
    '共收录 {count} 个键位,含小键盘与编辑键。',

  /**
   * 井下面那条 `.notice--info` 里的两条。
   *
   * 它**不是**空态提示,而是一份"这几个键测不到"的清单 —— 所以渲染走
   * `faqHtml()` + `set:html`(那几处 `<code>` 在目录里写成反引号 —— `faq.ts`
   * 认这个,渲染回来还是等宽的 `<code>`,见文件头)。
   */
  noticeBlocked:
    '有几种组合是浏览器和系统**抢在前面处理掉**的,网页拿不到,别当成按键失灵:' +
    '`Ctrl+W`(关标签)、`Ctrl+T`(新标签)、`Alt+Tab`(切窗口)、' +
    '`Ctrl+Shift+Esc`(任务管理器)以及键盘上的 `Win` 键。',
  noticeFnKeys:
    '按 `F11`、`F12` 之类的功能键时,浏览器可能自己先响应(全屏、开发者工具),' +
    '这也是正常的。',

  reset: '重置',
  /** 「重置」旁边那行小提示 */
  controlsHint: '没亮过的键会保持暗色,一闪即逝的键也来得及看',

  /** 判定块左边那个标签 + 它后面的单位 */
  verdictLabel: '当前按住',
  verdictUnit: '个键',
  /** 判定块下面那句说明的**空态** */
  verdictNoteIdle: '把光标放在这个页面上,然后按键',

  /** 四格读数。`hint` 为空串表示那一格没有说明;`unit` 只有一格有 */
  stats: {
    presses: { label: '累计按下', hint: '不含系统自动重复' },
    unique: { label: '已触发的键', hint: '共 {count} 个' },
    maxHeld: { label: '同时按住最多', unit: '键', hint: '反映无冲能力' },
    stuck: { label: '仍未松开', hint: '失焦导致的不算' },
  },

  logHeading: '按键记录',
  /** 日志说明。**`12` 对应脚本的 `LOG_LIMIT`,见文件头** */
  logLede: '最近 12 次按键,新的在上面。',

  /** 「怎么判断是坏键还是无冲不足」那一节。**每条开头的 `**…**` 是卡片标题**,见文件头 */
  stepsHeading: '怎么判断是坏键还是无冲不足',
  steps: [
    '**逐个按一遍。**按过的键会变成"已触发"的状态色,所以按完一整轮,' +
      '哪个键还是暗的一目了然——这就是失灵键。**不用一边按一边盯着看**,' +
      '这一点对排查闪烁式的接触不良特别有用。',
    '**再同时按住三到六个键。**如果单个按都亮、一起按就有键不亮,' +
      '那是键盘的无冲能力不足(鬼键),不是坏键。薄膜键盘一般只能同时识别 6 个,' +
      '机械键盘视轴体和二极管设计而定。',
    '**看"同时按住最多"这个数。**你按住了五个键,这里却只显示三个,' +
      '说明有两个被键盘吃掉了。这个数字是判断无冲能力最直接的证据。',
  ] as string[],

  /** 「这项测试的边界」那一节的每段。**段中的 `**…**` 是强调** */
  boundaryHeading: '这项测试的边界',
  boundaryPoints: [
    '浏览器能看到的只有**操作系统转发过来的按键**。键盘固件在检测到' +
      '按键冲突时会直接把冲突的键丢掉,系统根本不知道你按过——所以"某个键没亮"这个现象,' +
      '本页只能如实报告,无法告诉你是键盘吃掉的还是那个键本身坏了。' +
      '区分方法就是上面第 1 步:单独按一次。',
    '另外,**这一页测不出按键的"手感"和"触发深度"**。' +
      '微动开关的触发行程、段落感、以及轴的磨损程度,都要靠手感和专业设备,' +
      '网页拿到的只有"按下"和"松开"两个瞬间。能测的是**时机**和' +
      '**有没有漏**,仅此而已。',
  ] as string[],

  faqHeading: '常见问题',
  faq: [
    {
      q: '同时按好几个键,有一个不亮,是键盘坏了吗?',
      a:
        '先单独按一次那个键。单独按也不亮,才是键坏了;单独按能亮、一起按就不亮,那是键盘的**无冲能力**不够,' +
        '也就是俗称的鬼键。薄膜键盘普遍只能同时识别 6 个键左右,而且不同按键组合的表现还不一样,' +
        '这是硬件设计决定的,换键盘才能解决,和系统设置无关。',
    },
    {
      q: '为什么某些组合键按下后页面没反应?',
      a:
        '因为那些组合被浏览器或系统抢走了,网页拦不住。Ctrl+W 关标签页、Ctrl+T 开新标签、Alt+Tab 切窗口、' +
        '以及键盘上的 Win 键,都在浏览器拿到事件之前就被处理掉了。要测这些键,用专门的键盘测试软件,' +
        '或者去 BIOS 里测。',
    },
    {
      q: '按了 Alt+Tab 回来之后,有键一直亮着?',
      a:
        '这是正常的,不是粘键。窗口失去焦点时浏览器不再收到 keyup,页面就无从知道你已经松手了。' +
        '本页在窗口失焦时会主动清空按键状态,所以看到的是"自己灭掉"而不是"一直亮着"。' +
        '如果你什么都没做,某个键却自己亮着不灭,那才是真的粘键。',
    },
    {
      q: '为什么按住一个键,计数只加了 1?',
      a:
        '因为系统的自动重复被刻意过滤掉了。按住不放时操作系统会以每秒几十次的频率反复发送按下事件,' +
        '那是软件在模拟连击,不是你在按。本页用 `KeyboardEvent.repeat` 把这类事件排除在外,' +
        '只有真正的按下才计数。',
    },
  ] as KeyboardFaqItem[],

  // -------------------------------------------------------------------------
  // 以下都是 `<script>` 里拼出来的句子。整句一个键,占位符由 `fill()` 填。
  // -------------------------------------------------------------------------

  /** `<script>` 里那几个字面量。**它们不是正文,但都是用户看得见的字** */
  runtime: {
    /** 右上角那枚徽章的两档:还没按过 / 有键正按着 */
    badgeIdle: '等待按键',
    badgeHeld: '正在按下',
    /** 判定块下面那句说明(测过、此刻没有键按着) */
    noteNone: '没有键被按住',
    /** 日志空态 */
    logEmpty: '还没有按键记录',
    /** 日志每一条的序号。`{n}` 是第几次 */
    logIndex: '#{n}',
    /** 日志每一条末尾的说明。`{ms}` 是这一次按住多久 */
    logHold: '按住了 {ms} ms',
    /** 那个键一直没等到 keyup 时,日志时长那一格写的字 */
    logOpen: '按着没松',
    /** 几个键名之间的连接符(判定块下面那行就这么拼) */
    nameJoiner: ' + ',
    /** 「已触发的键」那一格的值。`{unique}` 是触发数,`{total}` 是收录总数 */
    uniqueValue: '{unique} / {total}',
  },
};

export const keyboardEn: typeof keyboardZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'keyboard-test',
  metaTitle: 'Keyboard key test — check for dead keys and ghosting online',
  metaDescription:
    'Online keyboard test: every key highlights the moment you press it. Detects dead keys and simultaneous-press conflicts (ghosting), and shows the full key layout.',

  h1: 'Keyboard key test',
  lede:
    'Press any key on the keyboard and its key cap lights up at once. Use it to track down ' +
    '**a key that has stopped responding**, or to check **whether a key gets dropped when you ' +
    'hold several at once** (the keyboard’s rollover). {count} keys are covered, including the ' +
    'numpad and the editing keys.',

  noticeBlocked:
    'A few combinations are **taken by the browser or the system** before the page ever sees ' +
    'them — do not read that as a dead key: `Ctrl+W` (close tab), `Ctrl+T` (new tab), ' +
    '`Alt+Tab` (switch window), `Ctrl+Shift+Esc` (Task Manager) and the `Win` key on the ' +
    'keyboard.',
  noticeFnKeys:
    'When you press a function key such as `F11` or `F12`, the browser may act on it first ' +
    '(full screen, developer tools). That is normal too.',

  reset: 'Reset',
  controlsHint: 'A key that never lit stays dim, and a key that only flashes is still easy to catch',

  verdictLabel: 'Currently held',
  verdictUnit: 'keys',
  verdictNoteIdle: 'Put the cursor on this page, then press a key',

  stats: {
    presses: { label: 'Total presses', hint: 'excludes the system’s auto-repeat' },
    unique: { label: 'Keys seen', hint: 'out of {count}' },
    maxHeld: { label: 'Most held at once', unit: 'keys', hint: 'reflects the rollover' },
    stuck: { label: 'Still down', hint: 'those caused by losing focus do not count' },
  },

  logHeading: 'Key log',
  logLede: 'The last 12 presses, newest on top.',

  stepsHeading: 'How to tell a dead key from poor rollover',
  steps: [
    '**Press each key once, one after another.** A key that has been pressed takes on the ' +
      '“seen” colour, so after one full pass it is obvious at a glance which keys are still ' +
      'dim — those are the dead ones. **You do not have to watch the screen while you press**, ' +
      'which is what makes this so good for catching contact problems that come and go.',
    '**Now hold three to six keys at once.** If each key lights up on its own but one goes dark ' +
      'when they are pressed together, that is the keyboard’s rollover falling short (ghosting), ' +
      'not a dead key. A membrane keyboard generally recognises only 6 keys at once; on a ' +
      'mechanical keyboard it depends on the switches and the diode design.',
    '**Watch the “Most held at once” figure.** You are holding five keys and it shows three: two ' +
      'were eaten by the keyboard. That number is the most direct evidence there is on rollover.',
  ],

  boundaryHeading: 'Where this test stops',
  boundaryPoints: [
    'All a browser can see is **the key presses the operating system forwards to it**. When the ' +
      'keyboard firmware detects a conflict it simply discards the conflicting key, and the ' +
      'system never knows you pressed it — so when “a key did not light up”, this page can only ' +
      'report that faithfully; it cannot tell you whether the keyboard ate the press or the key ' +
      'itself is broken. The way to tell them apart is step 1 above: press it on its own.',
    'Also, **this page cannot measure how a key feels or how far it has to travel**. A switch’s ' +
      'actuation point, its tactile bump and how worn it is all need your hands and specialised ' +
      'equipment; all a web page gets is the instant of the press and the instant of the release. ' +
      'What it can measure is **timing** and **whether anything is missed** — nothing more.',
  ],

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'I hold several keys and one of them does not light up — is the keyboard broken?',
      a:
        'Press that key on its own first. If it does not light up on its own either, the key is broken; ' +
        'if it lights up on its own but not when pressed together, the keyboard’s **rollover** falls short — ' +
        'what is commonly called ghosting. Membrane keyboards generally recognise only about 6 keys at once, ' +
        'and different combinations behave differently. That is decided by the hardware design, and only a ' +
        'different keyboard fixes it; no system setting is involved.',
    },
    {
      q: 'Why does the page not react to some key combinations?',
      a:
        'Because the browser or the system has taken those combinations, and a web page cannot stop it. ' +
        'Ctrl+W closes the tab, Ctrl+T opens a new one, Alt+Tab switches windows, and the Win key — all of ' +
        'them are handled before the browser gets the event. To test those keys, use dedicated keyboard ' +
        'testing software, or test them in the BIOS.',
    },
    {
      q: 'After Alt+Tab back, a key is still lit up?',
      a:
        'That is normal, not a stuck key. While the window is unfocused the browser stops receiving keyup, ' +
        'so the page has no way to know you have released. This page clears the key state itself when the ' +
        'window loses focus, so what you see is keys going out on their own rather than staying lit. If you ' +
        'did nothing and a key stays lit and never goes out, that really is a stuck key.',
    },
    {
      q: 'Why does holding a key add only 1 to the count?',
      a:
        'Because the system’s auto-repeat is deliberately filtered out. While you hold a key down, the ' +
        'operating system sends the press event over and over, several dozen times a second — that is ' +
        'software simulating repeated presses, not you pressing. This page excludes those events using ' +
        '`KeyboardEvent.repeat`, so only a real press is counted.',
    },
  ],

  runtime: {
    badgeIdle: 'Waiting for a key',
    badgeHeld: 'Key held',
    noteNone: 'No key is held',
    logEmpty: 'No key presses recorded yet',
    logIndex: '#{n}',
    logHold: 'held {ms} ms',
    logOpen: 'held, not released',
    nameJoiner: ' + ',
    uniqueValue: '{unique} / {total}',
  },
};
