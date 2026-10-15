/**
 * 工具箱清单页(`/toolbox/`)的文案。
 *
 * ## 为什么一页一个文件
 *
 * 理由写在 `pages/cps.ts` 的文件头。
 *
 * ## 两边的键必须一样,而这是**机制**不是约定
 *
 * `toolboxEn` 声明成 `typeof toolboxZh` —— 英文版漏一个键、拼错一个键、
 * 多出一个键,都是 `npm run typecheck` 直接红。
 *
 * ## 这一页**没有**每件工具的说明文字,而且这是有意的
 *
 * 清单里那八行说明**不存在这份文件里** —— 它们是各页自己的 `metaDescription`,
 * 由页面用 `pageCopyBySlug()` 现取。理由是**同一句话只能有一个来源**:
 * `tools.ts` 里那份中文 description 和每页目录里的 `metaDescription` 已经被
 * `tests/i18n.test.ts` 钉成同一个字符串了,再往这里抄第三份就是给日后漂移留缝。
 * 所以英文清单里那八行说明是**各页自己的英文 meta description**,逐条跟着那一页走。
 *
 * ## 模板里的 `<strong>` 怎么处理
 *
 * 导语里有两处强调(`诊断` / `玩`),源模板里是 `<strong>` —— 这里写成 `**`,
 * 渲染走 `faqHtml()` + `set:html`。**这两处必须走 `faqHtml`,不能直接插值**:
 * 直接插值会在页面上原样印出一对星号(`toolbox.astro` 的源注释里那条"踩过六次"
 * 的坑记的就是这件事,只是当年的解法是模板里写 `<strong>`)。FAQ 的答案同理。
 *
 * 全页没有反引号、没有 `{占位符}`、没有 `<br>`,也没有 `mark-danger` 那种带颜色的 span,
 * 所以这份目录里**没有 `{mark}` 那一套** —— 和 `scroll.ts` 的 `{redMark}` 不一样,
 * 不是漏了。
 */

/** FAQ 的一条。和 `scroll.ts` 的 `ScrollFaqItem` 是同一个形状。 */
export interface ToolboxFaqItem {
  q: string;
  a: string;
}

export const toolboxZh = {
  slug: 'toolbox',

  metaTitle: '鼠标趣味工具箱 - 手稳度、涂鸦板、坏点检测等在线小工具',
  metaDescription:
    '一批在浏览器里直接跑的鼠标与屏幕小工具:手稳度定靶挑战、鼠标涂鸦板、灵敏度换算器、屏幕坏点检测、刷新率目视测试,以及反应速度与瞄准。无需安装,数据全部留在本机。',

  h1: '鼠标趣味工具箱',

  /**
   * 结构化数据里那条 `CollectionPage.description`。
   *
   * **它和 `metaDescription` 不是同一句,是刻意的** —— 源文件里就是这样,
   * 两条文案各自成句(这条短一些、不带"数据全部留在本机")。转换时逐字照搬,
   * 没有合并成一条。
   */
  ldDescription:
    '一批在浏览器里直接跑的鼠标与屏幕小工具:手稳度定靶、涂鸦板、灵敏度换算、屏幕坏点检测、刷新率目视测试,以及反应速度与瞄准。无需安装。',

  /** 导语。带两处 `**` —— 必须走 `faqHtml()` */
  lede:
    '上面那一排是**诊断** —— 测鼠标坏没坏,每一页都说清了自己的数可信到什么程度。' +
    '这里是**玩**的:能测的照旧标出口径,不测的会直说它不测。' +
    '所有成绩只存在这台机器的浏览器里。**页面会往服务器报一个「这一页今天被打开了几次」的计数,但它不认人、不存 IP、也不带任何成绩** —— 详见下面的常见问题。',

  listTitle: '玩一玩',
  faqTitle: '常见问题',

  faq: [
    {
      q: '这些工具的成绩会被上传吗?',
      a:
        '不会。这里每一件都在你的浏览器里跑,成绩只写进本机的 localStorage,关掉页面也还在,' +
        '**没有任何一步会把成绩发出去**。所以它们之间不能互相比较,和别人的成绩更不能比 ——' +
        '同一台机器上前后对比才有意义。',
    },
    {
      q: '那你们后台看到的访问量是怎么来的?',
      a:
        '页面会往服务器报一个计数:**哪一页、哪一天、被打开了几次**。就这三样。' +
        '它没有访客标识、没有 cookie、没有 IP、没有设备信息,时间只到天 ——' +
        '所以它**答不上来"今天来了几个人"**,那不是没做,是它根本没有那个能力。' +
        '**成绩本身,一个字都不会发出去。**',
    },
    {
      q: '为什么有的标着"不测量"?',
      a:
        '因为那几件确实一个数都不出。涂鸦板是画着玩的,坏点检测是让屏幕显示几片纯色、**要你亲眼看**,' +
        '刷新率目视测试是让你看方块动得顺不顺 —— 它们给你的是一件事**看起来**怎么样,不是量出来的数值。' +
        '另外几件测量出来的数也都标了口径(直接测得 / 估算),**能说的说到,不能说的不编**。',
    },
    {
      q: '用这些能判断鼠标好不好吗?',
      a:
        '能看出问题的能看出来,看不出来的不能反推。比如手稳度和瞄准都**只统计指针**,而指针已经被' +
        '操作系统的平滑与加速度处理过一遍了,所以成绩里混着系统和屏幕的账。要判断鼠标硬件本身,' +
        '请用上面那一排**诊断工具**——那边每一页都写清了自己的数可信到什么程度。',
    },
    {
      q: '手机上能用吗?',
      a:
        '坏的检测和刷新率那几件可以,靠触屏也能玩;但凡是"鼠标"两字的(手稳度、涂鸦板、瞄准)' +
        '在触屏上测的就不是同一件事了 —— 手指没有指针,也就没有指针的漂移。',
    },
  ] as ToolboxFaqItem[],
};

