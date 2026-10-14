/**
 * 长按拖拽测试页(`/hold-drag-test/`)的文案。
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
 * `holdDragEn` 声明成 `typeof holdDragZh` —— 英文版漏一个键、拼错一个键、
 * 多出一个键,都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 带 `**强调**` 的段落
 *
 * 模板里原来是 `<strong>…</strong>`,搬进目录时按仓库的约定改写成 `**…**`,
 * 所以句子是完整的、没有为了加粗被切成碎片。渲染走 `faq.ts` 的 `faqHtml()`
 * (和 FAQ 答案同一套)。
 *
 * **那两个 `<strong>` 不只出现在正文里。** `limitsPoints` 那一节住在
 * `<section class="prose prose--cards">` 里,而 `.prose--cards li > strong:first-child`
 * 会把每条开头的那个 `<strong>` 显示成卡片标题 —— 所以 `**` 必须留在**开头**
 * 那一句上,不能顺手动到句子中间。
 *
 * 更靠下那一段还有一处:日志说明里原来是
 * `<span class="mark-danger">红色</span>`。`faqHtml()` 会把 `<`/`>` 转义,留着 span
 * 屏幕上会原样印出标签,所以按 `polling.ts` 的同一条规矩改成 `**红色**` ——
 * **代价是那两个字不再标红**(它本来和日志里那条红条目同色)。想保住颜色,
 * 出口是把它拆成 `'… **{danger}** 的那几次…'` + 一个 `dangerMark: '红色'`,
 * 接线时 `fill(faqHtml(...), { dangerMark: '<span class="mark-danger">红色</span>' })`。
 *
 * ## 五个按键的名字**不在这份文件里**
 *
 * `左键` / `中键` / `右键` / `侧键 4` / `侧键 5` 来自 `zh.ts` 的 `buttons` 命名空间
 * (和 `mouse-buttons.ts` 的 `BUTTONS` 对齐),用 `buttonCopy(code, locale)` 读。
 * 理由和 `button.ts` 的文件头完全一样:**它是两个页面共用的一张表**
 * (`/button-test/` 和 `/hold-drag-test/`),抄一份进来只会多出一份要对齐的清单。
 *
 * 所以这里只留下**引用键名的那些句式**,`{name}` 由接线时填进键名(多个键名则
 * 先用 `runtime.nameJoiner` 拼成一串)。**用了 `{name}` 的键一共这五处:**
 *
 * | 键 | 出处 |
 * | --- | --- |
 * | `badges.drops` | `render()` 里 `setBadge(..., \`${names} 疑似瞬断\`, 'poor')` |
 * | `runtime.noteDrop` | `render()` 里判定横幅下那句说明(有瞬断时) |
 * | `runtime.liveLabel` | 测试区里跟着指针的大字标签(`live-button` 那个 `<span>`) |
 * | `runtime.logChatter` / `runtime.logDrag` | `renderLog()` 里每条日志末尾的说明 |
 *
 * 另外两处**只显示键名本身、不成句**,所以这里一个键都不留、由接线时直接
 * `buttonCopy(code, locale).name` 渲染:
 *
 * - 逐键明细表每一行第一个 `<td>{button.name}</td>`(五个键各一行);
 * - 空态里那个 `<span id="live-button">左键</span>` —— 它只是**首屏的占位**,
 *   第一次按下就被 `setText(el('live-button'), buttonName(...))` 换掉,
 *   所以接线时填键 0 的名字(中文「左键」/ 英文「Left」)即可。
 *
 * ## 运行期填的占位符
 *
 * | 占位符 | 填什么 |
 * | --- | --- |
 * | `{window}` | `analysis.ts` 的 `REPRESS_WINDOW_MS`(毫秒,构建期常量) |
 * | `{radius}` | `analysis.ts` 的 `REPRESS_RADIUS_PX`(像素,构建期常量) |
 * | `{name}` | 一个按键名,或几个按键名用 `nameJoiner` 拼起来的一串 |
 * | `{count}` | 瞬断处数 / 按住次数 / 某一条日志里的瞬断次数 |
 * | `{distance}` | 某一次(或实时那一次)拖动的路程,像素 |
 *
 * ## 刻意写死的散文(改常量时要一起改)
 *
 * 下面这些在源模板里本来就是写死的中文,不是占位符 —— 同 `dpi.ts` 里那条
 * 「`1 厘米` 是散文不是占位符」:
 *
 * - `logLede` 里的 **`最近 10 次`**(对应脚本里的 `LOG_LIMIT = 10`);
 * - FAQ 第 1 条里的 **`60 毫秒`**(人最快的双击间隔,和 `REPRESS_WINDOW_MS` 无关);
 * - FAQ 第 4 条里的 **`十几秒`**、FAQ 第 3 条里的 **`十几秒`**。
 *
 * 还有两处**不该翻、也不该动**的字面量:`edge://settings/mouseGesture`(地址)
 * 和 `Alt+Tab`(按键),两边目录里逐字相同。
 */

