/**
 * 坏点检测页(`/dead-pixel-test/`)的文案。
 *
 * ## 为什么一页一个文件
 *
 * 全站要做双语,量是约 2000 条字符串、21 个页面。**每页一份文件**是为了让
 * 这件事可以一页一页做、也可以几页同时做而互不冲突 —— 都塞进 `zh.ts` /
 * `en.ts` 两个大文件的话,两个人(或两个 agent)同时动一页就会撞在一起。
 *
 * ## 两边的键必须一样,而这是**机制**不是约定
 *
 * `deadPixelEn` 声明成 `typeof deadPixelZh` —— 英文版漏一个键、拼错一个键、
 * 多出一个键,都是 `npm run typecheck` 直接红,而不是英文页面上静默少一句话。
 *
 * ## 带 `**强调**` 的段落
 *
 * 正文里那几个 `**` 是**故意留的标记**,渲染时走 `faq.ts` 的 `faqHtml()`
 * (和 FAQ 答案同一套)。所以文案可以整段放在这里,不必为了加粗把句子拆成
 * 一堆片段 —— 拆开之后翻译的人看不到完整的句子,译文必然别扭。
 *
 * ## 这一页的特殊处境:它**不出任何读数**
 *
 * 全站的主张是"测不准就明说",而这一页推到极致:**它一个数都不给**,
 * 坏点是**用户自己看出来的**。所以英文翻译里凡涉及结论的地方,都要保住
 * "页面不作判断、只有你的眼睛能给结论"这个语气 —— 换语言不能把它换成
 * 一句中性的操作说明。
 *
 * ## `readout` 和 `readoutMeta` 为什么是两个键
 *
 * 页面里那句读数是**同一句话的两个出处**:正文里那份写死了"当前:黑"
 * (首屏、还没点过任何按钮),脚本 `render()` 里那份带 `${patch.label}`
 * (每次换色重写)。两句只差颜色名一个字,所以拆成 `readout`(逐字原文)
 * 与 `readoutMeta`(`{label}` 占位);**接线时首屏也可以直接用
 * `fill(readoutMeta, { label })`**,那样 `readout` 就是冗余的。
 */

/** FAQ 一行的形状。**文案两边键必须一样**,见文件头 */
export interface DeadPixelFaqItem {
  q: string;
  a: string;
}

