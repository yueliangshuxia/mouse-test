/**
 * 工具注册表 —— 全站唯一的事实来源。
 *
 * 导航栏、首页索引、结构化数据都从这里生成。这些列表如果各写一份,
 * 早晚会对不上(加了页面忘了加导航、首页列了不存在的链接)。
 *
 * `ready: false` 的项只作为规划占位出现在首页,**不生成链接**——
 * 指向不存在的页面会伤害抓取,而这些页面迟早要补上。
 */

export interface Tool {
  /** URL 路径段,同时也是页面文件名 */
  slug: string;
  /** 完整名称。页面标题、卡片标题、结构化数据用这个 */
  name: string;
  /**
   * 报头导航里的短名。**用在所有"同一行里放不下全名"的地方** —— 报头那条横向
   * 菜单,以及首页合并卡小注里那行「独立页面:长按拖拽 · 双击」(见
   * `MiniCard.astro` 的 `.mini-card__also`)。两处要的是同一个东西:一眼认得出
   * 是哪一页,而不占掉半行。
   *
   * 十二个名字里大部分以「鼠标」开头,而那两个字在一条鼠标测试站的报头里
   * 出现十二次是纯噪声。量过:全名排开 1142px(当时还是十项),比整栏(1060px)
   * 还宽 —— 也就是说用全名的话,报头**在任何宽度下都排不成一行**,永远挂着
   * 一个「更多」下拉,而那个"宽了就全部平铺"的状态根本不会出现。
   *
   * **报头现在是三段:框住的 10 项诊断 + 「更多」+ 「工具箱」。**这一段账
   * 逐个数都是量出来的(`mobile: false`),**旧的 649 / 825 / 814 / 1090 / 1085 /
   * 840 / 余量 15px 那一串从报头分段那一版起全部作废**:
   *
   * | 东西 | 宽 |
   * | --- | --- |
   * | 框里 10 项自身 | 549.4(10 项 + 9×16px 间距 = 693.4,再加框的 padding 8 + 边框 2 → **框 703.4**)|
   * | 「工具箱」那一项 | 79 |
   * | 「更多」那一项 | 65 |
   * | 导航列(1440 / 1280 / 1100 三档同宽) | 839.6 → **余量 839.6 − 703.4 − 16 − 79 = 41.2** |
   *
   * 折叠边界:**1059px 及以上一点不折**;1056px 及以下开始折(1056 / 1000 折 2、
   * 900 折 4、760 折 5、600 折 8、420 折 10)。**1057–1058 那两档是个例外,见下面。**
   *
   * 窄档(≤760px,全局唯一那个断点)里项的内边距收到 `4px 8px`、间距 16 → 12,
   * 所以「工具箱」那一项跟着从 79 掉到 73。
   *
   * 换了中文字体宽度就会翻成折叠态,所以这条**必须按量出来的数看,不许按字数估**。
   *
   * **1057–1058 这两档:框不折,但比轨道宽 0.8–1.8px,右边那条框线被裁掉。**
   * 成因在 `nav-overflow.ts` 的 `fits()`:它比的是 `track.scrollWidth <=
   * track.clientWidth`,而这两个数按规范都是**整数**,0.8px 的超出被四舍五入吃掉,
   * 于是判成"放得下"。轨道自己有 `overflow: hidden`,那 0.8px 就变成**裁切**。
   * 这不是新引入的 —— 老报头同样会在这一档多出零点几像素,只是那时候被裁的是
   * 末项的内边距盒,**看不见**;现在框的右边框正好落在那条线上,才露出来。
   * 2px 视口宽的一条缝,不值得为它去动 `fits()`(那是全仓唯一一处折叠判据)。
   *
   * `name` 仍然是完整的那一份,导航项挂 `title` 补全 —— 两处不重复维护。
   */
  navLabel: string;
  /** 页面 <title> */
  title: string;
  /** meta description,也是首页卡片摘要 */
  description: string;
  /**
   * 这个测量有几分可信。首页目录里逐项标出来。
   *
   * 这是全站主张("测不准就明说")在首页的落点,也是给用户的**选页依据**:
   * 想知道按键坏没坏,就该用直接测得的;只能给形状的那两页别拿来下结论。
   * 填之前先对一遍页面自己的措辞,别标得比页面敢说的更高。
   */
  confidence: Confidence;
  /**
   * 首页分组。诊断工具进第一片网格,趣味功能进下面那节「更多工具」。
   *
   * **必填,不是可选。** 可选的话漏写不会报错,后果是**首页静默少一张卡**;
   * 必填漏写就是 `npm run typecheck` 直接红。和 `Record<Exclude<MiniKind, null>,
   * MiniDevice>` 用必填键同一个理由:让"漏了"变成编译错误。
   */
  group: ToolGroup;
  /** 是否已实现 */
  ready: boolean;
}