/** FAQ 一行的形状。**文案两边键必须一样**,见文件头 */
export interface HoldDragFaqItem {
  q: string;
  a: string;
}

export const holdDragZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'hold-drag-test',
  /** 页面自己的 <title> / meta description。**和 `tools.ts` 里那份逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '鼠标长按拖拽测试 - 检测按住期间是否意外断开',
  metaDescription:
    '在线测试鼠标长按与拖拽稳定性,检测按住期间是否出现意外释放、信号瞬断,排查拖拽文件时中途掉落的问题。',

  h1: '鼠标长按拖拽测试',
  lede:
    '按住任意一个鼠标按键,在下面的区域里来回拖动十几秒,然后松开。页面会统计每一次按住期间' +
    '**有没有出现过极短的断开又重按**——那正是拖拽文件时中途掉落的成因。' +
    '左键、中键、右键、两个侧键都支持,按住期间即使把指针拖出这个区域也没关系,一样会继续跟踪。',

  /** 测试区空态那行提示 */
  hint: '在这里按住任意一个键,然后来回拖动',
  /** 「重置」旁边那行小提示 */
  hintTracking: '指针拖出区域外也会继续跟踪,直到松开为止',

  reset: '重置',

  /** 判定横幅左边那个标题 */
  verdictLabel: '疑似瞬断',
  /** 判定横幅那个数后面的单位 */
  verdictUnit: '次',
  /** 判定横幅下面那句说明的**空态**。**和脚本里的 `DEFAULT_NOTE` 是同一句**
   *  (一处键,两处出口:首屏的模板 + 脚本复位时写回去) */
  verdictNoteIdle: '按住任意一个键拖动,松开后这里会给出结论',

  /** 右上角那枚徽章的三档。`drops` 那一档带键名 —— 见文件头 */
  badges: {
    idle: '等待拖拽',
    drops: '{name} 疑似瞬断',
    none: '未发现瞬断',
  },

  /** 四格读数。`hint` 为空串表示那一格没有说明;`unit` 只有两格有 */
  stats: {
    sessions: { label: '按住次数', hint: '各键合计' },
    longest: { label: '最长一次', unit: 'ms', hint: '各键合计' },
    distance: { label: '累计路程', unit: 'px', hint: '同时按住多个键时各记一份' },
    open: { label: '没收到松开', hint: '结束不了的那几次' },
  },

  byButtonHeading: '按按键分开看',
  /** 表格上面那句说明。**开头两个 `**…**` 是强调**,见文件头 */
  byButtonLede:
    '五个键都在下面列着。破折号表示**这个键一个事件都没收到**——可能是没测它,' +
    '也可能是鼠标或驱动根本没把它当成鼠标按键上报,**不等于按了 0 次**。' +
    '按住期间,对应的那一行会高亮。',
  /** 逐键明细表的四个表头 */
  byButtonColumns: {
    button: '按键',
    sessions: '按住次数',
    drops: '疑似瞬断',
    longest: '最长一次 (ms)',
  },

  logHeading: '每次拖拽的记录',
  /**
   * 日志说明。
   *
   * **`{mark}` 是那一处红色** —— 源模板用的是 `<span class="mark-danger">红色</span>`,
   * 而那个颜色**不是装饰**:它和下面日志里变红的那几条是同一个记号,读者靠它把
   * 这句话和那些条目对上。`faqHtml` 只会 `**`,给不出颜色,所以拆成一个占位符,
   * 由页面填回真正的 span(和 `polling.ts` 的 `chartLedeWarn` 同一个做法)。
   */
  logLede: '最近 10 次,新的在上面。{mark}的那几次里检测到了瞬断。',
  logLedeMark: '红色',

  /** 「这项测试测不到什么」那一节。**每条开头的 `**…**` 是卡片标题**,见文件头 */
  limitsHeading: '这项测试测不到什么',
  limitsPoints: [
    '**浏览器没有“按键瞬断”这个信号**——按键中途断一下,在事件流里就是一次松开加一次按下,' +
      '和用户真的松手再按**完全一样**,没有任何字段能把两者分开。' +
      '页面能做的只是在行为上找破绽:人手不可能在 {window} 毫秒内原地重按,' +
      '所以满足“极短 + 位置几乎没变”这两个条件的,才被算作疑似瞬断。',
    '**判读权在你自己手上**——如果你确定自己一直按着没松手,这里却报了瞬断,' +
      '那这只鼠标的按键信号确实断过。反过来,如果你中间真的换了手或者松了一下,' +
      '那报出来的就是你自己干的。日志里那几次的时长和路程可以帮你回忆当时在做什么。',
    '**有一类页面根本收不到**——有些鼠标的侧键被驱动发成键盘事件,' +
      '有些浏览器不允许网页取消侧键的前进/后退。这时那一行会一直空着(破折号),' +
      '而**空着不是“0 次”**——是“没有测到”。这两件事在数据上长得一样,结论却相反。',
    '**浏览器自己把右键抢走**——Edge 有一个自带的“鼠标手势”功能,' +
      '按住右键拖动会被它解释成在画手势:屏幕上会跟着画出一条蓝线,而这条轨迹不是本页画的,' +
      '**网页也没有任何办法阻止它**(微软官方确认过,连命令行开关都关不掉)。' +
      '它比前两种更麻烦的地方在于:手势凑够形状后浏览器会直接执行动作(后退、关标签页),' +
      '整页一跳走,刚测的成绩就没了。它在**中文区的 Edge 里默认开着**,' +
      '关法是 edge://settings/mouseGesture,详见下面常见问题里的那一问。',
  ] as string[],

  relationHeading: '和“拖拽掉落”的关系',
  relationBody:
    '拖动文件时中途掉落,通常就是按住期间发生了瞬断:系统收到“松开了”,于是把文件放在了' +
    '当时指针的位置。同样的瞬断在普通点击里几乎看不出来(可能只是偶尔漏一次点击),' +
    '但在拖拽里会立刻显形——这是这项测试比点击测试更灵敏的原因。',

  faqHeading: '常见问题',
  faq: [
    {
      q: '页面上的“疑似瞬断”到底测的是什么?',
      a:
        '测的是“松开后又极快地原地按下”。判据是两条同时成立:间隔短于 {window} 毫秒,' +
        '并且位置挪动不超过 {radius} 像素。这个动作人手做不出来——人最快的双击也在 60 毫秒以上,' +
        '而且鼠标会因为反作用力挪位置。所以满足这两条的,基本只可能是按键信号自己断了一下。',
    },
    {
      q: '为什么叫“疑似”而不是直接说故障?',
      a:
        '因为浏览器里根本没有“按键瞬断”这个信号。中途断一下,在事件流里就是一次松开加一次按下,' +
        '和用户真的松手再按**完全一样**,没有任何字段能把两者区分开。能用的只有行为特征,' +
        '而行为特征不是铁证。所以判读权在你手上:如果你确定自己一直按着没松,这里却报了瞬断,' +
        '那就是鼠标的问题。',
    },
    {
      q: '按住的时候为什么会断?',
      a:
        '**微动开关**的金属触点在几千次点击之后会氧化、磨损,接触变得不可靠,按住不动时就会瞬间失去接触:' +
        '系统先收到一个“松开”,紧接着收到一个“按下”,手里拖着的文件就掉在半路。' +
        '这件事在**普通点击里根本看不出来**——一次点击只有几十毫秒,而拖拽要按住好几秒,' +
        '按得越久越容易撞上那一下。' +
        '它和**双击**(按一下却触发两次)是同一个根因的两面:同一对磨损的触点,既可能抖出多余的一次点击,' +
        '也可能在按住时断开,所以这两件事常常一起出现。' +
        '本页报出疑似瞬断、双击页同时也报出连击的话,基本可以认定是微动老化,而不是浏览器或驱动的问题。' +
        '真要修就是换微动(常见的品牌有欧姆龙、凯华、华诺),或者在保修期内走售后。',
    },
    {
      q: '拖着拖着东西掉了,用这个能查出来吗?',
      a:
        '能,这正是它最主要的用途。拖拽文件时中途掉落,通常就是按住期间发生了瞬断——' +
        '系统收到“松开了”,于是把文件丢在了当时的位置。测法是在这个区域里按住左键来回拖动十几秒,' +
        '松开后看日志里那一次的瞬断次数是不是 0。' +
        '注意别把窗口失焦算进去:按了 Alt+Tab 的话,系统确实会认为你松手了,那不是鼠标的错。',
    },
    {
      q: '五个键都能测吗?侧键呢?',
      a:
        '左键、中键、右键、两个侧键都能测,按住哪个键就记在哪个键名下,同时按住几个也分得开。' +
        '但侧键有两个前提,不满足的话这一行会一直显示破折号(未测),而不是 0 次。' +
        '第一,**有些鼠标的侧键根本不是以鼠标按键的形式上报的**——厂商驱动把它发成了键盘事件或者一段宏,' +
        '浏览器收不到任何鼠标事件,页面自然无从测起。' +
        '第二,**有些浏览器不允许网页取消侧键的前进/后退**,一按整页就跳走。' +
        '这两种情况都只说明“页面没收到”,**不等于这个键按了 0 次**——把两者混成一个数字,' +
        '正是这类测试最容易骗人的地方。',
    },
    {
      q: '按住右键拖动时屏幕上画出一条蓝线,是你们画的吗?',
      a:
        '不是,而且**这一页拦不掉它**。那是 **Edge 自带的“鼠标手势”**:它把“按住右键拖动”解释成在画一个手势,' +
        '顺手把轨迹画在屏幕上。它不是右键菜单,所以网页里那些屏蔽右键菜单的写法对它一概无效——' +
        '微软官方也确认过,没有任何办法从网页端关掉它。' +
        '更要紧的是它不只是画条线:**手势凑够形状之后浏览器会直接执行动作**(后退、关闭标签页之类),' +
        '整页一跳走,刚测的成绩就没了。' +
        '它在**中文区的 Edge 里默认是开着的**,关法是地址栏输入 edge://settings/mouseGesture,' +
        '关掉总开关;不想全关的话,同一页里把本站加进“配置鼠标手势”的阻止列表,只对本站生效。' +
        'Chrome 和其他浏览器没有这个功能,不受影响。',
    },
    {
      q: '为什么有时候这一整段会被标成“按着没松”?',
      a:
        '如果你松开后页面没收到松开事件(比如指针在浏览器窗口外松的),那一段就会显示成还没结束。' +
        '这是如实报告而不是出错——页面只能知道自己收到了什么。',
    },
  ] as HoldDragFaqItem[],

  // -------------------------------------------------------------------------
  // 以下都是 `<script>` 里拼出来的句子。整句一个键,占位符由 `fill()` 填。
  // -------------------------------------------------------------------------

  /** `<script>` 里那几个字面量。**它们不是正文,但都是用户看得见的字** */
  runtime: {
    /** 所有"没测到"的读数位写的那个破折号(不是 0) */
    dash: '—',
    /** 几个键名之间的连接符(`dropKeys.map(buttonName).join(...)`) */
    nameJoiner: '、',
    /** 判定横幅下那句说明(有瞬断时)。`{name}` 是一串键名,`{count}` 是处数 */
    noteDrop: '{name}上 {count} 次“极短且原地”的重按。当时若没松手,就是按键信号断过。',
    /** 判定横幅下那句说明(测过、没毛病) */
    noteNone: '共 {count} 次按住,全程没有出现过断开。',
    /** 测试区里跟着指针的大字标签。`{name}` 是键名,`{distance}` 是路程 */
    liveLabel: '{name} 按住中 · 已拖动 {distance} px',
    /** 日志空态 */
    logEmpty: '还没有拖拽记录',
    /** 那一段一直没等到松开事件时,日志时长那一格写的字 */
    logOpen: '按着没松',
    /** 日志条目末尾的说明(有瞬断)。`{name}` 是键名,`{count}` 是这一次的处数 */
    logChatter: '{name} 疑似瞬断 {count} 次',
    /** 日志条目末尾的说明(正常)。`{name}` 是键名,`{distance}` 是这一次的路程 */
    logDrag: '{name} 拖动 {distance} px',
  },
};

