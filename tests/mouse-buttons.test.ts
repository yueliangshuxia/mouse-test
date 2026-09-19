import { describe, expect, it } from 'vitest';
import {
  BIT_FOR_CODE,
  BUTTON_CODES,
  BUTTON_COUNT,
  BUTTONS,
  buttonName,
  eachButtonEdge,
  maskFromButtons,
} from '../src/lib/mouse-buttons';

/*
 * 这一组用例守的是**两个编号体系之间的那道翻译**。
 *
 * `MouseEvent.button`(0 左 / 1 中 / 2 右 / 3 侧键4 / 4 侧键5)和
 * `MouseEvent.buttons` 的位序**不一样**,而中键和右键是反的 —— 这是全站最容易
 * 悄悄写错、而且错了以后"看起来还挺合理"的一处:
 * 中键和右键互换之后,测试照样跑、数字照样出,只是**中键的数字记在右键名下**。
 * 页面上没有任何东西会露馅,所以只能靠这里钉住。
 */

/** 从一个原始 `buttons` 值建出掩码,省得每处都写位移 */
const raw = (...bits: number[]) => bits.reduce((acc, bit) => acc | (1 << bit), 0);

describe('mouse-buttons', () => {
  it('五个键齐全,编号升序,个数从表派生', () => {
    expect(BUTTON_CODES).toEqual([0, 1, 2, 3, 4]);
    expect(BUTTON_COUNT).toBe(BUTTONS.length);
    expect(BUTTON_COUNT).toBe(5);
  });

  it('每个键的编号和位序对得上(逐位自证,不抄表)', () => {
    for (const code of BUTTON_CODES) {
      expect(maskFromButtons(1 << BIT_FOR_CODE[code])).toBe(1 << code);
    }
  });

  it('中键和右键的位是反的', () => {
    // 原始 buttons 的位序是 0 左 / 1 右 / 2 中,而本站编号是 0 左 / 1 中 / 2 右
    expect(maskFromButtons(raw(0))).toBe(0b00001); // 原始第 0 位(左键)→ 编号 0
    expect(maskFromButtons(raw(2))).toBe(0b00010); // 原始第 2 位(中键)→ 编号 1
    expect(maskFromButtons(raw(1))).toBe(0b00100); // 原始第 1 位(右键)→ 编号 2
  });

  it('两个侧键的位', () => {
    expect(maskFromButtons(raw(3))).toBe(0b01000); // 后退 → 第 3 位
    expect(maskFromButtons(raw(4))).toBe(0b10000); // 前进 → 第 4 位
  });

  it('组合掩码:几个键同时按下就是几位同时置上', () => {
    expect(maskFromButtons(raw(0, 1, 2, 3, 4))).toBe(0b11111);
    expect(maskFromButtons(raw(0, 1))).toBe(0b00101); // 原始 0 位 + 1 位 = 左 + 右 → 编号 0 + 2
  });

  it('认不出的位在翻译这一步就被丢掉', () => {
    // 有些设备把滚轮左右倾报成高位按钮。它们进不了本站在意的掩码,
    // 也就**不会**在分析层变成一个没有名字的幽灵按键。
    expect(maskFromButtons(raw(7))).toBe(0);
    expect(maskFromButtons(raw(0, 7))).toBe(0b00001);
  });

  it('buttonName:认得的给名字,认不得的给一个不会误导的兜底', () => {
    expect(buttonName(0)).toBe('左键');
    expect(buttonName(2)).toBe('右键');
    expect(buttonName(4)).toBe('侧键 5');
    expect(buttonName(9)).toBe('按键 9');
  });
});

describe('eachButtonEdge', () => {
  it('报出按下的那一位', () => {
    const seen: Array<[number, boolean]> = [];
    eachButtonEdge(0b001, 0b101, (code, isDown) => seen.push([code, isDown]));

    expect(seen).toEqual([[2, true]]);
  });

  it('报出松开的那一位', () => {
    const seen: Array<[number, boolean]> = [];
    eachButtonEdge(0b101, 0b001, (code, isDown) => seen.push([code, isDown]));

    expect(seen).toEqual([[2, false]]);
  });

  it('一次调用可以同时报出好几个边沿,按编号升序', () => {
    // 左键和中键松开、右键按下 —— 松开最后一个键的那一刻就是这样
    const seen: Array<[number, boolean]> = [];
    eachButtonEdge(0b011, 0b100, (code, isDown) => seen.push([code, isDown]));

    expect(seen).toEqual([
      [0, false],
      [1, false],
      [2, true],
    ]);
  });

  it('掩码没变时一个回调都不调', () => {
    /*
     * 这不是优化而是**必需**:它会挂在 pointermove 上,1000Hz 的鼠标每秒要调
     * 上千次,而回调里有 DOM 写入 —— 那笔开销会被如实测成丢帧。
     */
    let calls = 0;
    eachButtonEdge(0b101, 0b101, () => calls++);

    expect(calls).toBe(0);
  });

  it('认不出的位不会冒出幽灵边沿', () => {
    // 循环只走本站的五个编号。第 7 位既不会被报出来,也不受它影响。
    const seen: Array<[number, boolean]> = [];
    eachButtonEdge(0, 1 << 7, (code, isDown) => seen.push([code, isDown]));
    eachButtonEdge(0b001 | (1 << 7), 0b001, (code, isDown) => seen.push([code, isDown]));

    expect(seen).toEqual([]);
  });
});