/**
 * 首页那一节归哪一片网格。
 *
 * 只影响首页的**分节**,不影响导航、不影响顺序 —— 顺序仍然只有 `TOOLS` 一份,
 * 两片网格是按这个字段切出来的。
 */
export type ToolGroup = 'diagnostic' | 'fun';

/**
 * 可信度的五档。
 *
 * 分档依据是**输入是什么**,不是"这个测试好不好":
 * - `exact` —— 浏览器直接给出原始事件流,数出来的就是数出来的
 * - `estimate` —— 要经过一层换算或反推,假设不成立时结果不成立
 * - `shape` —— 只有**波形形状**可信(孤立尖峰、疑似瞬断),它证明不了"丢帧"
 * - `direction` —— 连形状都谈不上,只有**方向**这一位信息不需要任何假设
 * - `none` —— **这一页压根不做测量**(涂鸦板、坏点检测、刷新率目视)
 *
 * `none` 这一档存在的理由是**把"没有可信度"也当成一件要说出来的事**。
 * 那几页在工具箱里和会出数的页并排站着,不给它们一档,就只能硬塞进四档里
 * 最接近的那个 —— 而"涂鸦板:估算"是一句没有意义的话。**测不准就明说**
 * 落到这里就是:**不测量就说它不测量。**
 *
 * 它只可能出现在 `group: 'fun'` 的工具上。诊断工具全是测量,
 * `tests/nav.test.ts` 钉着这条。
 */
export type Confidence = 'exact' | 'estimate' | 'shape' | 'direction' | 'none';

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  exact: '直接测得',
  estimate: '估算',
  shape: '只能看形状',
  direction: '只能看方向',
  none: '不测量',
};

