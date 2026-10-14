/**
 * CPS 测试页的文案。
 *
 * ## 为什么一页一个文件
 *
 * 全站要做双语,量是约 2000 条字符串、21 个页面。**每页一份文件**是为了让
 * 这件事可以一页一页做、也可以几页同时做而互不冲突 —— 都塞进 `zh.ts` /
 * `en.ts` 两个大文件的话,两个人(或两个 agent)同时动一页就会撞在一起。
 *
 * ## 两边的键必须一样,而这是**机制**不是约定
 *
 * `cpsEn` 声明成 `typeof cpsZh` —— 英文版漏一个键、拼错一个键、多出一个键,
 * 都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 带 `**强调**` 的段落
 *
 * 正文里那几个 `**` 是**故意留的标记**,渲染时走 `faq.ts` 的 `faqHtml()`
 * (和 FAQ 答案同一套)。所以文案可以整段放在这里,不必为了加粗把句子拆成
 * 一堆片段 —— 拆开之后翻译的人看不到完整的句子,译文必然别扭。
 */

/** CPS 参考区间。**常见区间,不是标准** —— 页面上也这么写 */
export interface CpsReferenceRow {
  range: string;
  level: string;
  note: string;
}

export interface CpsFaqItem {
  q: string;
  a: string;
}

