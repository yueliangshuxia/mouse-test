/**
 * 中文文案目录。**它同时是这份目录的"形状定义"** ——
 * `en.ts` 声明成 `: Catalog`,所以英文版漏任何一个键都是 `npm run typecheck` 红,
 * 而不是英文页面上静默少一句话。
 *
 * ## 目录和 `tools.ts` 的分工(这一版的分工,以后会变)
 *
 * - **`tools.ts` 管结构**:`slug` / `group` / `confidence` / `ready`,以及
 *   每一页自己的 `title` / `description`。那些与语言无关,或者只属于那一页。
 * - **这里管"出现在多个页面上的文字"**:导航短名、页面全名、可信度分档、
 *   页脚、悬浮条、报头。
 *
 * **中文的 `name` / `navLabel` 因此暂时出现在两处** —— 这一版没有把它们从
 * `tools.ts` 里摘掉,因为 `Tool.name` 还被 21 个页面的 JSON-LD 用着,摘掉要
 * 一次性改 21 个文件。代价是两份中文可能漂,所以 `tests/i18n.test.ts` 里有一条
 * **对账用例**逐条比 `zh.tools[slug]` 和 `TOOLS` 里那两份 —— 漂了会红。
 * 逐页翻译推进时这两份会自然合并成一份。
 */

import { buttonZh } from './pages/button';
import { cpsZh } from './pages/cps';
import { dpiZh } from './pages/dpi';
import { holdDragZh } from './pages/holdDrag';
import { scrollZh } from './pages/scroll';
import { doubleClickZh } from './pages/doubleClick';
import { pollingZh } from './pages/polling';
import { homeZh } from './pages/home';
import { deadPixelZh } from './pages/deadPixel';
import { doodleZh } from './pages/doodle';
import { sensitivityZh } from './pages/sensitivity';
import { accelerationZh } from './pages/acceleration';
import { keyboardZh } from './pages/keyboard';
import { reactionZh } from './pages/reaction';
import { aimZh } from './pages/aim';
import { steadinessZh } from './pages/steadiness';
import { trailZh } from './pages/trail';
import { refreshZh } from './pages/refresh';
import { toolboxZh } from './pages/toolbox';

