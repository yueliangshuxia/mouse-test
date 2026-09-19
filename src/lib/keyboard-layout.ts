/**
 * 键盘布局数据。
 *
 * 单独成一个模块,是因为页面的 frontmatter(负责把键帽画出来)和 `<script>`
 * (负责把 `KeyboardEvent.code` 翻译成键帽上的字,写进按键日志)都要用它。
 * 各写一份的话,加了键却忘了同步,日志里就会冒出裸的 `NumpadAdd`。
 *
 * 定位一律用 `KeyboardEvent.code`(物理键位)而不是 `key`。原因是 `key` 会随
 * 输入法和修饰键变——按住 Shift 时 `KeyA` 的 `key` 是 "A" 而不是 "a",
 * 中文输入法下更是一团乱。`code` 说的是"你按的是键盘上哪一个物理键",
 * 这正是键盘测试要问的问题。
 *
 * 宽度用"份数":标准字母键是 1 份,一行合计 15 份。这是示意图,
 * 不追求和实物像素级对齐。
 */

export interface KeyDef {
  /** `KeyboardEvent.code` */
  code: string;
  /** 键帽上印的字 */
  label: string;
  /** 宽度份数,1 = 标准字母键 */
  width?: number;
}

/** 纯占位,用来把键推到正确的位置上。它不代表任何按键。 */
export interface Gap {
  gap: true;
  width: number;
}

export type KeyRow = (KeyDef | Gap)[];

export function isGap(item: KeyDef | Gap): item is Gap {
  return (item as Gap).gap === true;
}

const gap = (width: number): Gap => ({ gap: true, width });

/** 主键区。每行合计 15 份。 */
export const MAIN_ROWS: KeyRow[] = [
  [
    { code: 'Escape', label: 'Esc' },
    gap(1),
    { code: 'F1', label: 'F1' },
    { code: 'F2', label: 'F2' },
    { code: 'F3', label: 'F3' },
    { code: 'F4', label: 'F4' },
    gap(0.5),
    { code: 'F5', label: 'F5' },
    { code: 'F6', label: 'F6' },
    { code: 'F7', label: 'F7' },
    { code: 'F8', label: 'F8' },
    gap(0.5),
    { code: 'F9', label: 'F9' },
    { code: 'F10', label: 'F10' },
    { code: 'F11', label: 'F11' },
    { code: 'F12', label: 'F12' },
    gap(1),
  ],
  [
    { code: 'Backquote', label: '`' },
    { code: 'Digit1', label: '1' },
    { code: 'Digit2', label: '2' },
    { code: 'Digit3', label: '3' },
    { code: 'Digit4', label: '4' },
    { code: 'Digit5', label: '5' },
    { code: 'Digit6', label: '6' },
    { code: 'Digit7', label: '7' },
    { code: 'Digit8', label: '8' },
    { code: 'Digit9', label: '9' },
    { code: 'Digit0', label: '0' },
    { code: 'Minus', label: '-' },
    { code: 'Equal', label: '=' },
    { code: 'Backspace', label: 'Backspace', width: 2 },
  ],
  [
    { code: 'Tab', label: 'Tab', width: 1.5 },
    { code: 'KeyQ', label: 'Q' },
    { code: 'KeyW', label: 'W' },
    { code: 'KeyE', label: 'E' },
    { code: 'KeyR', label: 'R' },
    { code: 'KeyT', label: 'T' },
    { code: 'KeyY', label: 'Y' },
    { code: 'KeyU', label: 'U' },
    { code: 'KeyI', label: 'I' },
    { code: 'KeyO', label: 'O' },
    { code: 'KeyP', label: 'P' },
    { code: 'BracketLeft', label: '[' },
    { code: 'BracketRight', label: ']' },
    { code: 'Backslash', label: '\\', width: 1.5 },
  ],
  [
    { code: 'CapsLock', label: 'Caps', width: 1.75 },
    { code: 'KeyA', label: 'A' },
    { code: 'KeyS', label: 'S' },
    { code: 'KeyD', label: 'D' },
    { code: 'KeyF', label: 'F' },
    { code: 'KeyG', label: 'G' },
    { code: 'KeyH', label: 'H' },
    { code: 'KeyJ', label: 'J' },
    { code: 'KeyK', label: 'K' },
    { code: 'KeyL', label: 'L' },
    { code: 'Semicolon', label: ';' },
    { code: 'Quote', label: "'" },
    { code: 'Enter', label: 'Enter', width: 2.25 },
  ],
  [
    { code: 'ShiftLeft', label: 'Shift', width: 2.25 },
    { code: 'KeyZ', label: 'Z' },
    { code: 'KeyX', label: 'X' },
    { code: 'KeyC', label: 'C' },
    { code: 'KeyV', label: 'V' },
    { code: 'KeyB', label: 'B' },
    { code: 'KeyN', label: 'N' },
    { code: 'KeyM', label: 'M' },
    { code: 'Comma', label: ',' },
    { code: 'Period', label: '.' },
    { code: 'Slash', label: '/' },
    { code: 'ShiftRight', label: 'Shift', width: 2.75 },
  ],
  [
    { code: 'ControlLeft', label: 'Ctrl', width: 1.25 },
    { code: 'MetaLeft', label: 'Win', width: 1.25 },
    { code: 'AltLeft', label: 'Alt', width: 1.25 },
    { code: 'Space', label: 'Space', width: 6.25 },
    { code: 'AltRight', label: 'Alt', width: 1.25 },
    { code: 'MetaRight', label: 'Win', width: 1.25 },
    { code: 'ContextMenu', label: 'Menu', width: 1.25 },
    { code: 'ControlRight', label: 'Ctrl', width: 1.25 },
  ],
];

