/**
 * 按键 / 滚轮 / 长按 / 双击测试页(`/button-test/`)的文案。
 *
 * ## 为什么一页一个文件
 *
 * 全站要做双语,量是约 2000 条字符串、21 个页面。**每页一份文件**是为了让
 * 这件事可以一页一页做、也可以几页同时做而互不冲突 —— 都塞进 `zh.ts` /
 * `en.ts` 两个大文件的话,两个人(或两个 agent)同时动一页就会撞在一起。
 *
 * ## 两边的键必须一样,而这是**机制**不是约定
 *
 * `buttonEn` 声明成 `typeof buttonZh` —— 英文版漏一个键、拼错一个键、多出一个键,
 * 都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 带 `**强调**` 的段落
 *
 * 正文里那几个 `**` 是**故意留的标记**,渲染时走 `faq.ts` 的 `faqHtml()`
 * (和 FAQ 答案同一套)。所以整段可以住在一个键里,不必为了加粗把句子拆成
 * 一堆片段 —— 拆开之后翻译的人看不到完整的句子,译文必然别扭。
 *
 * 搬进来的时候做过两处**机械替换**,都不是改写:
 *
 * - `<strong>…</strong>` → `**…**`。和 `doodle.ts` 那条是同一条规矩。
 * - `<code>…</code>` → `**…**`。**这一处是权衡,不是等价。** 源文件里
 *   `pointerdown` / `pointermove` / `pointerup` 三个词用的是 `<code>`(等宽
 *   + 浅底 + 细框的那个小片),而 `faqHtml()` 只认 `**`、并且会把 `<`/`>`
 *   转义成 `&lt;`/`&gt;`。留着 `<code>` 的话,屏幕上会**原样印出标签**;
 *   所以取 `**` —— 保住"这几个词被单独标出来了",代价是从等宽片变成粗体。
 *   理由和 `doodle.ts` 把 `<em>测</em>` 写成 `**测**` 是同一条。
 *
 * ## 英文那几条 `body` 开头的那个空格是内容,不是手滑
 *
 * 一行动渲染成 `<strong>{title}</strong>{body}`(见 `cps.ts` 里那条同类注释),
 * 而 Astro **不会**在两个表达式之间插空格 —— 中文那侧 `——` 直接接上是对的,
 * 英文却会印成 `pressed— the switch`。所以英文的 `results[].body` 和
 * `detailPoints[].body` 自己带一个前导空格;**中文那侧保持紧凑**。
 *
 * ## 五个键帽的名字**不在这份文件里**
 *
 * `左键` / `中键` / `右键` / `侧键 4` / `侧键 5` 和它们那行小注
 * (`主键` / `滚轮按下` / `副键` / `后退` / `前进`)都来自 `mouse-buttons.ts` 的
 * `BUTTONS`,而那张表**按键页和拖拽页共用**,`buttonName()` 还被分析层用着。
 * 抄一份进来只会多出一份要对齐的清单 —— 和 `keyboard-layout.ts` / `theme.ts`
 * 是同一条理由(一个值要在多个消费者之间一致,就抽模块,别手抄)。
 *
 * 所以这里只留下**引用键名的那两个句式**(`runtime.faultButton` 的 `{name}`、
 * `runtime.faultWheel` 的「滚轮」),`{name}` 由接线时填进键名。
 * **`BUTTONS` 的本地化是中央的一件事**,不归这一页 —— 两个页面都要用。
 *
 * ## `{ms}` 那个占位
 *
 * `results` 最后一条里「相邻两次间隔 < {ms}ms」的 `{ms}`,接线时填
 * `analysis.ts` 的 `CLICK_CHATTER_MS`(50)。**它是构建期常量,不是运行时读数**,
 * 所以这里仍然按"整句一个键"放着,不在句子中间断开。
 *
 * ## `stats.fault.hint` 是两处共用的同一句
 *
 * 它既是那格读数开局的提示(页面上的 `StatPanel`),也是脚本 `renderFault()`
 * 里"还没测到能下判断的东西"那一档写回去的同一句话。**一处键,两处出口** ——
 * 抄成两个键的话迟早会漂。
 */

