/**
 * 注销。**只接受 POST,不提供 GET 注销。**
 *
 * 这不是洁癖:`<img src="/logout">` 是一个 GET,任何能在这儿的页面里塞一张图的
 * 地方都能把你注销掉。GET 不该有副作用,注销有。所以它由一个真正的 `<form>`
 * 提交(在后台的侧栏里),而那个表单带 CSRF 令牌。
 *
 * 注销做的事有两件,缺一不可:**删掉库里那一行**(否则那枚 token 还能用),
 * **清掉 cookie**(否则浏览器下次还带着它来,而它已经查不到了 —— 表现是
 * "反复跳登录页",看不出为什么)。清 cookie 那一步用 `expires` 置过去也是一种
 * 写法,这里用 `delete` 让它更直白。
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { clearSessionCookie, destroySession, homeUrl, readSession } from '../../../server/auth';

export const POST: APIRoute = async ({ cookies }) => {
  // 先读再删:读的时候会把 token 取出来,删的时候要用
  const user = await readSession(cookies);
  if (user) await destroySession(user.token);
  clearSessionCookie(cookies);

  return new Response(null, { status: 303, headers: { Location: homeUrl() } });
};