/** 编辑键区。3 列。 */
export const NAV_ROWS: KeyRow[] = [
  [
    { code: 'PrintScreen', label: 'PrtSc' },
    { code: 'ScrollLock', label: 'ScrLk' },
    { code: 'Pause', label: 'Pause' },
  ],
  [
    { code: 'Insert', label: 'Ins' },
    { code: 'Home', label: 'Home' },
    { code: 'PageUp', label: 'PgUp' },
  ],
  [
    { code: 'Delete', label: 'Del' },
    { code: 'End', label: 'End' },
    { code: 'PageDown', label: 'PgDn' },
  ],
  [gap(3)],
  [gap(1), { code: 'ArrowUp', label: '↑' }, gap(1)],
  [
    { code: 'ArrowLeft', label: '←' },
    { code: 'ArrowDown', label: '↓' },
    { code: 'ArrowRight', label: '→' },
  ],
];

/** 小键盘上的键,需要跨行跨列的用 `colSpan` / `rowSpan` 说明。 */
export interface NumpadKey extends KeyDef {
  colSpan?: number;
  rowSpan?: number;
}

/** 数字键区,4 列网格。 */
export const NUMPAD: NumpadKey[] = [
  { code: 'NumLock', label: 'Num' },
  { code: 'NumpadDivide', label: '/' },
  { code: 'NumpadMultiply', label: '*' },
  { code: 'NumpadSubtract', label: '-' },

  { code: 'Numpad7', label: '7' },
  { code: 'Numpad8', label: '8' },
  { code: 'Numpad9', label: '9' },
  // 加号是竖着占两格的高键
  { code: 'NumpadAdd', label: '+', rowSpan: 2 },

  { code: 'Numpad4', label: '4' },
  { code: 'Numpad5', label: '5' },
  { code: 'Numpad6', label: '6' },

  { code: 'Numpad1', label: '1' },
  { code: 'Numpad2', label: '2' },
  { code: 'Numpad3', label: '3' },
  { code: 'NumpadEnter', label: 'Enter', rowSpan: 2 },

  { code: 'Numpad0', label: '0', colSpan: 2 },
  { code: 'NumpadDecimal', label: '.' },
];

/** 布局里出现过的全部按键,展平成一维。 */
export const ALL_KEYS: KeyDef[] = [
  ...MAIN_ROWS.flat().filter((item): item is KeyDef => !isGap(item)),
  ...NAV_ROWS.flat().filter((item): item is KeyDef => !isGap(item)),
  ...NUMPAD,
];

const LABELS = new Map<string, string>(ALL_KEYS.map((key) => [key.code, key.label]));

/** 把 `code` 翻成键帽上的字。没收录的键原样返回 `code`。 */
export function keyLabel(code: string): string {
  return LABELS.get(code) ?? code;
}