/** 「怎么看结果」那张卡片网格里的一行 */
export interface ButtonCheckRow {
  /** 卡片标题 —— 源文件里第一个 `<strong>` 那句(`.prose--cards` 会把它排成标题行) */
  title: string;
  /** 标题之后的正文。**含 `**` 标记**,渲染走 `faqHtml` */
  body: string;
  /** 正文中间嵌着的小列表。**只有最后一条有**,没有就不写 */
  subPoints?: string[];
  /** 小列表之后接着写的收尾正文。同上,只有最后一条有 */
  tail?: string;
}

/** 「想看细的,去这三页」那一节的一行。链接文字在这里,`href` 不在(那是结构) */
export interface ButtonDetailRow {
  /** 行内链接的文字 */
  link: string;
  /** 链接之后那句话,以 `——` 起头。**含 `**` 标记** */
  body: string;
}

export const buttonZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'button-test',
  /** 页面自己的 <title> / meta description。**中文那份和 `tools.ts` 逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '鼠标按键 / 滚轮 / 长按 / 双击测试 - 在线检测左右中键与侧键是否失灵',
  metaDescription:
    '免费在线鼠标测试:实时检测左键、右键、中键及侧键的点击响应,记录按下次数、按住时长、双击间隔与滚轮方向,帮助判断微动开关是否老化。无需安装任何软件。',

  h1: '鼠标按键 / 滚轮 / 长按 / 双击测试',
  lede:
    '在下面的鼠标图上按任意一个键,对应的那一瓣会实时亮起来;滚滚轮,轮子会亮并指出方向。' +
    '按下哪个键、按住多久、同一个键两次点击隔了多少毫秒、滚轮一共转了几格——' +
    '**四样都在这一页上**,读数是粗的,够判断"这个键有没有反应"。' +
    '另外它还会**顺手判故障**:按键出现连击、滚轮出现疑似跳格时,' +
    '对应的那一块会**由绿变红**,读数栏那一格「故障」也会写明是哪一处。',

  reset: '重置',

  /** 六格读数。`unit` 只有 `gap` / `held` 有,和页面上的 `StatPanel` 一一对应 */
  stats: {
    presses: { label: '按下', hint: '所有键合计' },
    holding: { label: '当前按着', hint: '松开后清空' },
    gap: { label: '双击间隔', unit: 'ms', hint: '同一个键的相邻两次' },
    held: { label: '按住', unit: 's', hint: '这次按住持续了多久' },
    notches: { label: '格数', hint: '滚轮,估算值' },
    fault: { label: '故障', hint: '还没测到能下判断的东西' },
  },

  resultsHeading: '怎么看结果',
  results: [
    {
      title: '某个键按下去不亮',
      body: '——微动开关或排线可能已经损坏。可以多按几次确认不是偶发。',
    },
    {
      title: '需要很用力才有反应',
      body: '——微动弹片疲劳的典型表现,通常是失灵的前兆。',
    },
    {
      title: '某个键的计数变红',
      body:
        '——同一个键的相邻两次点击间隔短于人手的机械极限,也就是微动在抖(俗称连击)。' +
        '你没有连点却出现红色,那只鼠标的微动已经开始老化了。**这一处会一直留着**,' +
        '并同时反映到鼠标图上:那个键再按下去时,那一瓣是**红的**,不是绿的。',
    },
    {
      title: '只按一个键却亮了多瓣',
      body:
        '——信号串扰或微动粘连。注意要和你自己按的组合键区分开:同时按下左右键、两瓣都会亮,' +
        '那是正常的。判断方法是**抬起手指逐个松开**,看每一瓣是不是跟着自己的那根手指熄灭。',
    },
    {
      title: '滚轮那里只有一个方向亮了,或者格数看着不对',
      body:
        '——方向是可靠的,格数是**估算**:不同浏览器和设备的每一格代表多少像素并不一致,' +
        '只能按一个经验值换算。想知道原始数值,用「滚轮」那一页。',
    },
    {
      title: '读数栏里「故障」那一格有数',
      body:
        '——这一页自己判出来了,小字里写明是哪一处。它只判**两样**,判据和对应详情页完全同一份实现:',
      subPoints: [
        '**疑似连击**:同一个键的相邻两次间隔 < {ms}ms。人手的机械极限做不到这么快,' +
          '所以这个间隔基本只可能是微动在抖。',
        '**疑似跳格**:一直朝一个方向滚,中间**单独**反向跳了一下又立刻回来。' +
          '真换方向是一连串反着滚,不算。',
      ],
      tail:
        '**两样都带「疑似」,这不是客套。**跳格的波形,手指打滑、触控板误触、' +
        '甚至你自己慢速来回滚,都能造出一个一模一样的 —— 判读方法是**只朝一个方向' +
        '匀速滚二十几格**,看有没有冒出毛刺。「滚轮」那一页有一整段专门讲这个。' +
        '所以这一格说的是"有东西值得看一眼",不是"你的鼠标坏了"。',
    },
  ] as ButtonCheckRow[],

  detailHeading: '想看细的,去这三页',
  detailLede: '这一页是汇总,四样都只给一个粗数。要逐项读,对应的页面各有一页:',
  detailPoints: [
    {
      link: '长按拖拽测试',
      body:
        '——按住不放拖一段距离,它判的是"中途有没有莫名断过一次"(疑似瞬断),' +
        '那要拖满一整段才看得出形状,这里给不了。',
    },
    {
      link: '双击测试',
      body: '——逐次记下每一次间隔并分类,还统计中位数。这里只留最近两次的那个数。',
    },
    {
      link: '滚轮测试',
      body: '——方向带、原始 delta、每一次的格数估算,以及"反向毛刺"的判定。',
    },
  ] as ButtonDetailRow[],

  chordHeading: '组合按键',
  chordBody:
    '同时按下多个键是支持的:按住左键不放再按右键,两瓣会**各自独立**点亮,' +
    '松开哪一个哪一个熄灭。这对判断微动是否粘连很有用——真正的粘连是"你没按它,它自己亮着"。',
  chordImpl:
    '实现上这里有个坑值得说明:指针事件规范规定,只有**第一个**按下的键会触发**pointerdown**,' +
    '第二个键按下时并不再派发该事件,而是通过 **pointermove**更新一个按键位掩码;' +
    '同理,**pointerup** 只在**最后一个**键松开时派发一次。' +
    '也就是说按键状态只能用位掩码逐个对比得出,不能靠 **pointerdown** / **pointerup**' +
    '里的按键编号——那样写的话,组合键基本是测不到的。',

  notesHeading: '注意事项',
  notesBody:
    '中键按下时浏览器默认会启动自动滚动,右键会弹出菜单,侧键会触发前进后退,滚滚轮页面会跟着滚——' +
    '本页都已拦截(页面上的链接和按钮除外,那里右键「在新标签页中打开」是正常操作),' +
    '所以可以放心逐个按过去。触屏设备没有这些物理按键,请在电脑上使用。',
  notesGesture:
    '有一条**本页拦不住**:Edge 自带的“鼠标手势”会把**按住右键拖动**' +
    '解释成在画手势——屏幕上跟着画出一条蓝线,凑够形状后浏览器还会直接执行动作(后退、关标签页),' +
    '整页跳走。这不是网页能关掉的东西,微软官方也确认过没有网页端的开关。它在' +
    '**中文区的 Edge 里默认开着**,要用右键那一项的话,先在地址栏进' +
    'edge://settings/mouseGesture 关掉它,或把本站加进“配置鼠标手势”的阻止列表。',
  notesSideButtons:
    '还有一条要照实说:**侧键那一栏显示破折号或者不亮,只说明"页面没收到"**,' +
    '不等于"按了 0 次"。有些鼠标的侧键根本不是以鼠标按键的形式上报的——厂商驱动把它发成' +
    '键盘事件或一段宏,浏览器收不到任何鼠标事件。这种情况网页无从判断,只能靠驱动软件把它改回普通按键。',

  /**
   * `<script>` 里那几个字面量。**它们不是正文,但都是用户看得见的字** ——
   * 散在脚本里的话英文版就漏了,而且三档分界(破折号 / 未发现 / N 处)最容易漏岔路。
   */
  runtime: {
    /** 「当前按着」按着多个键时,键名之间的连接符 */
    holdingJoiner: ' + ',
    /** 所有"什么都还没有"的读数位写的那个破折号(不是 0,也不是"未发现") */
    dash: '—',
    /** 「故障」明细里,某个键被判定连击时那一条。`{name}` 是键名 —— 见文件头 */
    faultButton: '{name} 疑似连击',
    /** 滚轮疑似跳格那一条。**单独一个键**,因为滚轮不是哪个键 */
    faultWheel: '滚轮 疑似跳格',
    /** 「故障」那一格判出故障时的值。`{count}` 是处数 */
    faultCount: '{count} 处',
    /** 多处故障写进小字时的连接符 */
    faultJoiner: ' · ',
    /** 测过、没毛病时那一格的值 */
    faultNone: '未发现',
    /** 同上那一档的小字 */
    faultNoneHint: '按过的键和滚轮都没出问题',
    /** 判出连击时,那块按键牌上小注被**替换**成的字(不是另起一行) */
    faultNote: '疑似连击',
  },
};

