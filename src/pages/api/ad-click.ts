/**
 * 广告的点击跳转。公开接口,记一次点击然后把人送去广告的目标地址。
 *
 * ## 目标地址只从数据库里取,永远不从查询串取
 *
 * 这是整个后台唯一一个"把用户重定向到站外"的地方,所以它也是唯一一个可能变成
 * **开放重定向**的地方 —— 而那是钓鱼链接的经典素材:"我们站上有个链接会跳到
 * 任何地方"。
 *
 * 判据因此很硬:**入参只有一个整数 `id`,目标 URL 是拿这个 id 查库查出来的。**
 * 查询串里出现的任何地址都不作数。
 *
 * ## 广告不存在 / 已删除时回首页,不回 404
 *
 * 用户点的是页面上一个真的链接,他在那一刻没做错任何事。给他一张 404 是在为
 * 我们自己的数据状态道歉,而他既看不懂也不关心。
 *
 * 顺带一条:这个站页面上的广告是**可能被人点开新标签页**的(中键、右键),那种
 * 情况下这条 302 是在后台标签页里发生的 —— 所以这里不能依赖任何前端状态。
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { findAd, recordAdEvent } from '../../server/queries';
import { href } from '../../lib/url';

export const GET: APIRoute = async ({ url }) => {
  const id = Number(url.searchParams.get('id') ?? '');

  const home = () => new Response(null, { status: 302, headers: { Location: href() } });
  if (!Number.isInteger(id) || id <= 0) return home();

  const ad = await findAd(id);
  if (!ad) return home();

  await recordAdEvent(ad.id, 'click');

  /*
   * `302` 而不是 `301`:301 会被浏览器**永久缓存**,于是"这条广告改了目标地址"
   * 在一部分访客那里永远不会生效,而点击统计也会从那次缓存之后开始少记。
   * 一个会变的地址只能用临时重定向。
   */
  return new Response(null, { status: 302, headers: { Location: ad.url } });
};
