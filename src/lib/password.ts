/**
 * 口令的哈希与校验。**scrypt,`node:crypto` 内置,不加任何依赖。**
 *
 * ## 这个文件为什么住在 `src/lib/` 而不是 `src/server/`
 *
 * 分层是按"**碰不碰数据库 / 碰不碰 cookie**"切的,不是按"跑在哪儿"切的。
 * 这里一行数据库都不碰,所以它归 `src/lib/` —— 于是 `tests/password.test.ts`
 * 能在纯 node 环境里直接覆盖它,不需要起一个 MySQL,也不需要 jsdom。
 *
 * ## 但它和 `src/lib/` 里其他模块有一处不同,必须记住
 *
 * **它是 `src/lib/` 下唯一 import `node:crypto` 的模块,所以任何浏览器侧
 * (页面 `<script>`)的代码都不许 import 它** —— 打包进客户端会当场炸。
 * 消费者只有 `src/server/` 里那两个(`db.ts` 的播种、`auth.ts` 的登录)。
 * 这一条靠约定守着,因为 `npm run typecheck` 看不出"某个模块会不会被打进
 * 客户端包"。
 *
 * ## 为什么哈希串要自己带参数
 *
 * 存成 `scrypt$N$r$p$盐$散列` 一整串,而不是把盐单独开一列。区别在**以后**:
 * 哪天调高 N,老口令仍然按它自己那一串里的 N 校验,新口令按新的来,两边都
 * 不用改代码、也不用做数据迁移。分开存的话,参数就成了"全表一个值",调它
 * 等于把所有老口令一起作废。
 */

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/** 哈希串里的算法名。以后要换算法(比如 argon2)就靠它分流。 */
const ALGORITHM = 'scrypt';

/*
 * 参数按 Node 官方文档的推荐值取(N=16384 是"交互式登录"那一档)。
 *
 * 内存开销 = 128 × N × r = 16MB,在 `maxmem` 默认的 32MB 之下,所以不用显式
 * 抬高上限。**但这一条是有余量可言的**:N 再翻一倍就需要 32MB,那时候必须
 * 同时传 `maxmem`,否则 Node 会直接抛错 —— 而错误信息是"memory limit exceeded",
 * 不会告诉你差多少。
 */
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function derive(
  password: string,
  salt: Buffer,
  keyLength: number,
  params: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, params, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/**
 * 造一串新的口令哈希。**每次调用都会现取一段随机盐** —— 所以同一个口令
 * 哈希两次得到两个不同的串,那是对的,不是 bug。
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return [ALGORITHM, N, R, P, salt.toString('hex'), key.toString('hex')].join('$');
}

/**
 * 校验一个口令。**任何"看不懂"的存储串一律返回 `false`,绝不抛异常。**
 *
 * 理由:校验失败和"这一行的数据坏了"在调用方看来是**同一件事** —— 这个口令
 * 就是不能通过。抛异常的话,一条坏数据就能让整个登录接口 500,而那既帮不到
 * 管理员,也盖住了真正的原因。
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6) return false;

  const [algorithm, rawN, rawR, rawP, saltHex, hashHex] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  if (algorithm !== ALGORITHM) return false;

  const params = { N: Number(rawN), r: Number(rawR), p: Number(rawP) };
  if (!Number.isInteger(params.N) || !Number.isInteger(params.r) || !Number.isInteger(params.p)) {
    return false;
  }
  if (params.N <= 0 || params.r <= 0 || params.p <= 0) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  // 空 buffer 会让 scrypt 抛错,而且长度不等时 timingSafeEqual 也会抛 ——
  // 都在这里挡掉,理由同上:坏数据不该变成 500
  if (salt.length === 0 || expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = await derive(password, salt, expected.length, params);
  } catch {
    // 参数大到内存不够(N 被改坏)也走这里
    return false;
  }

  // 长度不同时 timingSafeEqual 会抛,所以先比长度。**这一步不是多余的**:
  // 长度能从前面的 hex 直接看出来,不泄露任何关于口令的信息。
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
