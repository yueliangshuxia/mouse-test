/**
 * 涂鸦板页(`/doodle-test/`)的文案。
 *
 * 一页一份文件,理由写在 `pages/cps.ts` 的文件头:全站约 2000 条字符串、
 * 21 个页面,塞进同一个文件的话两个人同时动一页就会撞。
 *
 * ## 两边的键必须一样,而这是**机制**不是约定
 *
 * `doodleEn` 声明成 `typeof doodleZh` —— 英文版漏一个键、拼错一个键、多出
 * 一个键,都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 这一页的正文几乎都是带 `**强调**` 的整段
 *
 * 「不出读数。」这类加粗在页面里原先是 `<strong>` 元素,搬进来时一律换成
 * `**` 标记,渲染时走 `faq.ts` 的 `faqHtml()`(和 FAQ 答案同一套)。
 * 所以整段可以住在一个键里,不必为了加粗把句子拆成一堆片段 —— 拆开之后
 * 翻译的人看不到完整的句子,译文必然别扭。
 *
 * 一处例外要在别处留意:源文件里第三个「不做的事」用的是 `<em>测</em>`
 * (斜体),而 `faqHtml()` 只认 `**`(粗体)。这里写成 `**测**` —— 保留强调,
 * 但样式从斜体变成了粗体。
 */

/** 涂鸦板 FAQ。一问一答,和页面里那份结构一致 */
export interface DoodleFaqItem {
  q: string;
  a: string;
}

export const doodleZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'doodle-test',
  /** 页面自己的 <title> / meta description。**中文那份和 `tools.ts` 逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '鼠标涂鸦板 - 在浏览器里按住左键随手画',
  metaDescription:
    '一个在线涂鸦板:按住左键就能画,可以调笔迹粗细、清空重来、把画好的图保存成 PNG。' +
    '它不出任何读数,也不判断鼠标好坏——就是画着玩的。所有内容都留在浏览器里,不上传。',

  h1: '鼠标涂鸦板',
  lede:
    '按住左键随便画。可以换笔迹粗细、清空重来、把画好的存成 PNG。' +
    '**这一页不出任何读数**——它就是一块画板,不判断你的鼠标好不好。' +
    '想测鼠标,请用上面那一排诊断工具。',

  /** 笔迹粗细选项。**key 是像素宽**,和按钮上的 `data-width` 对得上 */
  widths: {
    '3': '细',
    '8': '中',
    '20': '粗',
  },

  /** 控件那一行 */
  penLabel: '笔迹',
  clear: '清空',
  save: '保存图片',

  /** 测试面旁边那行小提示,和面上那行居中提示。前者清空之后会被脚本写回来 */
  hint: '按住左键在这里画',
  overlay: '按住左键,在这里画',

  limitsHeading: '这块板子刻意不做的事',
  limits: [
    '**不出读数。**不统计笔画数、不量速度、不判断线条直不直。' +
      '本站其余的工具页都在数东西,而这一页数出来的任何东西都没有用 ——' +
      '画得快不快和鼠标好不好没有关系。',
    '**不给颜色。**纸面走无彩色是全站的规矩,详见 FAQ。',
    '**不走采样层。**轨迹测试那一套(采样器 + 渲染层)是为了**测**而造的:' +
      '它把每一个采样点写进定长缓冲区,再由 rAF 循环读出来画。' +
      '画板要的是**按下即画、松开即断**,而且线要留在屏幕上不走样 ——' +
      '直接把点连起来才是对的做法,套那套机器只会凭空多一帧延迟。',
  ] as string[],

  stepsHeading: '画不出线怎么办',
  steps: [
    '**确认是按住了左键。**这一页只认左键,中键和右键不画。',
    '**确认指针在虚线框里。**画布只覆盖那块测试面。',
    '**还是不行的话,先看看别的工具页正不正常。**{link}里连左键都没反应的话,' +
      '那就不是这一页的问题了。',
  ] as string[],

  faqHeading: '常见问题',
  faq: [
    {
      q: '这个能测出鼠标有问题吗?',
      a:
        '**不能,而且这一页也不打算测。**它一个读数都不出。要判断鼠标有没有毛病,' +
        '请用上面那一排诊断工具 —— 那边每一页都写清了自己的数可信到什么程度。' +
        '这里只有一支笔和一块板。不过反过来说:如果你画出来的线有肉眼可见的断口、' +
        '或者明明画的是直线结果抖得像锯齿,那确实值得去轨迹测试页查一查,' +
        '**但那是你眼睛看出来的,不是这一页算出来的。**',
    },
    {
      q: '画出来是绿色的,能换颜色吗?',
      a:
        '不能。全站的纸面是**故意没有颜色**的 —— 有颜色的地方就是在出数,' +
        '这条分工靠"没颜色"维持。这一块板在仪器窗里(深底 + 磷光绿),' +
        '所以笔迹取的是和轨迹测试同一支笔的颜色。要彩色涂鸦请用系统自带的画图工具,' +
        '那一类需求这一页不跟它抢。',
    },
    {
      q: '画的东西会上传或者被存下来吗?',
      a:
        '不会。整个板子就是一块 canvas,你的每一笔都只在这块画布里,' +
        '关掉页面就没了。点「保存图片」是把画布转成一个 PNG **下载到你本机**,' +
        '也走的浏览器自己的下载,和这个站没有关系。',
    },
    {
      q: '触屏能画吗?',
      a:
        '能,而且是这一页少数在手机上体验不打折的功能 —— 手指按住就能画。' +
        '页面在画布上关掉了触摸滚动,所以手指划过去是画线而不是翻页;' +
        '要翻页请从画布外面划。',
    },
  ] as DoodleFaqItem[],
};