export const deadPixelZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'dead-pixel-test',
  /** 页面自己的 <title> / meta description。**和 `tools.ts` 里那份逐字相同**,
   *  由 `tests/i18n.test.ts` 的对账用例钉着 —— 漂了会红。 */
  metaTitle: '屏幕坏点检测 - 在线全屏纯色测试',
  metaDescription:
    '全屏依次显示红、绿、蓝、白、黑五种纯色,用来找出屏幕上的坏点、亮点与暗斑。需要你自己盯着看,它不出任何读数——检测结果只有你的眼睛能给,页面不会替你下结论。',

  h1: '屏幕坏点检测',
  lede:
    '把屏幕依次铺成黑、白、红、绿、蓝五种**纯色**,你盯着看就行。' +
    '**这一页不判断任何东西**——坏点是你看出来的,不是它算出来的。' +
    '它在做的是给你一块干净、准确、没有环境光干扰的底板。',

  /**
   * 那五片纯色按钮上的字。**键就是 `PATCHES` 里的 `id`**
   * (`black` / `white` / `red` / `green` / `blue`),顺序和色值住在页面里 ——
   * 那两样是结构,不是文案,搬进来只会多一份要对齐的清单。
   */
  patches: {
    black: '黑',
    white: '白',
    red: '红',
    green: '绿',
    blue: '蓝',
  },

  fullscreenButton: '全屏检测',
  /** `document.fullscreenEnabled` 为 false 时按钮上换的字 */
  fullscreenUnsupported: '全屏(此浏览器不支持)',
  /** 请求全屏被拒时写进提示条的那句 */
  fullscreenRejected: '浏览器拒绝了全屏请求。页面内的色块照样能用 —— 凑近看就行。',

  /** 提示条(不在全屏时)。**正文里那份和脚本复位时那份是同一句** */
  hintIdle: '点颜色切换;全屏之后单击或按空格换下一个',
  /** 进入全屏之后提示条上那句 */
  hintFullscreen: '单击或按空格换下一个颜色,按 Esc 退出',

  /** 色场那块 `role="img"` 的无障碍名 */
  fieldAria: '纯色检测板',
  /** 全屏里那条浮在色场上的提示(淡出前露 3 秒) */
  fullscreenHint: '单击或按空格换下一个颜色 · 按 Esc 退出全屏',

  /** 首屏那句读数。`{label}` 版本见 `readoutMeta` */
  readout: '当前:黑。把房间弄暗,盯着屏幕的每一个角落各看几秒,再换下一个颜色。',
  /** 脚本每次换色重写的那句。`{label}` 是当前色名(如「白」) */
  readoutMeta: '当前:{label}。把房间弄暗,盯着屏幕的每一个角落各看几秒,再换下一个颜色。',

  howHeading: '怎么找',
  steps: [
    '**把屏幕擦干净。**灰尘和指纹在黑屏上比坏点显眼得多,' +
      '而它们一擦就掉——先擦一次能省掉大半的虚惊。',
    '**把房间弄暗。**反光会让你把环境光当成屏幕的问题。' +
      '尤其是"暗斑"和"漏光",不在暗处根本分不出来。',
    '**点「全屏检测」,然后固定盯一个区域。**' +
      '在几种颜色之间切换时**不要移开视线**——坏点的判据是' +
      '"这个点在所有颜色下都不跟着变",换色的时候跟着眼睛跑就找不到了。',
    '**黑屏找亮点,白屏找暗点,红绿蓝找单色子像素。**' +
      '一块屏幕通常有上百万个像素,逐个数不现实——地毯式扫几遍就够了,' +
      '真有问题的地方会自己跳出来。',
  ],

  afterHeading: '找到之后',
  afterParagraphs: [
    '先分清是哪一种,因为处理方式完全不同:**亮点和暗点**是像素自己坏了,' +
      '保修期内一般可以按"坏点数超过标准"申请售后(各厂商的标准不一样,有的是 3 个,' +
      '有的更多)。**暗斑、漏光、亮度不均**则是背光或整块面板的问题,' +
      '按坏点数算往往不达标,但通常更容易被认定为质量问题。' +
      '**记住你看到的是哪一种、在什么颜色下看到**,送修的时候说得清楚得多。',
    '需要说明的是:屏幕上偶尔会有**卡住的像素**——它不是坏,是被信号' +
      '卡在了某个状态上,有时过一段时间自己会恢复,也可能靠专门的"像素修复"闪烁' +
      '恢复。这一页不做这个:那类工具的效果本身争议很大,而它有癫痫风险,' +
      '不该由我们随便替人决定要不要看。',
  ],

  faqHeading: '常见问题',
  faq: [
    {
      q: '这一页会告诉我哪里有坏点吗?',
      a:
        '不会。**它一个读数都不出,也不做任何判断。**页面能做的只有一件事:把屏幕铺成一片精确的纯色。' +
        '坏点是**你看着**屏幕找出来的——盯着一个区域,在几种颜色之间来回切,' +
        '那个一直不跟着变的点就是坏点。把这件事交给程序是做不到的:' +
        '网页读不到屏幕的像素,截图 API 拿到的也往往是另一份被处理过的画面。',
    },
    {
      q: '为什么要切好几种颜色?黑屏和白屏看不出区别吗?',
      a:
        '看不出。坏点分两种:**常亮点**在黑屏上最显眼(它亮着,周围是黑的),' +
        '**常暗点**在白屏上最显眼(它黑着,周围是白的)。而一个"子像素坏了"的点' +
        '(比如红绿都正常、只有蓝不亮)在黑白屏上都看不出来,只有铺纯红或纯蓝时才现形。' +
        '所以红绿蓝三色不是凑数,它们各管一个子像素。',
    },
    {
      q: '"暗斑""漏光"这类问题能测吗?',
      a:
        '能看,但和坏点不是一回事,而且**这一页同样不下结论**。把屏幕铺成纯黑,在**暗房**里看:' +
        '四角发灰是背光不均或漏光,一整片不均匀是亮度均匀性问题。这些都需要你把房间弄暗、' +
        '从正面而不是斜着看,否则看到的其实是环境光在屏幕上的反射。**看清了是什么,才知道该不该送修。**',
    },
    {
      q: '手机上没有全屏按钮?',
      a:
        'iOS 的 Safari 对非视频元素不支持全屏,这是浏览器的限制,页面绕不过去。' +
        '**没有全屏也照样能用**:直接点那几个颜色按钮,色块会铺满页面里那块区域,' +
        '把手机转过来、凑近看就行 —— 只是没法盖住浏览器的地址栏。' +
        '安卓上的 Chrome 一般可以全屏。',
    },
  ] as DeadPixelFaqItem[],
};