export const TOOLS: Tool[] = [
  {
    slug: 'button-test',
    name: '鼠标按键测试',
    navLabel: '按键',
    title: '鼠标按键测试 - 在线检测左右中键与侧键是否失灵',
    description:
      '免费在线鼠标按键测试,实时检测左键、右键、中键及侧键的点击响应,记录按下次数与按住时长,帮助判断微动开关是否老化。无需安装任何软件。',
    confidence: 'exact',
    group: 'diagnostic',
    ready: true,
  },
  {
    slug: 'hold-drag-test',
    name: '鼠标长按拖拽测试',
    navLabel: '长按拖拽',
    title: '鼠标长按拖拽测试 - 检测按住期间是否意外断开',
    description:
      '在线测试鼠标长按与拖拽稳定性,检测按住期间是否出现意外释放、信号瞬断,排查拖拽文件时中途掉落的问题。',
    confidence: 'shape',
    group: 'diagnostic',
    ready: true,
  },
  {
    slug: 'double-click-test',
    name: '鼠标双击测试',
    navLabel: '双击',
    title: '鼠标双击测试 - 检测微动开关连击与抖动',
    description:
      '在线检测鼠标是否存在双击故障(连击)。记录每次点击的间隔毫秒数,自动标记小于 50ms 的异常触发,判断微动开关是否老化。',
    confidence: 'exact',
    group: 'diagnostic',
    ready: true,
  },
  {
    slug: 'scroll-test',
    name: '鼠标滚轮测试',
    navLabel: '滚轮',
    title: '鼠标滚轮测试 - 检测滚轮方向与格数是否正常',
    description:
      '在线测试鼠标滚轮,实时显示滚动方向、每个滚轮的格数与累积位移,帮助判断滚轮编码器是否跳格或失灵。',
    confidence: 'direction',
    group: 'diagnostic',
    ready: true,
  },
  {
    slug: 'cps-test',
    name: '鼠标 CPS 点击速度测试',
    navLabel: 'CPS',
    title: 'CPS 测试 - 在线测量每秒点击速度',
    description:
      '在线 CPS 测试,测量每秒点击次数,支持 5 秒、10 秒、30 秒模式,记录当前速度与历史最佳成绩。',
    confidence: 'exact',
    group: 'diagnostic',
    ready: true,
  },
  {
    slug: 'trail-test',
    name: '鼠标轨迹测试',
    navLabel: '轨迹',
    title: '鼠标轨迹测试 - 检测平滑度、抖动与丢帧',
    description:
      '在线绘制鼠标移动轨迹,检测传感器是否丢帧、是否出现抖动或漂移,判断鼠标垫与传感器兼容性。',
    confidence: 'shape',
    group: 'diagnostic',
    ready: true,
  },
  {
    slug: 'polling-rate-test',
    name: '鼠标回报率测试',
    navLabel: '回报率',
    title: '鼠标回报率测试 - 在线检测 125Hz 至 8000Hz 轮询率',
    description:
      '在线测量鼠标回报率(轮询率),支持 125Hz 至 8000Hz,给出实测回报率、峰值与窗口波动,并对照标称档位判定。基于浏览器原生 Pointer Events,数据全部在本地计算。',
    confidence: 'exact',
    group: 'diagnostic',
    ready: true,
  },
  {
    slug: 'dpi-test',
    name: '鼠标 DPI 测试',
    navLabel: 'DPI',
    title: '鼠标 DPI 测试 - 在线估算鼠标灵敏度',
    description:
      '在线估算鼠标 DPI(CPI):按提示移动固定物理距离,由屏幕像素位移反推灵敏度。需要关闭指针加速以获得准确结果。',
    confidence: 'estimate',
    group: 'diagnostic',
    ready: true,
  },
  {
    slug: 'acceleration-test',
    name: '鼠标加速度测试',
    navLabel: '加速度',
    title: '鼠标加速度测试 - 检测指针加速是否影响瞄准',
    description:
      '在线检测系统鼠标加速:以不同速度移动相同物理距离,比较屏幕位移是否一致,判断加速度是否开启。',
    confidence: 'estimate',
    group: 'diagnostic',
    ready: true,
  },
  {
    slug: 'keyboard-test',
    name: '键盘按键测试',
    navLabel: '键盘',
    title: '键盘按键测试 - 在线检测按键失灵与鬼键',
    description:
      '在线键盘测试,按下任意键即时高亮,检测失灵按键与同时按键冲突(鬼键),支持全键位显示。',
    confidence: 'exact',
    group: 'diagnostic',
    ready: true,
  },
  /*
   * 下面七项是**趣味工具**,不是诊断 —— 它们住「工具箱」那一项的下拉里
   * (见 `TOOLBOX` / `NAV`),报头那片带框的组只取 `DIAGNOSTIC_TOOLS`。
   *
   * 顺序按"练手的 → 玩的 → 算的 → 看屏幕的"排,因为「工具箱」页和那个下拉
   * **都按这个顺序列**(清单是从 `NAV.dropdown` 派生的,不是手写的第二份):
   *   手稳度 / 反应 / 瞄准   三件都在练指针
   *   涂鸦板                 画着玩
   *   换算器                 纯计算,不测任何东西
   *   坏点 / 刷新率           对着屏幕用眼睛看
   *
   * **全部排在 `TOOLS` 末尾、而且全在 `diagnostic` 之后** —— 这条是硬的:
   * `tests/mini-cards.test.ts` 断言 `[...DIAGNOSTIC_TOOLS, ...FUN_TOOLS]`
   * 正好等于 `READY_TOOLS`,把一件诊断工具排到趣味工具后面那条会红。
   * 段内怎么排随便,跨段不行。
   */
  {
    slug: 'steadiness-test',
    name: '鼠标手稳度定靶挑战',
    navLabel: '手稳度',
    title: '鼠标手稳度测试 - 定靶挑战,测量指针漂移',
    description:
      '把指针停进靶心里保持几秒,测量这段时间指针漂移了多远。它会先等你停手再开始计时,所以量到的确实是"停住之后的漂移"。读数是估算:指针已经被系统的平滑与加速处理过一遍,只适合同一台机器前后对比。',
    confidence: 'estimate',
    group: 'fun',
    ready: true,
  },
  {
    slug: 'reaction-test',
    name: '鼠标反应速度测试',
    navLabel: '反应',
    title: '鼠标反应速度测试 - 在线测量点击反应时间',
    description:
      '在线测量点击反应时间:屏幕变色后立刻按下左键,取多轮有效成绩的中位数。测得的数值包含屏幕刷新、显示器响应与鼠标回报带来的延迟,所以只适合同一台机器上前后对比,不能与其他设备或任何排名比较。',
    confidence: 'estimate',
    group: 'fun',
    ready: true,
  },
  {
    slug: 'aim-test',
    name: '鼠标瞄准测试',
    navLabel: '瞄准',
    title: '鼠标瞄准测试 - 在线统计命中数、命中率与平均偏离',
    description:
      '在线瞄准测试:在 10 / 30 / 60 秒里点击随机出现的目标,统计每秒命中、命中数、命中率与平均偏离(仅计命中)。成绩只保存在本机,只与自己的历史成绩对比。',
    confidence: 'exact',
    group: 'fun',
    ready: true,
  },
  {
    slug: 'doodle-test',
    name: '鼠标涂鸦板',
    navLabel: '涂鸦板',
    title: '鼠标涂鸦板 - 在浏览器里按住左键随手画',
    description:
      '一个在线涂鸦板:按住左键就能画,可以调笔迹粗细、清空重来、把画好的图保存成 PNG。它不出任何读数,也不判断鼠标好坏——就是画着玩的。所有内容都留在浏览器里,不上传。',
    confidence: 'none',
    group: 'fun',
    ready: true,
  },
  {
    slug: 'sensitivity-converter',
    name: '鼠标灵敏度换算器',
    navLabel: '换算器',
    title: '鼠标灵敏度换算器 - eDPI 与 cm/360 在线换算',
    description:
      '输入鼠标 DPI 和游戏内灵敏度,换算成 eDPI 与 cm/360°。eDPI 只在同一款游戏里可比,cm/360° 才是跨游戏的手感。它算的是换算,不是测量——输入的 DPI 是标称值,想要真值请先去 DPI 测试页量一次。',
    confidence: 'estimate',
    group: 'fun',
    ready: true,
  },
  {
    slug: 'dead-pixel-test',
    name: '屏幕坏点检测',
    navLabel: '坏点',
    title: '屏幕坏点检测 - 在线全屏纯色测试',
    description:
      '全屏依次显示红、绿、蓝、白、黑五种纯色,用来找出屏幕上的坏点、亮点与暗斑。需要你自己盯着看,它不出任何读数——检测结果只有你的眼睛能给,页面不会替你下结论。',
    confidence: 'none',
    group: 'fun',
    ready: true,
  },
  {
    slug: 'refresh-visual-test',
    name: '刷新率目视测试',
    navLabel: '刷新率',
    title: '刷新率目视测试 - 看方块移动是否流畅',
    description:
      '一个方块匀速横移,用眼睛判断画面是否流畅、有没有撕裂或一顿一顿的感觉;同时印出浏览器实测的帧节奏。它给的是目视判断加上一个估算值——那个数是浏览器画帧的节奏,不是显示器的物理刷新率。',
    confidence: 'estimate',
    group: 'fun',
    ready: true,
  },
];