export const holdDragEn: typeof holdDragZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'hold-drag-test',
  metaTitle: 'Mouse hold & drag test — check for dropouts while you hold a button',
  metaDescription:
    'Test how stable your mouse is while holding and dragging: spot accidental releases and signal dropouts during a hold, and track down drags that drop a dragged file mid-way.',

  h1: 'Mouse hold & drag test',
  lede:
    'Hold any mouse button and drag back and forth in the area below for ten-odd seconds, then let go. ' +
    'For every hold the page checks **whether the signal ever cut out and pressed again** — which is ' +
    'exactly what drops a dragged file mid-way. The left, middle and right buttons and both side ' +
    'buttons all work, and the tracking carries on even if the pointer leaves the area mid-hold.',

  hint: 'Hold any button here, then drag back and forth',
  hintTracking: 'Tracking carries on even if the pointer leaves the area, until you release',

  reset: 'Reset',

  verdictLabel: 'Suspected dropout',
  verdictUnit: 'times',
  verdictNoteIdle: 'Hold any button and drag; the verdict appears here once you release',

  badges: {
    idle: 'Waiting for a drag',
    drops: '{name} suspected dropout',
    none: 'No dropout found',
  },

  stats: {
    sessions: { label: 'Holds', hint: 'all buttons combined' },
    longest: { label: 'Longest hold', unit: 'ms', hint: 'all buttons combined' },
    distance: { label: 'Total travel', unit: 'px', hint: 'counted once per button when several are held' },
    open: { label: 'No release seen', hint: 'the holds that never closed' },
  },

  byButtonHeading: 'Broken down by button',
  byButtonLede:
    'All five buttons are listed below. A dash means **this button received no events at all** — ' +
    'either it was never tested, or the mouse or driver never reported it as a mouse button. ' +
    '**That is not the same as 0 presses.** The row for a button highlights while it is held.',
  byButtonColumns: {
    button: 'Button',
    sessions: 'Holds',
    drops: 'Suspected dropout',
    longest: 'Longest (ms)',
  },

  logHeading: 'Drag log',
  logLede: 'The last 10 drags, newest first. The ones in {mark} had a dropout detected in them.',
  logLedeMark: 'red',

  limitsHeading: 'What this test cannot tell you',
  limitsPoints: [
    '**A browser has no “button dropout” signal.** A break mid-press shows up in the event stream ' +
      'as one release plus one press, **exactly the same** as the user really letting go and pressing ' +
      'again; no field tells the two apart. All the page can do is look for behavioural clues: a ' +
      'human hand cannot press again in place within {window} milliseconds, so only the holds that ' +
      'are “extremely short + barely moved” are counted as a suspected dropout.',
    '**The verdict is yours to make.** If you are certain you never let go and it reports a dropout, ' +
      'that mouse’s button signal really did cut out. Conversely, if you did change hands or let go ' +
      'briefly, what it reports is your own doing. The duration and distance on each log line can ' +
      'help you remember what you were doing at the time.',
    '**One class of buttons never reaches the page.** On some mice the side buttons are sent by the ' +
      'driver as keyboard events, and some browsers do not let a web page cancel a side button’s ' +
      'back/forward. The row then stays empty (a dash), and **empty is not “0 presses”** — it is ' +
      '“not measured”. The two look identical in the data and mean opposite things.',
    '**The browser takes the right button for itself.** Edge has a built-in “mouse gestures” feature ' +
      'that reads holding the right button and dragging as drawing a gesture: a blue line is drawn on ' +
      'screen as you go, and that trail is not drawn by this page. **There is nothing a web page can ' +
      'do to stop it** (Microsoft has confirmed this — not even a command-line switch turns it off). ' +
      'What makes it worse than the other two is that once the shape is complete the browser ' +
      'performs the action outright (go back, close a tab), the whole page jumps away and the ' +
      'reading you just took is gone. It is **on by default in Edge in China**; turn it off at ' +
      'edge://settings/mouseGesture — see the last question below for the details.',
  ],

  relationHeading: 'How this relates to a drag being dropped',
  relationBody:
    'A file that drops mid-drag has usually hit a dropout during the hold: the system received ' +
    '“released” and set the file down at the pointer’s position at that moment. The same dropout is ' +
    'almost invisible in an ordinary click (at most it might miss a click now and then), but in a ' +
    'drag it shows at once — which is why this test is more sensitive than a click test.',

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'What exactly does “suspected dropout” measure?',
      a:
        'It measures “released and then pressed again in place, extremely fast”. Two conditions have ' +
        'to hold at once: the gap is shorter than {window} milliseconds, and the pointer moved no ' +
        'more than {radius} pixels. A human hand cannot do this — the fastest double-click is still ' +
        'over 60 milliseconds, and the mouse shifts under the recoil. So a hold meeting both ' +
        'conditions is almost certainly the button signal cutting out on its own.',
    },
    {
      q: 'Why “suspected” rather than just calling it a fault?',
      a:
        'Because a browser has no “button dropout” signal at all. A break mid-press is one release ' +
        'plus one press in the event stream, **exactly the same** as the user really letting go and ' +
        'pressing again, and no field separates the two. All there is to go on is behaviour, and ' +
        'behaviour is not proof. So the reading is yours to make: if you are sure you never let go ' +
        'and it reports a dropout, that mouse is the problem.',
    },
    {
      q: 'Why does it break while I am holding the button?',
      a:
        'The metal contacts of a **switch** oxidise and wear after a few thousand clicks, the contact ' +
        'becomes unreliable, and holding it still can lose contact for an instant: the system gets a ' +
        '“release” and immediately after a “press”, and the file you were dragging falls half-way. ' +
        'It is **invisible in an ordinary click** — a click lasts only tens of milliseconds, while a ' +
        'drag holds for several seconds, and the longer you hold the more likely you are to hit that ' +
        'instant. It is one of two faces of the same root cause as **double-clicking** (one press ' +
        'firing twice): the same worn pair of contacts can either chatter out an extra click or break ' +
        'while held, so the two often appear together. If this page reports a suspected dropout and ' +
        'the double-click page reports chatter at the same time, you can safely put it down to a worn ' +
        'switch rather than the browser or the driver. The real fix is a new switch (common brands ' +
        'are Omron, Kailh and Huano), or a warranty repair.',
    },
    {
      q: 'My drag keeps dropping what it is dragging — can this find out why?',
      a:
        'Yes, and that is its main use. A dragged file that drops mid-way usually means a dropout ' +
        'happened during the hold — the system received “released” and dropped the file at that ' +
        'position. The way to test is to hold the left button and drag back and forth in this area ' +
        'for ten-odd seconds, then release and check whether that drag’s dropout count is 0. Be ' +
        'careful not to count window focus loss: press Alt+Tab and the system really does think you ' +
        'let go, and that is not the mouse’s fault.',
    },
    {
      q: 'Can it test all five buttons? What about the side buttons?',
      a:
        'The left, middle and right buttons and both side buttons can all be tested — whichever ' +
        'button you hold is recorded under that button, and holding several at once is told apart ' +
        'too. But the side buttons have two preconditions, and without them that row shows a dash ' +
        '(not measured) rather than 0. First, **on some mice the side buttons are not reported as ' +
        'mouse buttons at all** — the vendor driver sends them as keyboard events or a macro, the ' +
        'browser receives no mouse event, and there is nothing for the page to measure. Second, ' +
        '**some browsers do not let a web page cancel a side button’s back/forward**, so one press ' +
        'sends the whole page away. Both cases mean only “the page received nothing”, **not that ' +
        'the button was pressed 0 times** — and lumping the two into one number is exactly where ' +
        'this kind of test most easily misleads.',
    },
    {
      q: 'When I hold the right button and drag, a blue line is drawn on screen — is that you?',
      a:
        'No, and **this page cannot block it**. It is **Edge’s built-in “mouse gestures”**: it reads ' +
        '“hold the right button and drag” as drawing a gesture and draws the trail on screen as it ' +
        'goes. It is not the right-click menu, so none of the usual ways a page suppresses that menu ' +
        'touch it — Microsoft has confirmed there is no way to turn it off from a web page. What ' +
        'matters more is that it does not just draw a line: **once the shape is complete the browser ' +
        'performs the action outright** (go back, close a tab, and so on), the whole page jumps away ' +
        'and the reading you just took is gone. It is **on by default in Edge in China**; turn it ' +
        'off by entering edge://settings/mouseGesture in the address bar and switching off the ' +
        'master toggle — or, if you would rather not turn it off everywhere, add this site to the ' +
        'block list under “Configure mouse gestures” on the same page so it applies here only. ' +
        'Chrome and other browsers have no such feature and are unaffected.',
    },
    {
      q: 'Why does the whole stretch sometimes read as “held, not released”?',
      a:
        'If the page never received the release event after you let go (because the pointer was ' +
        'released outside the browser window, say), that stretch shows as never having ended. That ' +
        'is an honest report, not an error — the page can only know what it received.',
    },
  ],

  runtime: {
    dash: '—',
    nameJoiner: ', ',
    noteDrop: 'On {name}: {count} re-presses that were “instant and in place”. If you did not let go, the button signal cut out.',
    noteNone: '{count} holds in total, with no dropout anywhere.',
    liveLabel: '{name} holding · dragged {distance} px',
    logEmpty: 'No drags recorded yet',
    logOpen: 'held, not released',
    logChatter: '{name} suspected dropout ×{count}',
    logDrag: '{name} dragged {distance} px',
  },
};
