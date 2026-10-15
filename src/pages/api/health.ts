/**
 * 地基自检接口 —— **这一条路由的唯一职责是证明"SSR 跑起来了、数据库连得上"**。
 *
 * 它是全站第一条 `prerender = false` 的路由。加 adapter 之前,全站 40 个页面
 * 都是构建期生成的静态 HTML,服务端一行代码都不跑;有了它,那 40 页照旧预渲染,
 * 而这一条(以及 `/login`、`/admin/*`)在请求到来时才执行。
 *
 * 它**不需要登录**是有意的:一个自检接口要是也要登录,那"登录不上"的时候就没有
 * 任何东西能告诉你到底是数据库挂了还是登录逻辑挂了。
 *
 * ## 一笔实测记下来的账
 *
 * `Astro.url.pathname` 带 base 前缀,dev 和生产一致 —— 实测 dev 下 curl
 * `/mouse-test/api/health`,读回来就是 `/mouse-test/api/health`。我原先照
 * `vite-plugin-astro-server/base.js` 那段 base 中间件推断"dev 会剥掉前缀",
 * **测下来是错的**。所以任何"拿 pathname 做判断"的代码两边都不能写死一个形状,
 * 这正是站内链接一律走 `href()` 的原因。
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from '../../server/env';
import { ping } from '../../server/db';

export const GET: APIRoute = async ({ url }) => {
  const database = await ping();

  /*
   * 数据库不通时返回 **503 而不是 200**。
   *
   * 这一条是刻意的:运维脚本、探针、以及"我到底起没起来"这类判断全都只看状态码。
   * 一个永远 200 的自检接口,在数据库挂掉的时候会告诉所有人"一切正常"。
   */
  return Response.json(
    {
      ok: database.ok,
      ssr: true,
      database: database.ok ? { ok: true, name: env.db.database } : { ok: false, error: database.error },
      pathname: url.pathname,
      baseUrl: import.meta.env.BASE_URL,
      node: process.version,
    },
    { status: database.ok ? 200 : 503 },
  );
};
