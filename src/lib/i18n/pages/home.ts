/**
 * 首页的文案。
 *
 * ## 它比别的页多一大块:七张卡片的说明书
 *
 * 首页有两层文字,而**它们不在同一个地方渲染**(这一条文档里专门点过名,别找错):
 *
 * - **卡片自己那一句**(`note`)和读数槽的标签、模式名、空态提示 —— 那些原本住在
 *   `src/lib/mini-cards.ts` 的 `MINI_CARDS` 里。那是**纯数据说明书**,
 *   现在文案搬到这里,那边只剩结构。
 * - **四档可信度的骨架**(`confidenceNote`)—— 每一档"是什么意思"只在网格**下面
 *   渲染一次**,是一份 `<dl>`,靠徽章和七张卡对上。原来住在 `mini-cards.ts`
 *   的 `CONFIDENCE_NOTE`。
 *
 * ## 卡片的 key 是 `slug`
 *
 * 和 `MINI_CARDS` 一样按主 slug 取(一张卡可以顶几页,键只认主 slug 那一个)。
 * 读数槽按它自己的 `key` 取 —— 那是 `mini-devices.ts` 里 `ctx.write()` / `ctx.push()`
 * 用的同一个键,签错一个字母那一格永远空着,而且是静默的。
 */

import type { Confidence } from '../../tools';

/** 那一行小注的钥匙。`{ms}` 由阈值常量填,不手抄一个数 */
type CardNote = string;

export interface HomeCardCopy {
  /** 卡上显示的名字,缺省就用工具全名 */
  faceName?: string;
  /** 卡上那句摘要,缺省同上 */
  faceDesc?: string;
  /** 空态那行提示 */
  prompt: string;
  /** 读数槽的标签,按槽自己的 key */
  readouts: Record<string, string>;
  /** 模式按钮的标签与它自己的空态提示,按模式的 key */
  modes?: Record<string, { label: string; prompt?: string }>;
  /** 卡底那行小注 */
  note: CardNote;
  /** 放不进卡的三种,空态位置上给的那句解释 */
  fallback?: string;
}

