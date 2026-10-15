/**
 * 取一条广告。**公开接口,不需要登录** —— 它是首页和工具箱页那两格广告的数据源。
 *
 * ## 曝光就记在这里,不另开一个上报接口
 *
 * 判据是这句话:**这一版量的"曝光"是"接口把一条广告发给了某个页面",不是
 * "这条广告真的被人看到了"。**
 *
 * 后者在网页侧根本测不准(要判元素进没进视口、停留够不够久,而"够久"是多少
 * 全是编出来的数),而且广告被 `display:none` 掉、被别的元素盖住、标签页在后台
 * —— 这些都算"渲染过"。写一个看起来更精确的上报接口,只会把编出来的阈值伪装
 * 成测量结果。**这个站的信誉建立在"测不准就明说"上,一个广告位也不例外。**
 *
 * 所以一次取用就是一次曝光:一个请求,一个 upsert,不多一个接口。
 *
 * ## 返回 204 而不是空对象
 *
 * 没有广告可投时返回 **204 No Content**。客户端据此**整块不渲染** —— 全站那条
 * 「没数据不画空槽」落到广告位上就是这个样子:一个空的广告框会被读成"这里坏了"。
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { isAdSlot, pickAd } from '../../lib/ads';
import { adsForSlot, recordAdEvent } from '../../server/queries';
import { href } from '../../lib/url';

export const GET: APIRoute = async ({ url }) => {
  const slot = url.searchParams.get('slot');
  if (!isAdSlot(slot)) {
    return new Response(JSON.stringify({ ok: false, error: '槽位不对' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const ad = pickAd(await adsForSlot(slot));
  if (!ad) return new Response(null, { status: 204 });

  await recordAdEvent(ad.id, 'impression');

  return Response.json(
    {
      id: ad.id,
      title: ad.title,
      body: ad.body,
      /*
       * 点出去的地址**由服务端拼**,而且指向我们自己那个跳转接口,不是广告的目标
       * URL。两个理由:一是点击要在服务端记,二是把目标 URL 交给客户端就意味着
       * 前端拿得到它 —— 而广告商给的链接不该是前端可改的东西。
       *
       * 客户端只管把这个字符串塞进 `<a href>`,不拼、不猜、也不做任何判断。
       */
      clickUrl: `${href('api/ad-click')}?id=${ad.id}`,
    },
    {
      // 每次页面浏览都该是一次曝光,所以**不让中间缓存替我们计数**
      headers: { 'Cache-Control': 'no-store' },
    },
  );
};
