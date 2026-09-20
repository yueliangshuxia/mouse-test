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
   * 报头导航里的短名。**只用于那一条横向菜单。**
   *
   * 十二个名字里大部分以「鼠标」开头,而那两个字在一条鼠标测试站的报头里
   * 出现十二次是纯噪声。量过:全名排开 1142px(当时还是十项),比整栏(1060px)
   * 还宽 —— 也就是说用全名的话,报头**在任何宽度下都排不成一行**,永远挂着
   * 一个「更多」下拉,而那个"宽了就全部平铺"的状态根本不会出现。
   *
   * **短名十二项自身合计 649px,含 11 个 16px 间距共占 825px**(轨道带一条
   * `-11px` 的左外边距,所以实际占宽 814px)。实测:视口 **1090px 及以上十二项
   * 全部平铺,1085px 及以下开始折叠**,先折的是末尾的「反应 / 瞄准」——
   * 那正是趣味工具该待的地方,见下面两项的注释。1280px 下报头那栏是 840px,
   * 余量只剩 15px,所以这条**必须按量出来的数看**:换个中文字体就可能翻成折叠态。
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
 * 可信度的四档。
 *
 * 分档依据是**输入是什么**,不是"这个测试好不好":
 * - `exact` —— 浏览器直接给出原始事件流,数出来的就是数出来的
 * - `estimate` —— 要经过一层换算或反推,假设不成立时结果不成立
 * - `shape` —— 只有**波形形状**可信(孤立尖峰、疑似瞬断),它证明不了"丢帧"
 * - `direction` —— 连形状都谈不上,只有**方向**这一位信息不需要任何假设
 */
export type Confidence = 'exact' | 'estimate' | 'shape' | 'direction';

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  exact: '直接测得',
  estimate: '估算',
  shape: '只能看形状',
  direction: '只能看方向',
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
   * 下面两项是**趣味工具**,不是诊断。
   *
   * 排在 `TOOLS` 末尾,所以也排在 `READY_TOOLS` 末尾 —— 而报头的折叠是
   * 「从最后一项往前搬」(见 nav-overflow.ts),于是窗口一窄先被折进
   * 「更多」下拉的正好是它们,十个诊断工具优先留在轨道里。
   */
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
