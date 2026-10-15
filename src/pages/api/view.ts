/**
 * 记一次页面浏览。**公开接口,谁都能调。**
 *
 * ## 收什么、不收什么
 *
 * 收的只有一个字段:路径。而且它必须**在白名单里**(`lib/page-views.ts`,那份
 * 清单从注册表推出来)——
 *
 * **不收 IP、不收 UA、不收 referer、不收时间(只到天)**。所以这个接口收到的
 * 东西加起来就是一句话:"`/cps-test/` 今天被打开了一次"。知道这一点的价值在于
 * 它**答不上来"是谁"** —— 而这个站的四处隐私承诺正是靠这个成立。
 *
 * ## 为什么不带 CSRF 令牌
 *
 * 它没有会话可蹭,也不改任何属于用户的东西 —— 伪造它最多只能给某个计数器
 * 多记几次。而且 Astro 自带的 `security.checkOrigin` 默认开着,跨站的表单 POST
 * 本来就到不了这里。
 *
 * ## 但那些数字是"下限",不是"验证过的真值"
 *
 * 页面自己上报的东西**天然可以被刷**:刷新十次就是十次,写个脚本打这个接口也能
 * 刷上去。**所以看板上那一列的口径是"至少被打开过这么多次",不是"精确等于"。**
 * 要精确就得认人(去重),而认人正是这一整套设计拒绝的东西 —— 这一条如实印在
 * 看板那一节里,不装作它是个精确的数。
 *
 * ## 三种情况都返回 204
 *
 * 记上了、路径不在白名单、请求体读不出来 —— **全都不给客户端任何区分**。这不是
 * 为了保密(那点信息谁都能猜),而是为了让这个接口**永远不给页面添麻烦**:
 * 它是个观测行为,不该有任何一条路径会让页面出错。
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { isCountablePath } from '../../lib/page-views';
import { recordPageView } from '../../server/queries';

const NO_CONTENT = new Response(null, {
  status: 204,
  // 计数是这个接口的副作用,任何缓存替我们吞掉一次请求都是少记一次
  headers: { 'Cache-Control': 'no-store' },
});

export const POST: APIRoute = async ({ request }) => {
  let path: unknown;
  try {
    const form = await request.formData();
    path = form.get('path');
  } catch {
    return NO_CONTENT;
  }

  if (!isCountablePath(path)) return NO_CONTENT;

  try {
    await recordPageView(path);
  } catch {
    /*
     * **数据库出错也不能让这件事变成页面的问题。** 浏览计数是最不重要的一条
     * 数据:它挂了,页面照旧、测量照旧、广告照旧。所以这里把错误咽下去 ——
     * 但不静默:
     */
    console.warn('[view] 记一次浏览失败,已忽略。');
    return NO_CONTENT;
  }

  return NO_CONTENT;
};