export const toolboxEn: typeof toolboxZh = {
  slug: 'toolbox',

  metaTitle: 'Mouse toolbox — hand steadiness, doodle pad, dead pixels and more',
  metaDescription:
    'A set of small mouse and screen tools that run right in the browser: a hand-steadiness target challenge, a doodle pad, a sensitivity converter, a dead-pixel check, a visual refresh-rate test, plus reaction time and aim. Nothing to install, and all data stays on your machine.',

  h1: 'Mouse toolbox',

  ldDescription:
    'A set of small mouse and screen tools that run right in the browser: hand steadiness, a doodle pad, sensitivity conversion, a dead-pixel check, a visual refresh-rate test, plus reaction time and aim. Nothing to install.',

  lede:
    'The row above is **diagnostic** — it measures whether your mouse is faulty, and every page there ' +
    'says how far its numbers can be trusted. What you get here is the **fun** side: anything that can ' +
    'be measured still gets labelled, and anything that cannot is stated outright. Every score stays in ' +
    'this machine’s browser. **A page does report one thing to the server — a count of how many times ' +
    'that page was opened today. It carries no identity, no IP and no score at all** — see the common ' +
    'questions below.',

  listTitle: 'Have a play',
  faqTitle: 'Common questions',

  faq: [
    {
      q: 'Are the scores from these tools uploaded?',
      a:
        'No. Each one runs inside your browser, and a score is only written to the local localStorage — ' +
        'it is still there after you close the page, and **nothing in the process sends a score out**. ' +
        'That also means the tools are not comparable with each other, and even less with someone else’s ' +
        'score — only a before/after comparison on the same machine means anything.',
    },
    {
      q: 'Then where does the visit count in the admin come from?',
      a:
        'A page reports a counter to the server: **which page, which day, and how many times it was ' +
        'opened**. That is all three things. There is no visitor id, no cookie, no IP and no device ' +
        'information, and the date is only ever a day — so it **cannot answer "how many people came ' +
        'today"**, and that is not an omission, it simply has no way to know. **The scores themselves ' +
        'never leave your browser.**',
    },
    {
      q: 'Why are some labelled "not a measurement"?',
      a:
        'Because those really do not produce a number. The doodle pad is for drawing; the dead-pixel check ' +
        'shows you patches of solid colour and **relies on your own eyes**; the visual refresh-rate test ' +
        'lets you judge whether a block moves smoothly. They tell you how something **looks**, not a ' +
        'measured value. The numbers that are measured each carry their own footing (measured directly / ' +
        'estimated) — **say what can be said, never invent the rest**.',
    },
    {
      q: 'Can I use these to judge whether a mouse is good?',
      a:
        'A problem that shows up can be seen; one that does not show up cannot be reasoned backwards. Hand ' +
        'steadiness and aim, for instance, **measure the pointer only** — and the pointer has already been ' +
        'through the operating system’s smoothing and acceleration, so the score carries some of the ' +
        'system’s and the screen’s account with it. To judge the hardware itself, use the **diagnostic ' +
        'tools** in the row above — every one of those pages states how far its numbers can be trusted.',
    },
    {
      q: 'Do these work on a phone?',
      a:
        'The dead-pixel check and the refresh-rate test do — a touchscreen is fine for those. But anything ' +
        'with "mouse" in the name (hand steadiness, the doodle pad, aim) measures something different on a ' +
        'touchscreen: a finger has no pointer, and so it has no pointer drift either.',
    },
  ],
};
