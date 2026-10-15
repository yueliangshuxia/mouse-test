import { describe, expect, it } from 'vitest';
import { AD_SLOTS, AD_SLOT_KEYS, isAdSlot, pickAd, type AdRecord } from '../src/lib/ads';

function ad(overrides: Partial<AdRecord> & { id: number }): AdRecord {
  return {
    slot: 'home',
    title: `广告 ${overrides.id}`,
    body: '说明',
    url: 'https://example.com/',
    weight: 1,
    active: true,
    ...overrides,
  };
}

describe('槽位', () => {
  it('只有首页与工具箱两个槽位,而且它们的键不含中文', () => {
    expect(Object.keys(AD_SLOTS)).toEqual(['home', 'toolbox']);
    for (const key of Object.keys(AD_SLOTS)) {
      expect(key).toMatch(/^[a-z]+$/);
    }
  });

  it('AD_SLOT_KEYS 和 AD_SLOTS 的键一一对应且顺序稳定', () => {
    expect(AD_SLOT_KEYS).toEqual(Object.keys(AD_SLOTS));
    // 同一份输入两次调用给出同一份顺序 —— 后台表单和看板都靠它排
    expect(AD_SLOT_KEYS).toEqual(AD_SLOT_KEYS);
  });

  it('isAdSlot 只认这两个键', () => {
    expect(isAdSlot('home')).toBe(true);
    expect(isAdSlot('toolbox')).toBe(true);
    expect(isAdSlot('sidebar')).toBe(false);
    expect(isAdSlot('')).toBe(false);
    expect(isAdSlot(undefined)).toBe(false);
    expect(isAdSlot(null)).toBe(false);
    expect(isAdSlot(0)).toBe(false);
    // 继承链上的键不算 —— `hasOwnProperty` 而不是 `in`
    expect(isAdSlot('toString')).toBe(false);
    expect(isAdSlot('constructor')).toBe(false);
  });
});

describe('按权重挑广告', () => {
  it('池子是空的时候返回 null', () => {
    expect(pickAd([])).toBeNull();
    expect(pickAd([], () => 0)).toBeNull();
  });

  it('停用的不参与', () => {
    const only = ad({ id: 1, active: false });
    expect(pickAd([only], () => 0)).toBeNull();
  });

  it('权重 0 的不参与 —— 它既不该被选中,也不该让分母变大', () => {
    const zero = ad({ id: 1, weight: 0 });
    const real = ad({ id: 2, weight: 5 });
    // rng 给 0.999,如果 0 权重那条还算在池子里,它就会占掉一段票
    expect(pickAd([zero, real], () => 0.999)?.id).toBe(2);
    expect(pickAd([zero], () => 0)).toBeNull();
  });

  it('只有一条时,无论 rng 给什么都是它', () => {
    const only = ad({ id: 7 });
    for (const r of [0, 0.5, 0.999999]) {
      expect(pickAd([only], () => r)?.id).toBe(7);
    }
  });

  it('权重决定各段票的宽窄 —— 逐段钉住边界', () => {
    // 权重 1 : 3,总票 4。rng=0 落在第一段,rng=0.5 落在第二段
    const ads = [ad({ id: 1, weight: 1 }), ad({ id: 3, weight: 3 })];

    expect(pickAd(ads, () => 0)?.id).toBe(1);
    expect(pickAd(ads, () => 0.249)?.id).toBe(1); // 1/4 = 0.25,还差一点
    expect(pickAd(ads, () => 0.251)?.id).toBe(3);
    expect(pickAd(ads, () => 0.999)?.id).toBe(3);
  });

  it('刚好落在分界上归给前一段(判据是 `< 0` 不是 `<= 0`)', () => {
    const ads = [ad({ id: 1, weight: 1 }), ad({ id: 2, weight: 1 })];
    // 0.5 × 总票 2 = 1 → 减掉第一条的 1 之后正好是 0,不该被第一条吃掉
    expect(pickAd(ads, () => 0.5)?.id).toBe(2);
  });

  it('rng 极端到返回 1 也不会越界返回 undefined', () => {
    const ads = [ad({ id: 1, weight: 1 }), ad({ id: 2, weight: 1 })];
    // Math.random() 取不到 1,但 rng 是我们注入的 —— 边界要挡
    expect(pickAd(ads, () => 1)?.id).toBe(2);
  });

  it('权重是分数级别时不炸(表里不该有,但老数据挡不住)', () => {
    const ads = [ad({ id: 1, weight: 0.1 }), ad({ id: 2, weight: 0.2 })];
    expect(pickAd(ads, () => 0)?.id).toBe(1);
    expect(pickAd(ads, () => 0.9)?.id).toBe(2);
  });

  it('遍历整条 rng 曲线,只挑出池子里那几条', () => {
    const ads = [ad({ id: 1 }), ad({ id: 2, active: false }), ad({ id: 3 }), ad({ id: 4, weight: 0 })];
    const seen = new Set<number>();
    for (let i = 0; i < 100; i += 1) {
      const picked = pickAd(ads, () => i / 100);
      expect(picked).not.toBeNull();
      seen.add(picked!.id);
    }
    expect([...seen].sort()).toEqual([1, 3]);
  });
});
