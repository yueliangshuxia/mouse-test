import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ADMIN_NAV, LOGIN_PATH } from '../src/lib/admin-nav';

/*
 * 这个文件守的是**后台的两条接缝**,它们都属于"漏了不报错"的那一类:
 *
 * 1. 加了导航项却忘了建页面 → 点出一个 404
 * 2. 加了页面却没经过权限守卫 → **任何人都能打开**,而页面看起来一切正常
 *
 * 第 2 条是这里最值钱的一条。后台的守卫住在 `src/middleware.ts`(为什么不在布局里,
 * 见那个文件的文件头),而**中间件会拦到所有路径,不需要每个页面配合** —— 所以
 * 真正需要守的变成了"**中间件还在不在、还管不管后台**"。中间件哪天被人删掉或
 * 改窄,页面照样跑,只是谁都能进;这条用例就是那种情况下唯一会响的东西。
 *
 * 读源码而不是起一个服务器来打请求:`tests/` 是纯 node 环境,没有数据库也没有
 * 浏览器,而这几条判据本来就是"文件与文件之间对不对得上"。
 */

const ROOT = new URL('../', import.meta.url);

function pageFile(path: string): string {
  // `admin` 那一页是目录的 index;其余是 `admin/xxx` → `src/pages/admin/xxx.astro`
  const file = path === 'admin' ? 'admin/index' : path;
  return fileURLToPath(new URL(`src/pages/${file}.astro`, ROOT));
}

describe('后台导航清单', () => {
  it('每一项都有对应的页面文件', () => {
    for (const item of ADMIN_NAV) {
      expect(existsSync(pageFile(item.path)), `src/pages/${item.path}.astro 不存在`).toBe(true);
    }
  });

  it('路径不重复', () => {
    const paths = ADMIN_NAV.map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('每一项都有一句说明 —— 概览页那几张卡直接印它', () => {
    for (const item of ADMIN_NAV) {
      expect(item.blurb.length, `${item.path} 没有 blurb`).toBeGreaterThan(0);
    }
  });

  it('登录页单独在册,而且文件在', () => {
    expect(existsSync(pageFile(LOGIN_PATH)), `src/pages/${LOGIN_PATH}.astro 不存在`).toBe(true);
    // 它**不该**出现在侧栏里 —— 登录页没有导航,而且它不是"后台的一个模块"
    expect(ADMIN_NAV.some((item) => item.path === LOGIN_PATH)).toBe(false);
  });
});

describe('后台页面全部走服务端渲染', () => {
  /*
   * 预渲染的话,`prerender = false` 就没了,中间件也就不会为它跑 ——
   * 于是那一页**在构建期就被生成成一份静态 HTML**,谁都能下载。
   * 这是个真会发生的错法:复制一个新页面时忘掉这一行。
   */
  const files = readdirSync(fileURLToPath(new URL('src/pages/admin/', ROOT))).filter((name) =>
    name.endsWith('.astro'),
  );

  it('目录里至少有一个页面(否则下面的循环是空转)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`src/pages/admin/${file} 声明了 prerender = false`, () => {
      const source = readFileSync(fileURLToPath(new URL(`src/pages/admin/${file}`, ROOT)), 'utf-8');
      expect(source).toMatch(/export\s+const\s+prerender\s*=\s*false/);
    });

    it(`src/pages/admin/${file} 用 AdminLayout —— 它带侧栏,也带 noindex`, () => {
      const source = readFileSync(fileURLToPath(new URL(`src/pages/admin/${file}`, ROOT)), 'utf-8');
      expect(source).toMatch(/AdminLayout/);
    });
  }
});

describe('权限守卫住在中间件里,而且覆盖后台', () => {
  const middlewarePath = fileURLToPath(new URL('src/middleware.ts', ROOT));

  it('src/middleware.ts 存在', () => {
    expect(existsSync(middlewarePath)).toBe(true);
  });

  it('中间件导出 onRequest', () => {
    expect(readFileSync(middlewarePath, 'utf-8')).toMatch(/export\s+const\s+onRequest/);
  });

  /*
   * 用的是 `requireAdmin`,不是 `requireUser`。差别不是措辞:**普通用户账号能
   * 通过 `requireUser`** —— 那一版的后果是"登录了但不是管理员"的人能进后台,
   * 而且页面一切正常,只有权限判断错了一层。
   */
  it('中间件调的是 requireAdmin(不是 requireUser)', () => {
    const source = readFileSync(middlewarePath, 'utf-8');
    expect(source).toMatch(/requireAdmin/);
    expect(source).not.toMatch(/requireUser\s*\(/);
  });

  it('中间件同时覆盖后台页面与后台接口两条路径', () => {
    const source = readFileSync(middlewarePath, 'utf-8');
    // 页面那条要能重定向,接口那条要能返回 JSON —— 两个词都得在
    expect(source).toMatch(/admin/);
    expect(source).toMatch(/api\/admin/);
    expect(source).toMatch(/403/);
  });

  /*
   * 布局**不该**自己再判一次权限。两处实现的话,日后只有一处会被改 ——
   * 而"改了一处忘了另一处"在权限判断上是最贵的那种漂移。
   */
  it('AdminLayout 不再重复判断权限', () => {
    const layout = readFileSync(fileURLToPath(new URL('src/layouts/AdminLayout.astro', ROOT)), 'utf-8');
    expect(layout).not.toMatch(/requireAdmin/);
    expect(layout).toMatch(/Astro\.locals\.user/);
  });
});