export const cpsZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'cps-test',
  /** 页面自己的 <title> / meta description。**中文那份和  逐字相同**,
   *  由 tests/i18n.test.ts 的对账用例钉着 —— 漂了会红。 */
  metaTitle: 'CPS 测试 - 在线测量每秒点击速度',
  metaDescription:
    '在线 CPS 测试,测量每秒点击次数,支持 5 秒、10 秒、30 秒模式,记录当前速度与历史最佳成绩。',

  h1: '鼠标 CPS 点击速度测试',
  lede:
    '选好时长,然后在下面的框里**直接开始快速连点左键**——第一下点击就是开始,不用先按什么。' +
    '结束时会给出全程平均和任意一秒内的最高点击次数。成绩只保存在你自己的浏览器里。',

  /** 时长选项。`label` 也会被脚本读回去拼提示语(见组件里的 `renderDurations`) */
  durations: {
    '5000': '5 秒',
    '10000': '10 秒',
    '30000': '30 秒',
  },

  reset: '重置',
  cancel: '取消',

  startCall: '点击开始',
  /** `{label}` 是选中的时长标签,运行时替换 */
  hintMeta: '{label} · 在这里快速连点左键',

  liveMeta: '次点击 · 剩余 {left} 秒 · {cps} CPS',
  overMeta: '时间到 · 再点一下重来',

  stats: {
    average: { label: '平均 CPS', hint: '总次数 ÷ 测试时长' },
    peak: { label: '峰值 CPS', hint: '任意 1 秒内最多几下' },
    clicks: { label: '点击次数', hint: '' },
    best: { label: '历史最佳', hint: '峰值,存在本机' },
  },
  bestRecord: '本次刷新了纪录',
  bestPlain: '峰值,存在本机',

  chart: {
    heading: '每秒点击次数',
    lede:
      '每根柱子是一秒钟里点了多少下。柱子从高到低说明手速在掉——这是正常的,' +
      '人体持续发力本来就撑不住;柱子**忽高忽低**则多半是点着点着节奏乱了,或者某一秒鼠标吞掉了点击。',
    left: '1s',
    right: '{seconds}s · 满格 {max} 次/秒',
    barTitle: '第 {n} 秒 · {count} 次',
  },

  referenceHeading: '参考区间',
  referenceLede:
    '下面这些是**常见区间,不是标准**。鼠标微动的软硬、你用哪根手指、有没有用特殊点击法,' +
    '都能让同一个人的成绩差出好几倍。',
  referenceColumns: { range: 'CPS', level: '大致水平', note: '说明' },
  reference: [
    { range: '3 以下', level: '偏慢', note: '多见于老年人、刚上手触控板的人,或用了很硬的微动' },
    { range: '4 – 6', level: '普通', note: '不常玩游戏的成年人基本都在这一带' },
    { range: '7 – 9', level: '熟练', note: '常玩射击游戏的玩家很容易达到' },
    { range: '10 – 14', level: '很快', note: '需要抖动点击(jitter click)之类的技巧' },
    {
      range: '15 – 25',
      level: '特殊点击法',
      note: '蝴蝶点(butterfly click)——靠手指在微动上弹,不是靠肌肉',
    },
    {
      range: '25 以上',
      level: '拖拽点',
      note:
        '手指贴着微动拖擦出连续通断,常见 25–40,好的鼠标能更高。到这个量级,' +
        '人手和自动点击器在数据上已经分不出来——数字是真实的,只是没法证明它是手点的',
    },
  ] as CpsReferenceRow[],

  whichHeading: '平均和峰值差得很远,该看哪个?',
  whichBody:
    '**两个都要看,因为它们回答的是不同的问题。**平均 CPS 是总次数除以总时长,' +
    '反映你在这段时间里**撑住了多少**;峰值是任意一秒里最多的那一下,反映你**最快能有多快**。' +
    '典型的成绩是平均 6、峰值 9——开头猛冲、后面掉,这个形状本身就是正常的,' +
    '页面上那张每秒柱状图就是给你看这个形状的。',
  whichTimer:
    '也正因为这样,测试时长**一定要显式计时**。"前 1 秒猛点 20 下、后 4 秒没力气了"' +
    '如果按最后一次点击来截断,会被算成 20 CPS——而后面那段空档在点击时间戳里根本不存在,' +
    '不点就没有事件,只有计时器知道它发生过。',

  fewerHeading: '点得比实际少,通常是鼠标的问题',
  fewerLede:
    '这是 CPS 测试最有价值的一个用途。如果屏幕上你明明点了 100 下,页面只记到 88 下,' +
    '那么丢掉的 12 下**不是页面漏记,而是鼠标压根没报出来**。两个常见成因:',
  fewerPoints: [
    {
      title: '固件消抖时间设得长。',
      body:
        '微动在通断的一瞬间会产生几毫秒的机械抖动,固件要把太近的两次合并成一次,' +
        '否则光标会自己连点。代价是消抖窗口内的真实点击也一起被吞了。有些鼠标的驱动里可以调这个值。',
    },
    {
      title: '回报率太低。',
      body:
        '鼠标的按键状态是搭在每一次上报里送出去的,**125Hz 意味着每 8ms 才采样一次按键**。' +
        '比 8ms 还短的一次按压,可能一次也没被采到。想确认的话去跑一遍回报率测试。',
    },
  ] as Array<{ title: string; body: string }>,
  fewerTail:
    '这两种情况都属于**鼠标在丢你的操作**,而不是测试工具的问题——换一只鼠标测同样的手法,数字会明显不一样。',

  faqHeading: '常见问题',
  faq: [
    {
      q: '为什么我点的次数比实际点的少?',
      a:
        '先怀疑鼠标的固件消抖(debounce)。微动在按下和弹起的一瞬间会产生几毫秒的机械抖动,' +
        '固件会把太近的两次通断合并成一次——消抖时间设得长的鼠标,快速连点会被整片吞掉。' +
        '其次是回报率:鼠标的按键状态是搭在每一次上报里送出去的,125Hz 意味着每 8ms 才采样一次按键,' +
        '比这更短的按压可能一次都没被采到。这一页**自己也占一小份**,但少得很有限:计时不是精确卡在整秒上停的,' +
        '它每 80 毫秒结算一次,所以到点之后、结算之前那几十毫秒里落下的点击会被判在窗口外丢掉——' +
        '**一次测试最多一两下**。如果差的远不止这个数,那就不是页面的问题,回到上面两条去查。',
    },
    {
      q: 'CPS 多少算正常?',
      a:
        '没有官方标准,也不该有。常见区间是 4–6(普通人)、7–9(常玩射击游戏)、10 以上(需要专门的点击技巧)。' +
        '同一个人的成绩还会随手指、疲劳程度、鼠标微动的硬度大幅变化,所以把两次测量的差异当"参考"看就好,' +
        '别当成体检指标。',
    },
    {
      q: '为什么只算左键?',
      a:
        '因为 CPS 比的是"用最常用的那根手指能点多快",把右键和中键混进来会让不同人之间的成绩根本没法比。' +
        '另外这一页只统计左键,中键和右键一律不计;中键的自动滚动和右键菜单在测试时也被挡掉了,不会打断你连点。' +
        '想单独测右键响应,用按键测试页。',
    },
    {
      q: '高 CPS 会伤鼠标吗?',
      a:
        '会加速微动磨损,这是有代价的。微动的标称寿命通常是按几千万次点击计的,' +
        '而高频连点会让触点反复拉弧、弹片反复形变。如果只是偶尔测一下成绩无所谓;' +
        '天天刷纪录,微动提前出现连击是很常见的结果。',
    },
  ] as CpsFaqItem[],
};