export const doodleEn: typeof doodleZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'doodle-test',
  metaTitle: 'Mouse doodle pad — freehand drawing in your browser',
  metaDescription:
    'An online doodle pad: hold the left button to draw, change the stroke width, clear and start ' +
    'over, and save the drawing as a PNG. It produces no readings and makes no judgment about your ' +
    'mouse — it is just for drawing. Everything stays in your browser and nothing is uploaded.',

  h1: 'Mouse doodle pad',
  lede:
    'Hold the left button and draw whatever you like. You can change the stroke width, clear the ' +
    'pad and start over, or save the drawing as a PNG. **This page produces no readings** — it is ' +
    'just a drawing pad and makes no judgment about your mouse. To test your mouse, use the ' +
    'diagnostic tools above.',

  widths: {
    '3': 'Thin',
    '8': 'Medium',
    '20': 'Thick',
  },

  penLabel: 'Stroke',
  clear: 'Clear',
  save: 'Save image',

  hint: 'Hold the left button and draw here',
  overlay: 'Hold the left button, draw here',

  limitsHeading: 'What this pad deliberately does not do',
  limits: [
    '**No readings.** It does not count strokes, measure speed, or judge whether your lines are ' +
      'straight. Every other tool page on this site counts something; anything this page could ' +
      'count would be useless — how fast you draw has nothing to do with whether the mouse is any ' +
      'good.',
    '**No color.** Keeping the page surface uncolored is a rule across the whole site; see the FAQ.',
    '**It does not use the sampling layer.** The trail test’s machinery (sampler plus renderer) ' +
      'was built to **measure**: it writes every sample into a fixed-length buffer, then reads them ' +
      'back out in a rAF loop to draw. A doodle pad needs **draw on press, break on release**, and ' +
      'lines that stay put on screen — joining the points directly is the right approach, and ' +
      'wrapping it in that machinery would only add a frame of delay for nothing.',
  ] as string[],

  stepsHeading: 'What to do if no line appears',
  steps: [
    '**Make sure the left button is actually held down.** This page only draws with the left ' +
      'button; the middle and right buttons do nothing.',
    '**Make sure the pointer is inside the dashed box.** The canvas only covers that test area.',
    '**If it still does not work, check whether the other tool pages are behaving.** If {link} ' +
      'shows no response even to the left button, the problem is not this page.',
  ] as string[],

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'Can this tell me whether my mouse is faulty?',
      a:
        '**No, and this page is not trying to.** It produces no readings at all. To judge whether ' +
        'your mouse is faulty, use the diagnostic tools above — each of those pages states how far ' +
        'its numbers can be trusted. Here there is only a pen and a pad. The other way round, ' +
        'though: if the lines you draw have visible breaks, or a line you drew straight comes out ' +
        'jagged, that is worth checking on the trail test page — **but you are seeing that with ' +
        'your eyes, not measuring it on this page.**',
    },
    {
      q: 'It draws in green — can I change the color?',
      a:
        'No. The page surface across this site is **deliberately uncolored** — color is reserved ' +
        'for places that are producing readings, and that split depends on the surface staying ' +
        'uncolored. This pad sits in an instrument panel (dark background, phosphor green), so the ' +
        'pen takes the same color as the trail test page. For colorful drawing, use your system’s ' +
        'own paint program; this page is not competing for that.',
    },
    {
      q: 'Is what I draw uploaded or saved anywhere?',
      a:
        'No. The pad is a single canvas; every stroke stays inside that canvas and is gone when you ' +
        'close the page. “Save image” converts the canvas to a PNG and **downloads it to your own ' +
        'machine** — that is the browser’s own download, and has nothing to do with this site.',
    },
    {
      q: 'Can I draw on a touchscreen?',
      a:
        'Yes, and it is one of the few things on this page that loses nothing on a phone — press a ' +
        'finger down and you are drawing. The page disables touch scrolling on the canvas, so a ' +
        'finger sliding across it draws a line instead of scrolling; to scroll the page, start the ' +
        'swipe outside the canvas.',
    },
  ],
};
