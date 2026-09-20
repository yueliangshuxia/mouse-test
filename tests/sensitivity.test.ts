import { describe, expect, it } from 'vitest';
import { cmPer360, edpi, findGame, GAMES } from '../src/lib/sensitivity';

/**
 * 灵敏度换算。
 *
 * 这是全站**唯一一件真有计算逻辑的趣味工具**,所以它的数必须钉死 ——
 * 换算类的错误最不容易被发现:结果看上去永远是个合理的数字,只有拿手算
 * 对一遍才知道对不对,而用户不会去对。
 */

describe('sensitivity', () => {
  describe('eDPI', () => {
    it('就是 DPI 乘灵敏度', () => {
      expect(edpi(800, 1)).toBe(800);
      expect(edpi(800, 2.5)).toBe(2000);
      expect(edpi(1600, 0.5)).toBe(800);
    });

    it('和 yaw 无关 —— 所以它只能在同一款游戏里比', () => {
      // 这条不是在测公式,是在钉住 eDPI 的性质:它不经过 yaw,
      // 于是两款 yaw 不同的游戏会给出相同的 eDPI,而手感完全不同。
      // 页面那句"eDPI 只在同一款游戏里有意义"靠的就是这条。
      const viaCs = edpi(800, 1)!;
      const viaValorant = edpi(800, 1)!;
      expect(viaCs).toBe(viaValorant);
      // 而真正跨游戏可比的 cm/360 在两款游戏里差了三倍多
      expect(cmPer360(800, 1, 0.07)! / cmPer360(800, 1, 0.022)!).toBeCloseTo(0.022 / 0.07, 10);
    });

    it('算不出来就给 null,不给 0 也不给 NaN', () => {
      expect(edpi(0, 1)).toBeNull();
      expect(edpi(-800, 1)).toBeNull();
      expect(edpi(800, 0)).toBeNull();
      expect(edpi(800, -1)).toBeNull();
      expect(edpi(NaN, 1)).toBeNull();
      expect(edpi(800, Infinity)).toBeNull();
    });
  });

  describe('cm/360°', () => {
    /*
     * 定值。全部手算:
     *   cm/360 = (360 × 2.54) / (DPI × 灵敏度 × yaw) = 914.4 / (DPI × 灵敏度 × yaw)
     *
     * 拿 CS2 的 yaw = 0.022 算 800 DPI / 灵敏度 1:
     *   914.4 / (800 × 1 × 0.022) = 914.4 / 17.6 = 51.9545…
     * 这正是社区里流传的"800 DPI、灵敏度 1 在 CS 里约 51.9cm 转一圈"。
     * **以后有人"顺手优化"公式,这几条会立刻红。**
     */
    it('定值对得上手算', () => {
      expect(cmPer360(800, 1, 0.022)).toBeCloseTo(51.9545, 3);
      expect(cmPer360(800, 1, 0.07)).toBeCloseTo(16.3286, 3);
      expect(cmPer360(1600, 2, 0.022)).toBeCloseTo(12.9886, 3);
      expect(cmPer360(800, 1, 0.0066)).toBeCloseTo(173.1818, 3);
    });

    it('DPI 翻倍,距离减半', () => {
      expect(cmPer360(1600, 1, 0.022)).toBeCloseTo(cmPer360(800, 1, 0.022)! / 2, 10);
    });

    it('和 DPI / 灵敏度 / yaw 三者都成反比', () => {
      const base = cmPer360(800, 1, 0.022)!;
      expect(cmPer360(800, 2, 0.022)!).toBeLessThan(base);
      expect(cmPer360(1600, 1, 0.022)!).toBeLessThan(base);
      expect(cmPer360(800, 1, 0.07)!).toBeLessThan(base);

      // 反比是严格单调的,不只是"变小了"
      let prev = Infinity;
      for (const dpi of [400, 800, 1200, 1600, 3200]) {
        const cm = cmPer360(dpi, 1, 0.022)!;
        expect(cm).toBeLessThan(prev);
        prev = cm;
      }
    });

    it('算不出来就给 null', () => {
      expect(cmPer360(0, 1, 0.022)).toBeNull();
      expect(cmPer360(800, 0, 0.022)).toBeNull();
      expect(cmPer360(800, 1, 0)).toBeNull();
      expect(cmPer360(800, 1, -0.022)).toBeNull();
      expect(cmPer360(Infinity, 1, 0.022)).toBeNull();
      expect(cmPer360(800, 1, NaN)).toBeNull();
    });
  });

  describe('游戏表', () => {
    it('id 不重复(它是存储键的一部分)', () => {
      const ids = GAMES.map((game) => game.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('每个 yaw 都是正的有限数', () => {
      for (const game of GAMES) {
        expect(Number.isFinite(game.yaw), `${game.id} 的 yaw`).toBe(true);
        expect(game.yaw, `${game.id} 的 yaw`).toBeGreaterThan(0);
      }
    });

    it('找得到、找不到给 undefined', () => {
      expect(findGame('cs2')?.yaw).toBe(0.022);
      expect(findGame('valorant')?.yaw).toBe(0.07);
      expect(findGame('nope')).toBeUndefined();
    });

    it('CS2 与 Apex 同源,yaw 取同一个值', () => {
      // 不是巧合:两者都是 Source 系引擎。钉住是为了防止有人"顺手"把其中一个
      // 改成别的数 —— 那会静默地把两款游戏之间的换算全部算错。
      expect(findGame('cs2')!.yaw).toBe(findGame('apex')!.yaw);
    });
  });
});
