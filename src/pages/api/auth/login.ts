/**
 * 登录。**PRG**(Post / Redirect / Get):无论成败都 303 回一个页面,不在 POST 上
 * 直接渲染。
 *
 * 为什么非要 PRG:直接在 POST 的响应里渲染页面的话,用户按 F5 会**重发一次
 * 登录请求**。浏览器会弹"要重新提交表单吗",而答"是"就等于又登一次。更糟的是
 * 那种页面没法被收藏、没法被后退键正确回退。
 *
 * ## 这个接口刻意不带 CSRF 令牌
 *
 * 后台那些**改动数据**的 POST 一律带(见 `api/admin/*`),登录不带。理由是
 * "登录 CSRF"(诱导你登录成攻击者的账号)在这里没有可窃取的东西 —— 这个站没有
 * 用户侧数据,登录进去只有管理员能做事,而攻击者诱导管理员登录成自己的账号
 * 对自己毫无好处。要防它得先有一个"未登录状态下的令牌",那是另一套机制
 * (双重提交 cookie),为一个低危项引入它不划算。
 *
 * **这一条是有意的取舍,不是漏做。** 哪天有了用户侧的隐私数据,这里要跟着改。
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import {
  adminUrl,
  attachSessionCookie,
  destroySession,
  login,
  loginUrl,
  readSession,
} from '../../../server/auth';
import { parseUsername } from '../../../lib/admin-form';

function back(query: string): Response {
  return new Response(null, { status: 303, headers: { Location: `${loginUrl()}${query}` } });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return back('?err=' + encodeURIComponent('请求体读不出来,请重新提交一次'));
  }

  const username = String(form.get('username') ?? '').trim();
  const password = String(form.get('password') ?? '');

  if (!username || !password) return back('?err=' + encodeURIComponent('用户名和密码都要填'));

  // 用户名在这里只用来"别把明显不合法的东西送进查询",不做详细校验 ——
  // 登录失败的原因**一律只说"用户名或密码不对"**,不告诉对方是哪一项错了
  const parsed = parseUsername(username);
  if (!parsed.ok) return back('?err=' + encodeURIComponent('用户名或密码不对'));

  /*
   * 数据库连不上时,**别把 500 直接甩给用户**,也别把原始错误显示在页面上。
   *
   * 两个理由:一是那时候用户看到的是一张崩溃页,而他能做的事只有"等一会儿再试",
   * 那就该这么说;二是驱动那句 `连接或初始化 MySQL 失败(root@127.0.0.1:3306/...)`
   * 里带着**库名、用户名、主机端口** —— 那是给运维看的,不该出现在任何能匿名
   * 打开的表单上。所以详情进服务端日志,页面只给一句人话。
   */
  let result;
  try {
    result = await login(parsed.value, password);
  } catch (error) {
    console.error('[login] 登录时数据库出错:', error);
    return back('?err=' + encodeURIComponent('服务暂时不可用,请稍后再试'));
  }
  if (!result.ok) return back('?err=' + encodeURIComponent(result.error));

  /*
   * 登录成功前**先把旧的会话删掉**。
   *
   * 两个人共用一台机器时是必须的:上一个人登录着(可能是个普通用户),下一个人
   * 不点注销、直接拿管理员的账号登录 —— 不删的话库里就留着上一个人那一行,
   * 他手里那枚 cookie 一直到过期都还能用。表现是"我明明换账号了,他那边还能进",
   * 而这件事在界面上完全看不出来。
   */
  const previous = await readSession(cookies);
  if (previous) await destroySession(previous.token);

  attachSessionCookie(cookies, result.session);
  return new Response(null, { status: 303, headers: { Location: adminUrl() } });
};
