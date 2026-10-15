import { describe, expect, it } from 'vitest';
import { createLoginThrottle } from '../src/lib/login-throttle';

/**
 * 一个可以手动拨的时钟。`createLoginThrottle` 收 `now`,所以锁定期在测试里
 * 不必真的等 —— 这也是这段逻辑当初被搬进 `src/lib/` 的原因:在 `server/auth.ts`
 * 里它碰数据库,一行都测不到,而它偏偏出过一次静默的 bug。
 */
function makeClock(start = 1_000_000) {
  let current = start;
  return {
    now: () => current,
    advance(ms: number) {
      current += ms;
    },
  };
}

describe('登录失败锁定', () => {
  /*
   * 这一条就是那个 bug 的回归测试。
   *
   * 老写法在"从没锁过"的条目上也去删计数,于是每一次失败都被下一次清掉,
   * 连打多少次都不会锁 —— 而它不报错、不抛异常、日志里一个字都没有。
   */
  it('连打 max 次就锁上 —— 计数必须跨调用累加', () => {
    const clock = makeClock();
    const throttle = createLoginThrottle({ maxFailures: 5, now: clock.now });

    // 前 4 次都没锁
    for (let i = 1; i <= 4; i += 1) {
      expect(throttle.lockedFor('admin'), `第 ${i} 次之前不该锁`).toBe(0);
      throttle.noteFailure('admin');
    }

    // 第 5 次记完,锁生效
    throttle.noteFailure('admin');
    expect(throttle.lockedFor('admin')).toBeGreaterThan(0);
  });

  it('默认是 5 次 / 60 秒', () => {
    const clock = makeClock();
    const throttle = createLoginThrottle({ now: clock.now });
    for (let i = 0; i < 4; i += 1) throttle.noteFailure('admin');
    expect(throttle.lockedFor('admin')).toBe(0);
    throttle.noteFailure('admin');
    expect(throttle.lockedFor('admin')).toBe(60_000);
  });

  it('锁定期内剩下的时间是递减的', () => {
    const clock = makeClock();
    const throttle = createLoginThrottle({ maxFailures: 1, lockMs: 10_000, now: clock.now });

    throttle.noteFailure('admin');
    expect(throttle.lockedFor('admin')).toBe(10_000);

    clock.advance(3_000);
    expect(throttle.lockedFor('admin')).toBe(7_000);

    clock.advance(6_999);
    expect(throttle.lockedFor('admin')).toBe(1);
  });

  it('锁过期之后放行,而且下一次失败从 1 重新累计', () => {
    const clock = makeClock();
    const throttle = createLoginThrottle({ maxFailures: 2, lockMs: 1_000, now: clock.now });

    throttle.noteFailure('admin'); // count = 1
    throttle.noteFailure('admin'); // count 到 2 → 锁 1 秒

    expect(throttle.lockedFor('admin')).toBe(1_000);
    clock.advance(1_001);
    expect(throttle.lockedFor('admin')).toBe(0);

    // 重新开始:只失败一次不该立刻又锁上
    throttle.noteFailure('admin');
    expect(throttle.lockedFor('admin')).toBe(0);
    throttle.noteFailure('admin');
    expect(throttle.lockedFor('admin')).toBe(1_000);
  });

  it('恰好到期的时刻算没锁(判据是 `> 0` 不是 `>= 0`)', () => {
    const clock = makeClock();
    const throttle = createLoginThrottle({ maxFailures: 1, lockMs: 1_000, now: clock.now });
    throttle.noteFailure('admin');
    clock.advance(1_000);
    expect(throttle.lockedFor('admin')).toBe(0);
  });

  it('每个键各算各的 —— 锁了 A 不影响 B', () => {
    const clock = makeClock();
    const throttle = createLoginThrottle({ maxFailures: 2, now: clock.now });

    throttle.noteFailure('a');
    throttle.noteFailure('a');
    throttle.noteFailure('b');

    expect(throttle.lockedFor('a')).toBeGreaterThan(0);
    expect(throttle.lockedFor('b')).toBe(0);
  });

  it('登录成功清掉计数,之前攒的次数不作数', () => {
    const clock = makeClock();
    const throttle = createLoginThrottle({ maxFailures: 3, now: clock.now });

    throttle.noteFailure('admin');
    throttle.noteFailure('admin');
    throttle.clear('admin');
    throttle.noteFailure('admin');

    expect(throttle.lockedFor('admin')).toBe(0);
    throttle.noteFailure('admin');
    throttle.noteFailure('admin');
    expect(throttle.lockedFor('admin')).toBeGreaterThan(0);
  });

  it('从没失败过的键永远不锁', () => {
    const throttle = createLoginThrottle();
    expect(throttle.lockedFor('谁都没试过')).toBe(0);
    expect(throttle.size()).toBe(0);
  });
});
