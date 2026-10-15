import { describe, expect, it } from 'vitest';
import { isCountablePath, toolViewPath, VIEW_PATHS } from '../src/lib/page-views';
import { READY_TOOLS } from '../src/lib/tools';

describe('可计数的路径', () => {
  it('每一件已上线的工具都在白名单里', () => {
    for (const tool of READY_TOOLS) {
      expect(VIEW_PATHS.has(toolViewPath(tool.slug)), `${tool.slug} 不在白名单里`).toBe(true);
    }
  });

  it('白名单的条数等于工具数 —— 不多不少', () => {
    expect(VIEW_PATHS.size).toBe(READY_TOOLS.length);
  });

  it('路径一律是 `/slug/` 这个形状', () => {
    for (const path of VIEW_PATHS) {
      expect(path).toMatch(/^\/[a-z0-9-]+\/$/);
    }
  });

  /*
   * 这一组是**这个模块存在的理由**:`/api/view` 是个公开的写接口,而它唯一的
   * 一道门就是这里。放开一格,那张表就会被任意字符串填满。
   */
  describe('不认的东西一律挡掉', () => {
    const rejected = [
      '',
      '/',
      '/cps-test', // 少一个尾斜杠 —— 判据是集合成员,不是前缀匹配
      '/cps-test/extra', // 前缀能过、集合过不了
      '/CPS-TEST/', // 大小写变体
      '/admin/',
      '/login/',
      '/toolbox/', // 工具箱不是工具页(它是 `TOOLBOX`,不是 `Tool`)
      '/mouse-repair/',
      '/../../etc/passwd',
      'cps-test/',
      '//cps-test//',
      '/cps-test/?x=1',
      'https://example.com/',
      '随便什么',
    ];

    for (const path of rejected) {
      it(`挡掉 ${JSON.stringify(path)}`, () => {
        expect(isCountablePath(path)).toBe(false);
      });
    }

    it('非字符串也挡掉(客户端递上来的什么都得假设是坏的)', () => {
      for (const value of [undefined, null, 0, 1, true, {}, [], { toString: () => '/cps-test/' }]) {
        expect(isCountablePath(value)).toBe(false);
      }
    });
  });

  it('认得出真的工具页', () => {
    expect(isCountablePath('/cps-test/')).toBe(true);
    expect(isCountablePath('/dpi-test/')).toBe(true);
    expect(isCountablePath(toolViewPath('reaction-test'))).toBe(true);
  });

  it('toolViewPath 的两端一致 —— 渲染与校验走的是同一个函数', () => {
    for (const tool of READY_TOOLS) {
      expect(isCountablePath(toolViewPath(tool.slug))).toBe(true);
    }
  });
});
