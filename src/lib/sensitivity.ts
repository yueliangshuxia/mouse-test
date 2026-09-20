/**
 * 鼠标灵敏度换算。**纯函数,不碰 DOM** —— 所以它能进 `tests/`。
 *
 * ## 这一页算的是"换算",不是"测量"
 *
 * 它把两个已知的输入(DPI 与游戏内灵敏度)按各游戏的固定常数推成另外两个数。
 * **它一个数都没有测** —— 输入的 DPI 是你从驱动里读来的标称值,也就是
 * `dpi-test` 那一整页正在说"不可信"的那个东西。所以这一页的口径是
 * `estimate`,而且正文必须把用户指回 DPI 页:要真值,先去那边量。
 *
 * ## 三个量之间的关系
 *
 * ```
 * eDPI      = DPI × 灵敏度
 * cm/360°   = (360 × 2.54) / (DPI × 灵敏度 × yaw)
 * ```
 *
 * `yaw` 是**游戏自己的常数**:灵敏度为 1 时,鼠标每走一个 count(eDPI 里的那个
 * "点"),视角转过多少度。它是游戏引擎里写死的,玩家改不了,也正是"同一个
 * 灵敏度数字在 A 游戏和 B 游戏里手感完全不同"的全部原因。
 *
 * **eDPI 只能在同一款游戏里横向比。** 两款 yaw 不同的游戏,eDPI 相同并不代表
 * 手感相同 —— 真正跨游戏可比的是 cm/360°。这一点页面上必须写出来,否则
 * eDPI 这个数会被当成一个通用的"灵敏度高低"指标,而它不是。
 *
 * ## yaw 的取值来源,以及为什么页面上要把它印出来
 *
 * 下面这几个值是各游戏社区通用的换算常数(见页面 ref-table,逐条列出)。
 * 它们**不是本站量出来的**,游戏改版也可能调整 —— 所以页面把每个 yaw 都印在
 * 表格里:读者能自己核对,而不是只能信一个不透明的结果。**这是本站「测不准
 * 就明说」落到换算类工具上的样子:算不出来的东西不去编,算得出来的把参数摊开。**
 */

/** 一英寸多少厘米。和 `analysis.ts` 的 `CM_PER_INCH` 同值 —— 那边是量出来的,这里是算出来的。 */
const CM_PER_INCH = 2.54;

export interface GamePreset {
  /** 稳定的标识,同时是存储键与 DOM 值的一部分 */
  id: string;
  /** 显示名 */
  label: string;
  /** 灵敏度为 1 时,每个 count 转过的角度 */
  yaw: number;
}

/**
 * 支持的几款游戏。
 *
 * **只收 yaw 取值明确的。** 少收几款只是少一个选项,收错了就是给用户一个
 * 看起来精确的错数字 —— 而那个错误会一路传到他在游戏里的手感上。
 * 想加新游戏,先去核对该游戏的 yaw,并在页面的 ref-table 里补一行。
 */
export const GAMES: readonly GamePreset[] = [
  { id: 'cs2', label: 'CS2 / CS:GO', yaw: 0.022 },
  { id: 'apex', label: 'Apex 英雄', yaw: 0.022 },
  { id: 'valorant', label: '无畏契约', yaw: 0.07 },
  { id: 'overwatch2', label: '守望先锋 2', yaw: 0.0066 },
];

export function findGame(id: string): GamePreset | undefined {
  return GAMES.find((game) => game.id === id);
}

/**
 * eDPI(effective DPI)= DPI × 游戏内灵敏度。
 *
 * **只在同一款游戏里有意义。** 跨游戏比 eDPI 是把两个不同的量当成同一个,
 * 要跨游戏比请用 {@link cmPer360}。
 *
 * 输入不成立时返回 `null`(页面由此显示破折号,而不是 `0` 或 `NaN`)。
 * 判据是 `> 0` 而不是 `>= 0`:灵敏度为 0 的鼠标不转视角,那个极限没有可换算的
 * 意义,给 `NaN` 或 `Infinity` 都不如给"算不出来"。
 */
export function edpi(dpi: number, sens: number): number | null {
  if (!Number.isFinite(dpi) || !Number.isFinite(sens)) return null;
  if (dpi <= 0 || sens <= 0) return null;
  return dpi * sens;
}

/**
 * 转满 360° 鼠标要走的厘米数 —— **跨游戏唯一可比的量**。
 *
 * 它和 DPI、灵敏度、yaw 三者都成反比:任何一个变大,转过同样角度所需的
 * 物理距离就变短。所以它是"手感"本身,而 eDPI 只是它在某一款游戏里的一个投影。
 *
 * 输入不成立时返回 `null`,理由同 {@link edpi}。
 */
export function cmPer360(dpi: number, sens: number, yaw: number): number | null {
  if (!Number.isFinite(dpi) || !Number.isFinite(sens) || !Number.isFinite(yaw)) return null;
  if (dpi <= 0 || sens <= 0 || yaw <= 0) return null;
  return (360 * CM_PER_INCH) / (dpi * sens * yaw);
}