export const deadPixelEn: typeof deadPixelZh = {
  /** 这一份文案属于哪一页。**中英开关靠它判断这一页有没有另一种语言** */
  slug: 'dead-pixel-test',
  metaTitle: 'Dead pixel test — full-screen solid color check',
  metaDescription:
    'Shows red, green, blue, white and black full-screen in turn to help you find dead pixels, bright spots and dark patches. You do the looking yourself — it gives no reading, and the result is something only your eyes can provide; the page will not draw a conclusion for you.',

  h1: 'Screen dead pixel test',
  lede:
    'Fill the screen with five **solid colors** in turn — black, white, red, green and blue — and just look. ' +
    '**This page judges nothing** — you find the dead pixels, it does not compute them. ' +
    'All it is doing is giving you a clean, accurate backdrop with no room light to get in the way.',

  patches: {
    black: 'Black',
    white: 'White',
    red: 'Red',
    green: 'Green',
    blue: 'Blue',
  },

  fullscreenButton: 'Full screen',
  fullscreenUnsupported: 'Full screen (not supported here)',
  fullscreenRejected:
    'The browser refused the full-screen request. The in-page patches still work — just lean in.',

  hintIdle: 'Click a color to switch; in full screen, click or press space for the next one',
  hintFullscreen: 'Click or press space for the next color, Esc to exit',

  fieldAria: 'Solid color test field',
  fullscreenHint: 'Click or press space for the next color · Esc to exit full screen',

  readout: 'Now: black. Dim the room, stare at each corner of the screen for a few seconds, then switch to the next color.',
  readoutMeta:
    'Now: {label}. Dim the room, stare at each corner of the screen for a few seconds, then switch to the next color.',

  howHeading: 'How to look',
  steps: [
    '**Wipe the screen first.** Dust and fingerprints show up far more than dead pixels on a black ' +
      'screen, and they wipe right off — a quick clean saves most of the false alarms.',
    '**Dim the room.** Reflections will make you read room light as a screen fault. ' +
      'Dark patches and backlight bleed especially cannot be told apart unless it is dark.',
    '**Click "Full screen", then hold your gaze on one area.** ' +
      'When switching between colors **do not look away** — a dead pixel is defined by ' +
      '"this dot does not change under any color", and if your eye follows the color change you will never spot it.',
    '**On black look for bright dots, on white for dark dots, on red/green/blue for a single dead sub-pixel.** ' +
      'A screen usually has over a million pixels, so counting them one by one is not realistic — ' +
      'a few sweep passes are enough, and anything really wrong will jump out on its own.',
  ],

  afterHeading: 'Once you find something',
  afterParagraphs: [
    'First work out which kind it is, because the handling is completely different: ' +
      '**bright and dark dots** mean the pixel itself has failed, and within warranty you can usually ' +
      'claim on "more dead pixels than the standard allows" (the standard varies — some makers say 3, ' +
      'some more). **Dark patches, backlight bleed and uneven brightness** are a backlight or whole-panel ' +
      'problem; by dead-pixel count they often fall short, but they are usually easier to have accepted as ' +
      'a defect. **Note which kind you saw, and under which color** — you can describe it far more clearly ' +
      'when you send it in.',
    'One thing worth saying: a screen will now and then have a **stuck pixel** — not dead, just held in ' +
      'one state by the signal. Sometimes it recovers on its own after a while, or with a dedicated ' +
      '"pixel fixer" flicker. This page does not do that: those tools are genuinely disputed as to whether ' +
      'they work, and they carry a seizure risk, so it is not for us to decide on someone\'s behalf that ' +
      'they should watch one.',
  ],

  faqHeading: 'Common questions',
  faq: [
    {
      q: 'Will this page tell me where the dead pixels are?',
      a:
        'No. **It produces no reading at all and makes no judgement.** The one thing the page can do is ' +
        'flood the screen with an exact solid color. Dead pixels are found by **you looking** at the screen — ' +
        'fix your eyes on an area, cycle back and forth through the colors, and the dot that never changes ' +
        'with them is the dead one. Handing this to a program does not work: a web page cannot read the ' +
        'screen\'s pixels, and the screenshot API tends to hand back a different, processed image anyway.',
    },
    {
      q: 'Why cycle through several colors? Is black and white not enough?',
      a:
        'It is not enough. There are two kinds of dead pixel: **stuck-on dots** stand out most on a black ' +
        'screen (they are lit, everything around them is black) and **stuck-off dots** stand out most on ' +
        'white (they are black, everything around them is white). And a dot with a **dead sub-pixel** ' +
        '(red and green fine, only blue out, say) is invisible on both black and white — it only shows up ' +
        'under solid red or solid blue. So red, green and blue are not padding: each one covers a sub-pixel.',
    },
    {
      q: 'Can it test things like "dark patches" and "backlight bleed"?',
      a:
        'You can look, but they are not the same thing as dead pixels, and **this page likewise draws no ' +
        'conclusion**. Flood the screen with pure black and look in a **dark room**: gray corners mean ' +
        'uneven backlight or bleed, a whole uneven field means a brightness-uniformity problem. All of these ' +
        'need the room dimmed and to be viewed head-on rather than at an angle — otherwise what you are ' +
        'seeing is really room light reflecting off the screen. **Knowing what it is tells you whether it ' +
        'is worth repairing.**',
    },
    {
      q: 'There is no full-screen button on my phone?',
      a:
        'Safari on iOS does not support full screen for non-video elements — that is a browser limit the ' +
        'page cannot get around. **It still works without full screen**: just tap the color buttons and the ' +
        'patch fills the area on the page; turn the phone sideways and lean in — you just cannot cover the ' +
        'browser\'s address bar. Chrome on Android generally can go full screen.',
    },
  ],
};