export const zh = {
  /** 报头、开关、全站通用的那几个词 */
  common: {
    brand: '鼠标测试',
    navAria: '工具导航',
    more: '更多',
    themeGroupAria: '外观主题',
    /** 主题开关压成一枚图标之后的 aria —— 说的是"按下去会变成什么" */
    themeToLight: '切到浅色',
    themeToDark: '切到深色',
    langGroupAria: '语言',
    /** 另一种语言还没有这一页时,那个开关上挂的说明 */
    langMissing: '这一页还没有英文版',
  },

  /** 可信度的五档。`none` 那一档是「不测量」,不是"测得差" */
  confidence: {
    exact: '直接测得',
    estimate: '估算',
    shape: '只能看形状',
    direction: '只能看方向',
    none: '不测量',
  },

  /**
   * 每件工具的**全名**和**报头短名**。
   *
   * `navLabel` 是报头那一排用的短名 —— 报头那笔宽度账就是按它量出来的
   * (`tools.ts` 末尾那段),**改一个字都要重量折叠边界**。
   */
  tools: {
    'button-test': { name: '鼠标按键 / 滚轮 / 长按 / 双击测试', navLabel: '按键' },
    'hold-drag-test': { name: '鼠标长按拖拽测试', navLabel: '长按拖拽' },
    'double-click-test': { name: '鼠标双击测试', navLabel: '双击' },
    'scroll-test': { name: '鼠标滚轮测试', navLabel: '滚轮' },
    'cps-test': { name: '鼠标 CPS 点击速度测试', navLabel: 'CPS' },
    'trail-test': { name: '鼠标轨迹测试', navLabel: '轨迹' },
    'polling-rate-test': { name: '鼠标回报率测试', navLabel: '回报率' },
    'dpi-test': { name: '鼠标 DPI 测试', navLabel: 'DPI' },
    'acceleration-test': { name: '鼠标加速度测试', navLabel: '加速度' },
    'keyboard-test': { name: '键盘按键测试', navLabel: '键盘' },
    'steadiness-test': { name: '鼠标手稳度定靶挑战', navLabel: '手稳度' },
    'reaction-test': { name: '鼠标反应速度测试', navLabel: '反应' },
    'aim-test': { name: '鼠标瞄准测试', navLabel: '瞄准' },
    'doodle-test': { name: '鼠标涂鸦板', navLabel: '涂鸦板' },
    'sensitivity-converter': { name: '鼠标灵敏度换算器', navLabel: '换算器' },
    'dead-pixel-test': { name: '屏幕坏点检测', navLabel: '坏点' },
    'refresh-visual-test': { name: '刷新率目视测试', navLabel: '刷新率' },
    toolbox: { name: '鼠标趣味工具箱', navLabel: '工具箱' },
    'mouse-repair': { name: '鼠标维修', navLabel: '鼠标维修' },
  },

  /**
   * 五个鼠标按键的名字与副标题。
   *
   * **它不在页面目录里,因为两个页面共用**:`/button-test/`(五块按键牌 + chip)
   * 和 `/hold-drag-test/`(逐键明细表 + 日志)。放进其中一页的命名空间,另一页
   * 就得再写一份,而"同一个键在两页上叫两个名字"是没人会发现的。
   *
   * 键是**按键编号**(`MouseEvent.button` 那套,0–4),和 `mouse-buttons.ts` 的
   * `BUTTONS` 对齐 —— 那个模块仍然留着同样一份中文,由 `tests/i18n.test.ts`
   * 的对账用例钉着(同 `tools.ts` 的 `name` / `navLabel`,理由一样:摘掉它要
   * 一次性改两个页面的脚本)。
   */
  buttons: {
    '0': { name: '左键', note: '主键' },
    '1': { name: '中键', note: '滚轮按下' },
    '2': { name: '右键', note: '副键' },
    '3': { name: '侧键 4', note: '后退' },
    '4': { name: '侧键 5', note: '前进' },
    /** 表里没有的编号。**留着而不是给空串** —— 一个空白的按键牌会被读成"这键没做好" */
    unknown: { name: '按键 {code}', note: '' },
  },

  /** 页脚与底部悬浮条 */
  /**
   * 回报率页那几条"这次测得准不准"的提示。
   *
   * **它们原来是以成品中文句子的形式住在 `analysis.ts` 里的**,而那是全站的
   * 纯统计模块 —— 让判据层产出排版好的文案,本身就是把呈现混进了判据。
   * 现在那边只给**代码 + 已经格式化好的数值**,句子在这里。
   *
   * 数值为什么在那边就格式化好:小数位数是**统计上的决定**(比例留 0 位、
   * 倒序比例留 1 位),不是文案风格,所以它该跟着数字走。
   */
  quality: {
    'duplicate-poor':
      '超过一半的报文落进同一个时间戳({ratio}%),说明当前计时精度分辨不出这只鼠标的周期,读数只能当作下限。',
    'duplicate-fair': '{ratio}% 的报文与相邻报文共用时间戳,计时精度已经接近极限。',
    'out-of-order-poor': '{ratio}% 的采样时间戳是倒着走的,数据不可信。',
    'out-of-order-fair': '有 {count} 条采样的时间戳倒序,通常来自驱动或系统调度。',
    'duration-poor': '有效时长只有 {ms}ms,太短,统计量不可靠。',
    'duration-fair': '有效时长 {seconds} 秒,建议连续画圈 3 秒以上再读数。',
  },

  chrome: {
    /**
     * 页脚那句隐私承诺。
     *
     * **2026-10-15 加了一个"测试"字**,因为那一天起页面会往服务器报一个浏览计数
     * (见 `components/ViewPing.astro`)。原句「数据不会上传」在宽松读法下仍然成立,
     * 但**它现在可以被合理地读错** —— 而这一句是全站最要紧的一句,不该留下歧义。
     *
     * 加一个字之后它是精确的:**测试数据**一个字都不上传,计数只记"哪一页、哪一天、
     * 几次"。工具箱页的 FAQ 里有一段专门回答"那后台那个访问量是怎么来的"。
     */
    footerPrivacy: '所有测试均在浏览器本地完成,测试数据不会上传到服务器。',
    footerRecommend: '建议使用桌面版 Chrome 或 Edge 以获得最准确的测量结果。',
    /** 维修链接那一行。**立场和链接写在同一行**是刻意的,见 CLAUDE.md */
    footerRepair: '—— 本站的测试工具与这项维修服务出自同一人。',
    /**
     * 页脚那行后台入口。**它放在页脚而不是报头**,理由是报头那笔宽度账容不下
     * 第四段(见 CLAUDE.md「报头」)。
     *
     * 后台只有中文,所以英文页上这个词指向的是**中文登录页** —— 和维修链接同一
     * 种处境。英文访客本来也不需要它,但「别凭空少一个入口」比「别出现中文」
     * 重要,所以两边都渲染。
     */
    footerLogin: '管理员登录',
    dockTitle: '鼠标维修',
    dockWechat: '微信',
    dockTaobao: '淘宝',
    dockQrPlaceholder: '二维码位',
    dockNote: '鼠标不好用了?联系我们看看。',
  },

  /**
   * 逐页的文案。**一页一份文件**(`pages/<slug>.ts`),理由写在 `pages/cps.ts` 的
   * 文件头:全站约 2000 条字符串,塞进同一个文件的话,两个人同时动一页就会撞。
   */
  pages: {
    cps: cpsZh,
    home: homeZh,
    button: buttonZh,
    dpi: dpiZh,
    polling: pollingZh,
    holdDrag: holdDragZh,
    scroll: scrollZh,
    doubleClick: doubleClickZh,
    doodle: doodleZh,
    deadPixel: deadPixelZh,
    sensitivity: sensitivityZh,
    acceleration: accelerationZh,
    keyboard: keyboardZh,
    reaction: reactionZh,
    aim: aimZh,
    steadiness: steadinessZh,
    trail: trailZh,
    refresh: refreshZh,
    toolbox: toolboxZh,
  },
};

/** 这份目录的形状。`en.ts` 用它钉住"两边键必须一样"。 */
export type Catalog = typeof zh;
