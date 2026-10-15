/**
 * 后台的权限守卫。**它在这里,而不是在页面或布局的 frontmatter 里。**
 *
 * ## 为什么不能用"布局里 `return Astro.redirect(...)`"
 *
 * 那是第一版的做法,而它**实测不生效**。未登录访问 `/admin` 拿回来的是
 * `200` + 一张 **51 字节的空页**(正文里只剩 vite 的客户端脚本):
 * `return Astro.redirect(...)` 写在**嵌套组件**的 frontmatter 里时,Astro 把它
 * 当成那个组件的返回值,不当成页面的响应 —— 页面照常渲染,只是什么都没渲染出来。
 *
 * 危险的地方在于它**看起来是好的**:内容确实没泄露(布局没往下走),但状态码是
 * 200、页面是空白,而且没有任何报错。读代码时那一行 `if (!user) return redirect(...)`
 * 读起来完全正确 —— 这正是这个仓库反复记着的那一类失败。
 *
 * 中间件是 Astro 给这件事的正规机制,而且它顺带解掉另一个洞:**新加一个
 * `src/pages/admin/xxx.astro` 忘了加守卫**从此不可能发生 —— 中间件在路由之前跑,
 * 与页面上写了什么无关。布局和页面里的重复守卫**全部撤掉了**,免得同一个判断有
 * 两处实现、日后只有一处被改。
 *
 * ## 它只对服务端渲染的路由生效
 *
 * `src/pages/admin/**` 与 `src/pages/api/**` 全都是 `prerender = false`,所以都会
 * 经过这里;40 个预渲染页不会(Astro 不为它们跑中间件)。
 *
 * **构建期也不会碰数据库**:这个模块 import 了 `server/auth` → `db.ts`,但
 * `db.ts` 的模块级代码一行 I/O 都没有(连接池是懒建的),真正取数只发生在
 * `requireAdmin()` 里,而它只在 `admin` / `api/admin` 这两类路径上被调到 ——
 * 那两类路径在构建期根本不会被渲染。所以 CI 里没有数据库也能照常 `npm run build`。
 */

import { defineMiddleware } from 'astro:middleware';
import { loginUrl, requireAdmin } from './server/auth';
import { parsePath } from './lib/i18n';

/**
 * 站点相对路径(已剥掉 base 与语言前缀),不带前斜杠。
 *
 * **末尾那个替换不能省**:Astro 不规范化尾斜杠,所以 `/mouse-test/admin/` 剥完是
 * `admin/`。这里两个分支本来也能靠 `startsWith('admin/')` 兜住,但那样
 * "`/admin` 和不带斜杠的写法"就是两条不同的路径了 —— 守卫的判据应该是
 * 一句"这是不是后台",不是两次前缀比较。`AdminLayout` 那边剥的是同一个东西。
 */
function sitePath(pathname: string): string {
  return parsePath(pathname).rest.replace(/\/$/, '');
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = sitePath(context.url.pathname);

  const isAdminPage = path === 'admin' || path.startsWith('admin/');
  const isAdminApi = path === 'api/admin' || path.startsWith('api/admin/');
  if (!isAdminPage && !isAdminApi) return next();

  const user = await requireAdmin(context.cookies);

  if (!user) {
    /*
     * 两类路径要的响应不一样,这不是洁癖:
     *
     * - **页面**要 302 去登录页。把人扔到一张空白页上是最差的答案 ——
     *   他不知道自己是没登录、还是站点坏了。
     * - **接口**要 403 + JSON。给 fetch 一个 302 的话它会**默默跟着跳**,
     *   然后拿回一整页 HTML 去 `JSON.parse`,报一个和真实原因毫无关系的错。
     */
    if (isAdminApi) {
      return new Response(JSON.stringify({ ok: false, error: '需要管理员登录' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    return context.redirect(loginUrl());
  }

  /*
   * 把身份放进 `locals`,页面与布局从那里读 —— 于是**一次请求只查一次会话**。
   * 布局里再调一次 `requireAdmin()` 也能跑通,但那是同一条 SQL 一页问两遍,
   * 而且两处判断哪天会漂。
   */
  context.locals.user = user;
  return next();
});