export const homeZh = {
  slug: '',
  metaTitle: '鼠标测试 - 在线检测鼠标按键、回报率与传感器性能',
  metaDescription:
    '免费在线鼠标测试工具。检测鼠标按键失灵、回报率(轮询率)、双击连击、滚轮、轨迹丢帧与传感器性能。基于浏览器原生接口,无需安装任何软件,数据全部在本地计算。',

  h1: '在线鼠标测试',

  moreHeading: '更多工具',
  moreLede:
    '上面的卡片都是诊断,测的是"鼠标坏没坏";下面这些是玩,成绩同样只存在本机,' +
    '也一样会在页面上说清楚哪些数测不准、为什么。',
  /** `{toolboxLink}` 是通向工具箱那一页的行内链接,渲染时填 */
  toolboxLede: '{toolboxLink}里这几件都带一小块预览,一眼看得出是干什么的。',
  toolboxLinkText: '工具箱',

  aboutHeading: '关于这些测试',
  aboutLede:
    '打开网页即可检测鼠标的按键、回报率、传感器与滚轮状态,不需要下载任何驱动或客户端。' +
    '所有测量都在你的浏览器里完成,数据不会离开本机。',
  confidenceLede:
    '每张卡右上角标着**这个测量有多可信**。想知道按键坏没坏,就用「直接测得」的;' +
    '标着「只能看形状」的那几个,结论要自己对着卡底那行说明读——它们能给你的线索是真的,' +
    '但线索不是证据。四档的分别是:',
  /** **四档,不是五档** —— `'none'`(不测量)永远不出现在卡片上,所以不进这份图例 */
  confidenceNote: {
    exact: '浏览器直接给出原始事件流,数出来的就是数出来的。',
    estimate: '要经过一层换算或反推,假设不成立时结果就不成立。',
    shape: '只有形状可信,它证明不了"丢了几次"这种结论。',
    direction: '只有方向这一位信息不需要任何假设,其余都是估算。',
  } as Record<Exclude<Confidence, 'none'>, string>,

  plannedHeading: '即将上线',
  plannedBadge: '开发中',
  independentLabel: '独立页面:',
  clearCardAria: '清空「{name}」这张卡上的读数',
  goPageAria: '{confidence},去「{name}」这一页',
  modesAria: '{name}的模式',

  cards: {
    'button-test': {
      faceName: '按键 / 滚轮 / 长按 / 双击',
      faceDesc: '按下哪个键、按住多久、双击间隔有多长、滚轮朝哪边转了几格 —— 都在这张卡上。',
      prompt: '在框里按鼠标键,或滚滚轮',
      readouts: {
        presses: '按下',
        holding: '当前按着',
        gap: '双击间隔',
        held: '按住',
        notches: '格数',
        recent: '最近 10 次',
      },
      note:
        '双击间隔小于 {ms}ms 时,下面那个键的计数会标红 —— 那个速度人手做不出来。' +
        '按住期间断没断这张卡看不出:那要拖满一整段才判得出形状,去「长按拖拽」那一页。' +
        '滚轮那两格:方向看轮子和箭头,格数是估算 —— 浏览器从不说"一格是多少"。' +
        '方向带每格一次滚动:向下沉底、向上升顶,红格是反向毛刺。' +
        '侧键那一格是 0 只说明页面没收到,有些鼠标的侧键根本不走鼠标事件。',
    },
    'cps-test': {
      faceName: '鼠标 CPS 测试',
      prompt: '在框里快速连点',
      readouts: { cps: '瞬时 CPS', clicks: '点击' },
      modes: { instant: { label: '瞬时' }, five: { label: '5 秒', prompt: '连点 5 秒,第一下就开始计时' } },
      note: '卡里这个 5 秒够看个大概。要 10 / 30 秒、逐秒柱状图和最好成绩,去那一页。',
    },
    'trail-test': {
      prompt: '在框里画一笔',
      readouts: { samples: '采样点', isolated: '孤立尖峰' },
      note: '传感器漏点和手甩快了在数据上是同一个样子,所以只报形状,不报"丢了几次"。',
    },
    'polling-rate-test': {
      prompt: '在框里来回快速移动',
      readouts: { hz: '回报率', samples: '采样点' },
      note:
        '刷得够不够快取决于「每秒移动的英寸数 × DPI」,小框里推不开,' +
        '所以这里的数只能当下限。要测满,去整屏那一页。',
    },
    'dpi-test': {
      prompt: '',
      readouts: {},
      note: '手推的距离、指针速度滑块、系统缩放都会进到结果里,必须按提示推完固定距离。',
      fallback: '这一项要沿一把尺子推一段固定物理距离,再拿屏幕位移反推。卡片里放不下那把尺子。',
    },
    'acceleration-test': {
      prompt: '',
      readouts: {},
      note: '要比的是"同样的物理距离、不同的速度",所以必须两趟都推完才有结论。',
      fallback: '这一项要跑两组不同速度做对比,卡片里跑不开。',
    },
    'keyboard-test': {
      prompt: '',
      readouts: {},
      note: '用的是按键的物理位置,所以输入法、大小写、修饰键都不会影响判定。',
      fallback: '首页上的按键会滚动页面、撞浏览器快捷键,只有进了那一页才能即按即亮。',
    },
  } as Record<string, HomeCardCopy>,
};