/** 已实现的工具,用于生成导航与站内链接。 */
export const READY_TOOLS = TOOLS.filter((tool) => tool.ready);

/** 规划中的工具,只在首页作为列表出现,不生成链接。 */
export const PLANNED_TOOLS = TOOLS.filter((tool) => !tool.ready);

/**
 * 首页第一片网格:诊断工具。
 *
 * 和 {@link FUN_TOOLS} 一起恰好把 `READY_TOOLS` 分完,不重不漏 ——
 * `tests/mini-cards.test.ts` 钉着这条,所以**加了工具忘了填 `group`
 * 不会静默地从首页消失**,而是用例直接红。
 */
export const DIAGNOSTIC_TOOLS = READY_TOOLS.filter((tool) => tool.group === 'diagnostic');

/** 首页「更多工具」那一节:趣味功能。 */
export const FUN_TOOLS = READY_TOOLS.filter((tool) => tool.group === 'fun');

export function findTool(slug: string): Tool | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}

/**
 * 「工具箱」那个入口本身。**不是一个 `Tool`。**
 *
 * 报头分三段:**框住的那一组诊断工具** / **折叠出来的「更多」** / **工具箱**。
 * 工具箱是一扇门,通向 `toolbox.astro` 那张清单,它自己不做任何测量。
 *
 * 为什么不给它编一个 `Tool` 塞进 `TOOLS`:
 *
 * - `Tool.confidence` 是**必填**的。工具箱不测量,四档里没有一档说得通 ——
 *   为了过类型检查给它编一个,正是全站最反对的那件事(给一个看起来精确的
 *   假数字)。(加了 `'none'` 之后这一条不再致命,但下面两条仍然成立。)
 * - 它会是 `group` 的**第三种取值**,掉进 `DIAGNOSTIC_TOOLS` / `FUN_TOOLS`
 *   两个 filter 的缝里 —— `tests/mini-cards.test.ts` 那条"两片恰好分完
 *   `READY_TOOLS`"会红。而"修好"它的两种办法(单独给它开一片首页、或塞进
 *   现有某一片)都会把它**渲染到错的地方**:框里,或首页「更多工具」里。
 * - 它没有页面级的 `title` / `description` 要进注册表 —— 那两样写在
 *   `toolbox.astro` 自己的 frontmatter 里(和 `index.astro` 一样),
 *   因为注册表是**工具**的地方。
 *
 * 代价是丢掉了 `ready` 那条"不许链接到不存在的页面"的保护 ——
 * 由 `tests/nav.test.ts` 的 `existsSync` 那条补回来。
 */
export const TOOLBOX = { slug: 'toolbox', navLabel: '工具箱' } as const;

/**
 * 报头的三个入口,一起导出。
 *
 * 三片分别对应报头上的三段:**带框的那一组**({@link NAV.group})、
 * 「工具箱」那一项本身({@link NAV.toolbox})、以及它下拉里的清单
 * ({@link NAV.dropdown})。
 *
 * 把它们捆成一个对象而不是让模板自己挑三个视图,是为了让
 * **`tests/nav.test.ts` 的输入就是模板的输入** —— 报头结构要是漏了哪一片,
 * 用例和页面会同时红,不会出现"测的是一个集合、渲染的是另一个"。
 *
 * `dropdown` 直接取 `FUN_TOOLS`:下拉里就是全部趣味工具,一项不多一项不少,
 * 而 `ToolNav.astro` 给每一项挂的 `title` 就是全名。清单不在这里再抄一份 ——
 * 抄了迟早对不上(首页 `.more-list` 是同一条理由)。
 */
export const NAV = {
  group: DIAGNOSTIC_TOOLS,
  toolbox: TOOLBOX,
  dropdown: FUN_TOOLS,
} as const;
