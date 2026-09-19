/**
 * 鼠标按键的目录与位掩码换算 —— 全站唯一的事实来源。
 *
 * 按键页(`button-test.astro`)和拖拽页(`hold-drag-test.astro`)都要这张表,
 * 而**两边的世界不一样**:页面 frontmatter 里能写表、`<script>` 里读不到
 * (脚本被单独打包成外链 module)。这正是 `keyboard-layout.ts` / `theme.ts` /
 * `url.ts` 存在的理由 —— 一个值要在"能 import 的世界"和"不能 import 的世界"
 * 两边一致,就抽模块,别手抄。
 *
 * 抽出来顺手消掉了一个已经存在的手抄隐患:按键页原先在 `<script>` 里
 * 手写 `BUTTON_COUNT = 5`,和 frontmatter 的 `BUTTONS` 靠人肉同步。
 * 现在 `BUTTON_COUNT` 由 `BUTTONS.length` 派生,加一个键不会再漏。
 *
 * 本模块**只有纯数据与纯函数**,不碰 DOM —— 所以它能在 node 环境里直接单测。
 * 状态机(谁按着、按了多久)刻意**不**抽出来:按键页数点击次数,拖拽页要切段落,
 * 两边用法不同,硬抽会把两边都拧巴。共享表,不共享状态机。
 */

/** 一个鼠标按键:本站编号 + 显示名 + 副标题。 */
export interface MouseButton {
  /**
   * 本站编号。**它同时就是 `MouseEvent.button` 的值**
   * (0 左 / 1 中 / 2 右 / 3 侧键4 / 4 侧键5),所以按下事件可以直接用。
   * 但它**不是** `MouseEvent.buttons` 里的位序,见 `BIT_FOR_CODE`。
   */
  code: number;
  /** 显示名,表格和日志里用 */
  name: string;
  /** 副标题,只在按键页的卡片上显示 */
  note: string;
}

export const BUTTONS: MouseButton[] = [
  { code: 0, name: '左键', note: '主键' },
  { code: 1, name: '中键', note: '滚轮按下' },
  { code: 2, name: '右键', note: '副键' },
  { code: 3, name: '侧键 4', note: '后退' },
  { code: 4, name: '侧键 5', note: '前进' },
];

/** 按键个数。**从表派生**,不要再手写一个数字。 */
export const BUTTON_COUNT = BUTTONS.length;

/** 全部本站编号,升序。 */
export const BUTTON_CODES: number[] = BUTTONS.map((button) => button.code);

/**
 * 本站编号 → `MouseEvent.buttons` 里的**位序**。
 *
 * 两个编号体系**不一样**,而坑在**中键和右键是反的**:
 *
 * | 本站编号 / `event.button` | 含义 | `event.buttons` 的位 |
 * | --- | --- | --- |
 * | 0 | 左键 | 第 0 位(`1`) |
 * | 1 | 中键 | **第 2 位**(`4`) |
 * | 2 | 右键 | **第 1 位**(`2`) |
 * | 3 | 侧键 4 | 第 3 位(`8`) |
 * | 4 | 侧键 5 | 第 4 位(`16`) |
 *
 * 所以 `buttons` 的值永远不能直接当编号用。也**别**依赖这张表恰好是自逆的
 * (`[0,2,1,3,4]` 是个 1↔2 的对换)—— 那是巧合,不是保证。
 *
 * 注意:侧键的编号 3 / 4 和 `side-buttons.ts` 的 `SIDE_BUTTON_BACK` /
 * `SIDE_BUTTON_FORWARD` **数值相同但概念不同** —— 那边是"要拦掉的浏览器默认
 * 动作",这边是"要测量的按键"。别把两者合成一个常量。
 */
export const BIT_FOR_CODE = [0, 2, 1, 3, 4];

/**
 * 把原始的 `event.buttons` 翻译成本站的位掩码(第 `code` 位表示编号为
 * `code` 的键被按住)。
 *
 * 组合按键只能这么做:`pointerdown` 只在"从无键到有键"时派发一次,
 * `pointerup` 只在**最后一个键**松开时派发,中间那几次按下/松开全都走
 * `pointermove`。所以按键状态只能从这个位掩码逐位 diff 出来(见 `eachButtonEdge`),
 * 用 `event.button` 会漏掉组合键的第二次按下和第一次松开。
 */
export function maskFromButtons(buttons: number): number {
  let mask = 0;
  for (let code = 0; code < BUTTON_COUNT; code++) {
    if (buttons & (1 << BIT_FOR_CODE[code])) mask |= 1 << code;
  }
  return mask;
}

/** 编号 → 显示名。认不出的编号给一个不会误导的兜底文案。 */
export function buttonName(code: number): string {
  return BUTTONS.find((button) => button.code === code)?.name ?? `按键 ${code}`;
}

/**
 * 比对前后两个位掩码,逐位报出**变化**的方向。
 *
 * 这是按键状态唯一的推进入口:一次调用可能同时报出好几个边沿
 * (比如 `0b011 → 0b100` = 左键和中键松开、右键按下)。
 *
 * 两个掩码相同时直接返回,不调回调 —— 这个早退不是优化而是**必需**:
 * 它会被挂在 `pointermove` 上,1000Hz 的鼠标每秒要调上千次,而回调里
 * 带 DOM 写入。按键页的 `syncButtons` 保持了自己的同名早退,那是同一份保护。
 *
 * 认不出的位(比如第 7 位,某些设备会把滚轮左右倾报成额外的键)**不会**
 * 被报出来 —— 循环只走 `BUTTON_COUNT` 位,所以不会凭空冒出一个幽灵按键。
 */
export function eachButtonEdge(
  prevMask: number,
  nextMask: number,
  fn: (code: number, down: boolean) => void,
): void {
  if (prevMask === nextMask) return;

  for (let code = 0; code < BUTTON_COUNT; code++) {
    const bit = 1 << code;
    const wasDown = (prevMask & bit) !== 0;
    const isDown = (nextMask & bit) !== 0;
    if (wasDown === isDown) continue;
    fn(code, isDown);
  }
}