export const homeEn: typeof homeZh = {
  slug: '',
  metaTitle: 'Mouse test — check buttons, polling rate and sensor performance online',
  metaDescription:
    'Free online mouse testing tools. Check for a failing switch, measure polling rate, spot double-click chatter, wheel glitches and sensor dropouts — all in the browser, nothing installed.',

  h1: 'Online mouse test',

  moreHeading: 'More tools',
  moreLede:
    'The cards above are diagnostics — they answer "is this mouse broken?". The ones below are for ' +
    'fun. Scores stay on your machine either way, and each of them says plainly which numbers are ' +
    'solid and which are not.',
  toolboxLede: 'Every item in the {toolboxLink} comes with a small preview, so you can tell at a glance what it does.',
  toolboxLinkText: 'toolbox',

  aboutHeading: 'About these tests',
  aboutLede:
    'Everything runs from the page itself — no driver, no download, no client. Buttons, polling rate, ' +
    'sensor and wheel are all measured in your browser, and nothing leaves your machine.',
  confidenceLede:
    'Each card carries a badge in the top right saying **how far its numbers can be trusted**. To find ' +
    'out whether a button is failing, use the ones marked "Measured directly". For the ones marked ' +
    '"Shape only", read the line at the bottom of the card — the clues they give you are real, but a ' +
    'clue is not proof. The four tiers:',
  confidenceNote: {
    exact: 'The browser hands over the raw event stream; what is counted is what happened.',
    estimate: 'A conversion or a back-calculation sits in between. If the assumption fails, the result fails with it.',
    shape: 'Only the shape is trustworthy — it cannot support a conclusion like “frames were dropped”.',
    direction: 'The direction bit is the only thing that needs no assumption; everything else is estimated.',
  },

  plannedHeading: 'Coming soon',
  plannedBadge: 'In progress',
  independentLabel: 'Separate pages:',
  clearCardAria: 'Clear the readings on the “{name}” card',
  goPageAria: '{confidence}, open the “{name}” page',
  modesAria: '“{name}” modes',

  cards: {
    'button-test': {
      faceName: 'Buttons / wheel / hold / double-click',
      faceDesc: 'Which button, held how long, how far apart two clicks landed, how far the wheel turned — all on one card.',
      prompt: 'Press a mouse button, or roll the wheel',
      readouts: {
        presses: 'Presses',
        holding: 'Held now',
        gap: 'Click gap',
        held: 'Hold time',
        notches: 'Notches',
        recent: 'Last 10',
      },
      note:
        'When a click gap is under {ms}ms the counter for that button turns red — no hand moves that ' +
        'fast. Whether a hold broke mid-way is invisible here: that needs a whole drag to judge the ' +
        'shape, so it lives on the hold & drag page. The two wheel slots: direction is the wheel and ' +
        'the arrow, and the notch count is an estimate — the browser never says how big a "notch" is. ' +
        'The strip is one cell per scroll event: down sinks, up rises, a red cell is a back-glitch. A ' +
        'zero in the side-button slot only means the page never heard it — on some mice the side ' +
        'buttons do not arrive as mouse events at all.',
    },
    'cps-test': {
      faceName: 'Mouse CPS test',
      faceDesc: 'Measure clicks per second in 5, 10 and 30 second runs, with a per-second chart and your personal best.',
      prompt: 'Click fast in here',
      readouts: { cps: 'Instant CPS', clicks: 'Clicks' },
      modes: { instant: { label: 'Instant' }, five: { label: '5 s', prompt: 'Click for 5 seconds; the first click starts it' } },
      note: 'Five seconds in a card is enough for a rough idea. For 10 / 30 seconds, a per-second chart and a personal best, open the page.',
    },
    'trail-test': {
      faceDesc: 'Draw a stroke and watch the raw movement: smoothness, jitter, dropouts, and whether this mouse and mousepad get along.',
      prompt: 'Draw a stroke in here',
      readouts: { samples: 'Samples', isolated: 'Isolated spikes' },
      note: 'A sensor dropping points and a fast flick look identical in the data, so this reports shape only — never "how many frames were lost".',
    },
    'polling-rate-test': {
      faceDesc: 'Measure the polling rate from 125 Hz to 8000 Hz — the real figure, the peak, and how much it wobbles second to second.',
      prompt: 'Move back and forth quickly in here',
      readouts: { hz: 'Polling rate', samples: 'Samples' },
      note:
        'How fast you can sweep depends on inches-per-second × DPI, and that does not fit in a small ' +
        'box — so the number here is only a lower bound. To measure it properly, use the full-page version.',
    },
    'dpi-test': {
      faceDesc: 'Estimate the real DPI: push the mouse a fixed physical distance and the screen movement is divided by it. Pointer acceleration has to be off.',
      prompt: '',
      readouts: {},
      note: 'Your hand, the pointer-speed slider and display scaling all end up in the result, so the fixed distance has to be pushed exactly as instructed.',
      fallback: 'This one needs a ruler pushed along a fixed physical distance, then a back-calculation from screen movement. There is no room for that ruler in a card.',
    },
    'acceleration-test': {
      faceDesc: 'Move the same physical distance at two different speeds and compare. If fast movement travels further, pointer acceleration is on.',
      prompt: '',
      readouts: {},
      note: 'The comparison is "same physical distance, different speeds", so both passes have to be finished before there is a conclusion.',
      fallback: 'This one runs two passes at different speeds and compares them; a card is not big enough for that.',
    },
    'keyboard-test': {
      faceDesc: 'Every key lights up the moment it is pressed — useful for spotting a dead key or a set of keys that cannot be held together.',
      prompt: '',
      readouts: {},
      note: 'It uses the physical position of the key, so input method, letter case and modifier keys cannot affect the reading.',
      fallback: 'Keys pressed on the home page scroll the page and collide with browser shortcuts, so press-to-light-up only works on that page.',
    },
  },
};