export const buttonEn: typeof buttonZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'button-test',
  metaTitle: 'Mouse button / wheel / hold / double-click test — check left, right, middle and side buttons',
  metaDescription:
    'Free online mouse test: check how the left, right, middle and side buttons respond, and record press counts, hold time, double-click gaps and wheel direction to help tell whether a switch is wearing out. Nothing to install.',

  h1: 'Mouse button / wheel / hold / double-click test',
  lede:
    'Press any button on the mouse diagram below and its part lights up live; roll the wheel and it ' +
    'lights up and shows the direction. Which button you pressed, how long you held it, the gap in ' +
    'milliseconds between two clicks of the same button, how many notches the wheel turned — ' +
    '**all four are on this page**, and the readings are coarse enough to answer "does this button ' +
    'respond at all". It also **flags faults in passing**: when a button chatters or the wheel looks ' +
    'like it skipped, the matching part turns **from green to red**, and the "Faults" cell in the ' +
    'readout says which one it was.',

  reset: 'Reset',

  stats: {
    presses: { label: 'Presses', hint: 'all buttons combined' },
    holding: { label: 'Held now', hint: 'cleared on release' },
    gap: { label: 'Double-click gap', unit: 'ms', hint: 'between two clicks of the same button' },
    held: { label: 'Hold', unit: 's', hint: 'how long this hold has lasted' },
    notches: { label: 'Notches', hint: 'wheel, an estimate' },
    fault: { label: 'Faults', hint: 'nothing measured yet to judge from' },
  },

  resultsHeading: 'How to read the results',
  results: [
    {
      title: 'A button does not light up when pressed',
      body: ' — the switch or its ribbon cable may already be damaged. Press it a few more times to rule out a one-off.',
    },
    {
      title: 'It only responds to a hard press',
      body: ' — the classic sign of a tired switch spring, usually a precursor to failure.',
    },
    {
      title: 'A button’s count turns red',
      body:
        ' — two clicks of the same button landed closer together than a human hand can manage, ' +
        'which means the switch is chattering (double-clicking). If it goes red without you clicking ' +
        'twice, that switch has started to wear out. **This stays until you reset**, and it shows on ' +
        'the diagram too: the next time you press that button its part is **red**, not green.',
    },
    {
      title: 'One button pressed, several parts lit',
      body:
        ' — crosstalk or a sticking switch. Be careful to tell it apart from a chord you pressed ' +
        'yourself: pressing left and right together lights both parts, and that is normal. The test ' +
        'is to **lift your fingers one at a time** and watch whether each part goes out with its own finger.',
    },
    {
      title: 'Only one direction lights up on the wheel, or the notch count looks wrong',
      body:
        ' — the direction is reliable; the notch count is an **estimate**, because how many pixels a ' +
        'notch is differs between browsers and devices and only an empirical value can be used. For ' +
        'the raw numbers, use the "Wheel" page.',
    },
    {
      title: 'The "Faults" cell in the readout has a value',
      body:
        ' — this page worked it out itself, and the small print says which one. It judges only ' +
        '**two things**, using exactly the same implementation as the detail pages:',
      subPoints: [
        '**Suspected chatter**: two clicks of the same button less than {ms}ms apart. A human hand ' +
          'cannot mechanically go that fast, so the gap is almost certainly the switch chattering.',
        '**Suspected skipped notch**: rolling steadily one way, a **single** notch flips the other ' +
          'way and immediately back. A real change of direction is a run of the opposite way, and does not count.',
      ],
      tail:
        '**Both say "suspected", and that is not hedging.** The waveform of a skipped notch can be ' +
        'produced just as well by a slipping finger, a stray trackpad touch, or even you rolling ' +
        'slowly back and forth yourself — so the way to read it is to **roll steadily in one ' +
        'direction for twenty-odd notches** and see whether a spike appears. The "Wheel" page has a ' +
        'whole section on this. So this cell means "something is worth a look", not "your mouse is broken".',
    },
  ],

  detailHeading: 'For the detail, go to these three pages',
  detailLede: 'This page is a summary: all four give only a coarse figure. To read each one properly, every measurement has its own page:',
  detailPoints: [
    {
      link: 'Hold & drag test',
      body:
        ' — hold a button down and drag a distance, and it judges whether the signal cut out part-way ' +
        '(a suspected dropout). That needs a full drag to show its shape, which this page cannot give.',
    },
    {
      link: 'Double-click test',
      body: ' — it records and classifies every gap, and reports the median. This page keeps only the last two.',
    },
    {
      link: 'Wheel test',
      body: ' — the direction strip, raw delta, a per-event notch estimate, and the "backward glitch" verdict.',
    },
  ],

  chordHeading: 'Chorded buttons',
  chordBody:
    'Pressing several buttons at once is supported: hold the left button and press the right, and the ' +
    'two parts light up **independently**, each going out as you release it. That is useful for ' +
    'telling whether a switch is stuck — a genuinely stuck switch is "you are not pressing it, and ' +
    'it is lit anyway".',
  chordImpl:
    'One implementation wrinkle worth explaining: the pointer events spec says only the **first** ' +
    'button pressed fires **pointerdown**; pressing a second button does not dispatch that event ' +
    'again, and instead updates a button bitmask through **pointermove**. Likewise **pointerup** ' +
    'fires once, when the **last** button is released. Button state therefore has to be derived by ' +
    'diffing the bitmask, not from the button number on **pointerdown** / **pointerup** — written ' +
    'that way, chords are essentially untestable.',

  notesHeading: 'Notes',
  notesBody:
    'The middle button starts autoscroll by default, the right button opens a menu, the side buttons ' +
    'trigger back/forward, and rolling the wheel scrolls the page — all of which this page blocks ' +
    '(except on the page’s own links and buttons, where right-click "Open in new tab" is a normal ' +
    'operation), so you can press your way through them without worry. Touch devices have none of ' +
    'these physical buttons; please use a computer.',
  notesGesture:
    'One thing this page **cannot block**: Edge’s built-in "mouse gestures" reads **holding the ' +
    'right button and dragging** as drawing a gesture — it draws a blue line on screen as you go, ' +
    'and once the shape is complete the browser performs the action outright (go back, close a tab) ' +
    'and the whole page jumps away. This is not something a web page can turn off, and Microsoft ' +
    'has confirmed there is no in-page switch for it. It is **on by default in Edge in China**, so ' +
    'to use the right-button row, first go to edge://settings/mouseGesture and turn it off, or add ' +
    'this site to the block list under "Configure mouse gestures".',
  notesSideButtons:
    'One more thing to state plainly: **the side-button row showing a dash, or not lighting up, ' +
    'only means "the page received nothing"** — it does not mean "pressed 0 times". On some mice ' +
    'the side buttons are not reported as mouse buttons at all: the vendor driver sends them as ' +
    'keyboard events or a macro, and the browser receives no mouse event. A web page cannot tell in ' +
    'that case; only the driver software can map them back to ordinary buttons.',

  runtime: {
    holdingJoiner: ' + ',
    dash: '—',
    faultButton: '{name} suspected chatter',
    faultWheel: 'Wheel suspected skipped notch',
    faultCount: '{count} found',
    faultJoiner: ' · ',
    faultNone: 'None found',
    faultNoneHint: 'no problem with the buttons or wheel you used',
    faultNote: 'suspected chatter',
  },
};
