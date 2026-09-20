import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadBest, saveBest } from '../src/lib/ui';

/*
 * 这一组用例守的是 `saveBest` 那个 `lowerIsBetter` 开关。
 *
 * 值得单开一个文件,是因为它的失败模式**两个方向都是静默的**:
 * 该传的没传 → 纪录永远不更新(用户以为"没破纪录",其实是根本写不进去);
 * 不该传的传了 → 每一次都比上一次差,纪录每次都被覆盖,等于没有纪录。
 * 两种都不报错,页面上只是那个数看着不对劲。
 *
 * 这是仓库里第一个 import `ui.ts` 的用例。`tests/` 是纯 node、没有 jsdom,
 * 而 `ui.ts` 只在函数里碰 DOM、`localStorage` 也全包在 try 里,
 * 所以塞一个假的 `localStorage` 就够,不必为此引入 jsdom。
 */

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  } as Storage;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
});

const KEY = 'mouse-test:test-best';

describe('saveBest', () => {
  it('默认是越大越好', () => {
    expect(saveBest(KEY, 5)).toBe(true);
    expect(saveBest(KEY, 4)).toBe(false);
    expect(saveBest(KEY, 5)).toBe(false); // 平局不算刷新
    expect(saveBest(KEY, 6)).toBe(true);
    expect(loadBest(KEY)).toBe(6);
  });

  it('lowerIsBetter 时越小越好', () => {
    expect(saveBest(KEY, 250, { lowerIsBetter: true })).toBe(true);
    expect(saveBest(KEY, 260, { lowerIsBetter: true })).toBe(false);
    expect(saveBest(KEY, 250, { lowerIsBetter: true })).toBe(false); // 平局不算刷新
    expect(saveBest(KEY, 240, { lowerIsBetter: true })).toBe(true);
    expect(loadBest(KEY)).toBe(240);
  });

  it('两个方向在平局上都不覆盖已有的值', () => {
    saveBest(KEY, 100);
    expect(saveBest(KEY, 100)).toBe(false);
    expect(loadBest(KEY)).toBe(100);

    saveBest(KEY, 100, { lowerIsBetter: true });
    expect(saveBest(KEY, 100, { lowerIsBetter: true })).toBe(false);
    expect(loadBest(KEY)).toBe(100);
  });

  it('非有限值一律不写,哪怕是第一次', () => {
    // 否则纪录会被写成 "NaN",而 loadBest 读回来是 null —— 页面上看起来像
    // "从来没有成绩",实际上存储里躺着一个坏值
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      vi.stubGlobal('localStorage', fakeStorage());
      expect(saveBest(KEY, bad)).toBe(false);
      expect(saveBest(KEY, bad, { lowerIsBetter: true })).toBe(false);
      expect(loadBest(KEY)).toBeNull();
    }
  });

  it('存不下时不抛异常,只是没刷新纪录', () => {
    // 隐私模式下 localStorage 一碰就抛
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    } as unknown as Storage);

    expect(() => saveBest(KEY, 5)).not.toThrow();
    expect(loadBest(KEY)).toBeNull();
  });
});

describe('loadBest', () => {
  it('读不出东西时给 null,不是 0', () => {
    // "没测过"和"测出来是 0"是两件事
    expect(loadBest('mouse-test:never-written')).toBeNull();
    localStorage.setItem('mouse-test:garbage', 'abc');
    expect(loadBest('mouse-test:garbage')).toBeNull();
  });
});
