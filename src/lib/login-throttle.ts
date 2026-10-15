/**
 * 登录失败的计数与锁定。**纯逻辑,时钟是注入的,所以能单测。**
 *
 * ## 它为什么从 `server/auth.ts` 里搬出来
 *
 * 原来这段代码住在 `auth.ts` 里,而那个模块 import 了 `db.ts` / `mysql2` ——
 * `tests/` 是纯 node 环境、没有数据库,于是**它一行都测不到**。测不到的那部分
 * 恰恰出过一次真 bug,而且是**静默**的那一类:锁从来没触发过,不报错、不抛异常、
 * 日志里一个字都没有,只有真去连打六次才看得出来。
 *
 * 那个 bug 的成因值得记在这里,因为它是这一类计时逻辑的通病:
 *
 * > 判断"锁有没有过期"用的是 `lockedUntil > now`。而**从没锁过**的条目
 * > `lockedUntil` 是 `0`,于是 `0 > now` 为假 —— 代码走进"锁过期了,该清零"
 * > 那一支,把**还在累计的计数**一起删了。每一次失败都被下一次删除,计数永远
 * > 停在 1,`count >= max` 永远不成立。
 *
 * 所以这里的判据分成**三种**状态而不是两种,而且 `lockedUntil === 0` 那一档
 * 显式写在最前面。`tests/login-throttle.test.ts` 用"连打 max 次必须锁上"钉着它。
 */

export interface ThrottleOptions {
  /** 连续失败多少次之后锁。 */
  maxFailures?: number;
  /** 锁多久。 */
  lockMs?: number;
  /** 注入时钟,单测里用来跳过锁定期。 */
  now?: () => number;
}

export interface LoginThrottle {
  /** 还要锁多久(毫秒)。**0 表示没锁。** */
  lockedFor(key: string): number;
  /** 记一次失败。 */
  noteFailure(key: string): void;
  /** 登录成功时清掉这个键。 */
  clear(key: string): void;
  /** 现在记着几个键。给测试与排查用。 */
  size(): number;
}

interface Entry {
  count: number;
  /** `0` 表示**从没锁过** —— 这一档必须和"锁过期了"分开,见文件头。 */
  lockedUntil: number;
}

export function createLoginThrottle(options: ThrottleOptions = {}): LoginThrottle {
  const maxFailures = options.maxFailures ?? 5;
  const lockMs = options.lockMs ?? 60_000;
  const now = options.now ?? Date.now;

  const entries = new Map<string, Entry>();

  return {
    lockedFor(key: string): number {
      const entry = entries.get(key);
      if (!entry) return 0;

      // ① 从没锁过:让它继续累加。**这里绝不能删** —— 删了计数就永远到不了阈值。
      if (entry.lockedUntil === 0) return 0;

      // ② 正在锁定期内:告诉他还要等多久
      const remaining = entry.lockedUntil - now();
      if (remaining > 0) return remaining;

      // ③ 锁已经过期:这时候清零才是对的,下一次失败从 1 开始重新累计
      entries.delete(key);
      return 0;
    },

    noteFailure(key: string): void {
      const entry = entries.get(key) ?? { count: 0, lockedUntil: 0 };
      entry.count += 1;
      if (entry.count >= maxFailures) {
        entry.lockedUntil = now() + lockMs;
        // 计数清零,但 `lockedUntil` 留着 —— 正是它让下一轮走 ① 而不是"重新开始"
        entry.count = 0;
      }
      entries.set(key, entry);
    },

    clear(key: string): void {
      entries.delete(key);
    },

    size(): number {
      return entries.size;
    },
  };
}