export const cpsEn: typeof cpsZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'cps-test',
  metaTitle: 'CPS test — measure clicks per second online',
  metaDescription:
    'Online CPS test: measure clicks per second in 5, 10 and 30 second modes, and track your current speed against your personal best.',

  h1: 'Mouse CPS click speed test',
  lede:
    'Pick a duration, then **just start clicking the left button** in the box below — ' +
    'the first click starts the run, there is nothing to arm first. When it ends you get the ' +
    'average across the whole run plus the highest count in any single second. ' +
    'Scores are kept in your own browser only.',

  durations: {
    '5000': '5 s',
    '10000': '10 s',
    '30000': '30 s',
  },

  reset: 'Reset',
  cancel: 'Cancel',

  startCall: 'Click to start',
  hintMeta: '{label} · click fast in here',

  liveMeta: 'clicks · {left}s left · {cps} CPS',
  overMeta: 'Time up · click again to retry',

  stats: {
    average: { label: 'Average CPS', hint: 'total clicks ÷ run length' },
    peak: { label: 'Peak CPS', hint: 'most clicks in any one second' },
    clicks: { label: 'Clicks', hint: '' },
    best: { label: 'Personal best', hint: 'peak, stored on this machine' },
  },
  bestRecord: 'new personal best',
  bestPlain: 'peak, stored on this machine',

  chart: {
    heading: 'Clicks per second',
    lede:
      'Each bar is how many clicks landed in one second. Bars that step down mean your hand is ' +
      'tiring — that is normal, sustained effort does not hold. Bars that **jump up and down** ' +
      'usually mean the rhythm broke, or the mouse swallowed clicks in that second.',
    left: '1s',
    right: '{seconds}s · full scale {max}/s',
    barTitle: 'Second {n} · {count} clicks',
  },

  referenceHeading: 'Typical ranges',
  referenceLede:
    'These are **common ranges, not a standard**. Switch stiffness, which finger you use and ' +
    'whether you use a special clicking technique can each move one person’s score several times over.',
  referenceColumns: { range: 'CPS', level: 'Roughly', note: 'What it takes' },
  reference: [
    {
      range: 'under 3',
      level: 'Slow',
      note: 'Mostly older users, people new to a trackpad, or a very stiff switch',
    },
    { range: '4 – 6', level: 'Average', note: 'Where most adults who do not game regularly land' },
    { range: '7 – 9', level: 'Practised', note: 'Easy to reach if you play shooters regularly' },
    { range: '10 – 14', level: 'Fast', note: 'Needs a technique such as jitter clicking' },
    {
      range: '15 – 25',
      level: 'Special technique',
      note: 'Butterfly clicking — bouncing the finger off the switch rather than using muscle',
    },
    {
      range: '25 and up',
      level: 'Drag clicking',
      note:
        'Dragging a finger across the switch to make it chatter on purpose. 25–40 is common, a good ' +
        'mouse goes higher. At this level a hand and an auto-clicker look identical in the data — ' +
        'the numbers are real, they just cannot prove a human produced them',
    },
  ],

  whichHeading: 'Average and peak are far apart — which one matters?',
  whichBody:
    '**Both, because they answer different questions.** Average CPS is total clicks over total ' +
    'time: how much you **held up** over the run. Peak is the best single second: how fast you ' +
    '**can** go. A typical result is average 6, peak 9 — a fast start and a fade, and that shape ' +
    'is completely normal. The per-second chart on this page exists to show you that shape.',
  whichTimer:
    'That is also why the run length **has to be timed explicitly**. "20 clicks in the first ' +
    'second, then nothing for four" would read as 20 CPS if we cut the window at the last click — ' +
    'the idle stretch simply does not exist in click timestamps. No click, no event; only a timer ' +
    'knows it happened.',

  fewerHeading: 'Clicking fewer times than you did is usually the mouse',
  fewerLede:
    'This is the most useful thing a CPS test does. If you clicked 100 times and the page counted ' +
    '88, those 12 missing clicks are **not the page dropping them — the mouse never reported ' +
    'them**. Two usual causes:',
  fewerPoints: [
    {
      title: 'A long firmware debounce.',
      /*
       * **开头那个空格是内容,不是手滑。** 这一段渲染成
       * `<li><strong>{title}</strong>{body}</li>`,而 Astro **不会**在两个
       * 表达式之间插空格 —— 中文那样是对的(中文本来就不用空格断句),
       * 英文却会印成 `debounce.The switch…`。
       * 所以英文这一侧自己带一个前导空格;中文那侧保持紧凑。
       */
      body:
        ' The switch chatters mechanically for a few milliseconds on every contact. Firmware merges ' +
        'contacts that are too close together, otherwise the cursor would double-click on its own. ' +
        'The price is that real clicks inside that window get swallowed too. Some mice let you ' +
        'change this in their driver.',
    },
    {
      title: 'A low polling rate.',
      /* 前导空格同上:它是内容,不是排版 */
      body:
        ' Button state rides along with every report, so **125 Hz samples the button only once ' +
        'every 8 ms**. A press shorter than that may never be sampled at all. Run the polling rate ' +
        'test to confirm.',
    },
  ],
  fewerTail:
    'Both of these mean **the mouse is dropping your input**, not that the tool is broken. Test ' +
    'the same way with a different mouse and the numbers will move noticeably.',

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'Why does it count fewer clicks than I made?',
      a:
        'Suspect firmware debounce first. A switch chatters mechanically for a few milliseconds on ' +
        'both press and release, and firmware merges contacts that are too close together — a mouse ' +
        'with a long debounce window will swallow a burst of fast clicks whole. Second suspect: ' +
        'the polling rate. Button state rides along with every report, and 125 Hz samples the ' +
        'button only once every 8 ms, so a shorter press may never be sampled. This page **also ' +
        'loses a little of its own**, but very little: the timer does not stop exactly on the ' +
        'second, it settles every 80 ms, so clicks that land between the deadline and the settle ' +
        'fall outside the window — **one or two per run at most**. If you are missing far more ' +
        'than that, it is not the page; go back to the two causes above.',
    },
    {
      q: 'What CPS is normal?',
      a:
        'There is no official standard and there should not be. Common ranges are 4–6 (most ' +
        'people), 7–9 (regular shooter players) and 10+ (needs a dedicated technique). One ' +
        'person’s score also swings a lot with which finger they use, how tired they are and ' +
        'how stiff the switch is, so treat a difference between two runs as a hint, not a health ' +
        'check.',
    },
    {
      q: 'Why only the left button?',
      a:
        'Because CPS asks how fast you can click with the finger you use most, and mixing in the ' +
        'right and middle buttons would make two people’s scores impossible to compare. This ' +
        'page counts the left button only. Middle-click autoscroll and the right-click menu are ' +
        'blocked during a run so they cannot interrupt you. To check the right button on its own, ' +
        'use the button test page.',
    },
    {
      q: 'Does a high CPS wear the mouse out?',
      a:
        'It does speed up switch wear, and that is a real cost. A switch is usually rated for tens ' +
        'of millions of clicks, and fast clicking arcs across the contacts and flexes the spring ' +
        'over and over. Measuring your score occasionally is fine; grinding for a record every day ' +
        'is a common way to end up with a switch that double-clicks early.',
    },
  ],
};
