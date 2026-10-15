/**
 * 广告位的写接口。和 `api/admin/users.ts` 同一套形状:一个入口、`action` 分流、
 * 顺序是 解析 → CSRF → 校验 → 写库。
 *
 * 校验本身在 `lib/admin-form.ts` 里(纯函数、有单测),这里只负责把它的话转成
 * 一次重定向 —— 接口这一层**不做任何判断**,那是它薄的方式。
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { verifyCsrf } from '../../../server/auth';
import { parseAdInput } from '../../../lib/admin-form';
import { createAd, deleteAd, findAd, setAdActive, updateAd } from '../../../server/queries';
import { href } from '../../../lib/url';

function back(query: string): Response {
  return new Response(null, { status: 303, headers: { Location: `${href('admin/ads')}${query}` } });
}

function fail(message: string): Response {
  return back(`?err=${encodeURIComponent(message)}`);
}

function done(message: string): Response {
  return back(`?ok=${encodeURIComponent(message)}`);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const operator = locals.user;
  if (!operator) return fail('登录状态已失效,请重新登录');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('请求体读不出来,请重试');
  }

  if (!verifyCsrf(operator, form.get('csrf'))) {
    return fail('表单已过期,请刷新页面重试');
  }

  const action = String(form.get('action') ?? '');
  const id = Number(String(form.get('id') ?? ''));

  switch (action) {
    case 'create': {
      const parsed = parseAdInput({
        slot: form.get('slot'),
        title: form.get('title'),
        body: form.get('body'),
        url: form.get('url'),
        weight: form.get('weight'),
      });
      if (!parsed.ok) return fail(parsed.error);

      await createAd(parsed.value);
      return done(`已新建「${parsed.value.title}」`);
    }

    case 'update': {
      if (!Number.isInteger(id) || id <= 0) return fail('广告编号不对');
      const parsed = parseAdInput({
        slot: form.get('slot'),
        title: form.get('title'),
        body: form.get('body'),
        url: form.get('url'),
        weight: form.get('weight'),
      });
      if (!parsed.ok) return fail(parsed.error);

      const existing = await findAd(id);
      if (!existing) return fail('这条广告不存在');

      await updateAd(id, parsed.value);
      return done(`已保存「${parsed.value.title}」`);
    }

    case 'toggle': {
      if (!Number.isInteger(id) || id <= 0) return fail('广告编号不对');
      const target = await findAd(id);
      if (!target) return fail('这条广告不存在');

      await setAdActive(id, !target.active);
      return done(`${target.title} 已${target.active ? '停投' : '开始投'}`);
    }

    case 'delete': {
      if (!Number.isInteger(id) || id <= 0) return fail('广告编号不对');
      const target = await findAd(id);
      if (!target) return fail('这条广告不存在');

      /*
       * **删除会连曝光与点击的统计一起删**(`ad_events` 上那条外键是
       * `ON DELETE CASCADE`)。所以提示语要说清楚这件事 —— 否则"我只是删了一条
       * 没人点的广告",而看板上那条历史曲线跟着少了一截,没人知道为什么。
       *
       * 想留数据的话那条路是**停投**(`toggle`),不是删除。这一句写在这里,
       * 因为这是唯一一个会丢历史数据的地方。
       */
      await deleteAd(id);
      return done(`已删除「${target.title}」,它的曝光与点击记录一并删除。想留数据请改用「停投」`);
    }

    default:
      return fail('不认识的操作');
  }
};
