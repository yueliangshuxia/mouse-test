import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/password';

/*
 * 哈希一次要跑一遍 scrypt(N=16384),所以**算一次、多个用例共用** ——
 * 每个用例各哈希一遍的话,这个文件会变成整个测试套里最慢的一个。
 */
const HASH = await hashPassword('正确的马电池订书钉');

describe('口令哈希', () => {
  it('同一个口令两次哈希得到不同的串(盐是现取的)', async () => {
    const again = await hashPassword('正确的马电池订书钉');
    expect(again).not.toBe(HASH);
    // 但两个串都能校验通过 —— 这才是随机盐的意义
    expect(await verifyPassword('正确的马电池订书钉', HASH)).toBe(true);
    expect(await verifyPassword('正确的马电池订书钉', again)).toBe(true);
  });

  it('正确的口令通过,错的不通过', async () => {
    expect(await verifyPassword('正确的马电池订书钉', HASH)).toBe(true);
    expect(await verifyPassword('正确的马电池订书丁', HASH)).toBe(false);
    expect(await verifyPassword('', HASH)).toBe(false);
    expect(await verifyPassword('正确的马电池订书钉 ', HASH)).toBe(false);
  });

  it('哈希串自带算法与参数', () => {
    const parts = HASH.split('$');
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe('scrypt');
    expect(Number(parts[1])).toBeGreaterThan(0);
    expect(Number(parts[2])).toBeGreaterThan(0);
    expect(Number(parts[3])).toBeGreaterThan(0);
    // 盐与散列都是十六进制
    expect(parts[4]).toMatch(/^[0-9a-f]+$/);
    expect(parts[5]).toMatch(/^[0-9a-f]+$/);
  });

  /*
   * 这一组是这个文件里**最值钱的**:坏数据不能变成 500。
   *
   * 一条读不懂的存储串,在调用方看来和"口令不对"是同一件事 —— 都该老老实实
   * 返回 false。抛异常的话,一行坏数据就能让整个登录接口崩掉,而那既帮不到
   * 管理员,也盖住了真正的原因。
   */
  describe('坏掉的存储串一律返回 false,不抛异常', () => {
    const broken = [
      '',
      'scrypt',
      'scrypt$16384$8$1$abcd', // 少一段
      'scrypt$16384$8$1$abcd$efgh$多一段',
      'bcrypt$16384$8$1$abcd$ef01', // 换了算法
      'scrypt$NaN$8$1$abcd$ef01',
      'scrypt$0$8$1$abcd$ef01', // N 为 0
      'scrypt$16384$8$1$$ef01', // 空盐
      'scrypt$16384$8$1$abcd$', // 空散列
      // N 大到内存不够:derive 会抛,必须被咽下去
      'scrypt$1048576$8$1$abcd$ef01',
      'scrypt$16384$8$1$zzzz$ef01', // 不是十六进制
    ];

    for (const stored of broken) {
      it(`读不懂就 false:${JSON.stringify(stored)}`, async () => {
        await expect(verifyPassword('随便什么口令', stored)).resolves.toBe(false);
      });
    }
  });
});
