/**
 * 用户管理的写接口。**一张表单一个入口,用 `action` 字段分流。**
 *
 * ## 为什么都走这一个文件
 *
 * 四件事(建号 / 改角色 / 启停 / 重置密码)共用的是**同一套前置检查**:谁在操作、
 * CSRF、目标账号存不存在、会不会把最后一个管理员弄没。四个文件各写一遍的话,
 * 加一个检查就要改四处,而漏掉一处**不报错** —— 那种"其中一个接口没有防线"的
 * 窟窿,恰恰是这类后台最常见的。
 *
 * ## 每一步的顺序不能换
 *
 * 解析 → **CSRF** → 校验 → **业务前置检查** → 写库。CSRF 排在业务检查之前:
 * 一个伪造的请求连"目标账号存不存在"都不该问出来。
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { verifyCsrf } from '../../../server/auth';
import { hashPassword } from '../../../lib/password';
import { parsePassword, parseUsername } from '../../../lib/admin-form';
import {
  countActiveAdmins,
  createUser,
  findUser,
  setUserPassword,
  setUserRole,
  setUserStatus,
} from '../../../server/queries';
import { href } from '../../../lib/url';

const PAGE = () => href('admin/users');

function back(query: string): Response {
  return new Response(null, { status: 303, headers: { Location: `${PAGE()}${query}` } });
}

function fail(message: string): Response {
  return back(`?err=${encodeURIComponent(message)}`);
}

function done(message: string): Response {
  return back(`?ok=${encodeURIComponent(message)}`);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const operator = locals.user;
  // 中间件已经拦过一道;这里再判一次是因为**类型**上它是 `SessionUser | undefined`,
  // 而下面每一句都要用 `operator.id`
  if (!operator) return fail('登录状态已失效,请重新登录');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('请求体读不出来,请重试');
  }

  if (!verifyCsrf(operator, form.get('csrf'))) {
    // 不给细节:伪造者不需要知道是哪一项不对
    return fail('表单已过期,请刷新页面重试');
  }

  const action = String(form.get('action') ?? '');
  const rawId = String(form.get('id') ?? '');
  const id = Number(rawId);

  switch (action) {
    case 'create': {
      const username = parseUsername(form.get('username'));
      if (!username.ok) return fail(username.error);

      const password = parsePassword(form.get('password'));
      if (!password.ok) return fail(password.error);

      const role = form.get('role') === 'admin' ? 'admin' : 'user';

      try {
        await createUser(username.value, await hashPassword(password.value), role);
      } catch (error) {
        /*
         * 重名由**数据库的唯一键**挡住,而不是先 SELECT 再 INSERT —— 后者在并发下
         * 挡不住(两个请求同时查、都说"没有",然后一起插)。所以这里认的是驱动
         * 报出来的 `ER_DUP_ENTRY`,而不是自己查一圈。
         */
        if (isDuplicate(error)) return fail(`用户名「${username.value}」已经有人用了`);
        throw error;
      }
      return done(`已创建 ${username.value}`);
    }

    case 'role': {
      if (!Number.isInteger(id) || id <= 0) return fail('账号编号不对');
      const role = form.get('role') === 'admin' ? 'admin' : 'user';

      const target = await findUser(id);
      if (!target) return fail('这个账号不存在');

      if (target.role === role) return done('角色没有变化');

      if (target.role === 'admin' && role === 'user') {
        const guard = await guardLastAdmin(target.id, operator.id, '降级');
        if (guard) return guard;
      }

      await setUserRole(id, role);
      return done(`${target.username} 现在是${role === 'admin' ? '管理员' : '普通用户'}`);
    }

    case 'status': {
      if (!Number.isInteger(id) || id <= 0) return fail('账号编号不对');
      const status = form.get('status') === 'disabled' ? 'disabled' : 'active';

      const target = await findUser(id);
      if (!target) return fail('这个账号不存在');
      if (target.status === status) return done('状态没有变化');

      if (status === 'disabled') {
        const guard = await guardLastAdmin(target.id, operator.id, '停用');
        if (guard) return guard;
      }

      await setUserStatus(id, status);
      return done(`${target.username} 已${status === 'disabled' ? '停用' : '启用'}`);
    }

    case 'password': {
      if (!Number.isInteger(id) || id <= 0) return fail('账号编号不对');
      const password = parsePassword(form.get('password'));
      if (!password.ok) return fail(password.error);

      const target = await findUser(id);
      if (!target) return fail('这个账号不存在');

      await setUserPassword(id, await hashPassword(password.value));
      /*
       * 这里**不需要**像"降级最后一个管理员"那样拦一道 —— 重置密码不会让人失去
       * 进入后台的资格。而且 `setUserPassword` 会把那个人的会话全删掉,所以
       * "改完密码对方还在线"这件事不存在。
       */
      return done(`已重置 ${target.username} 的密码(他当前的登录已全部失效)`);
    }

    default:
      return fail('不认识的操作');
  }
};

/** 驱动抛出来的重名错误。`mysql2` 把 MySQL 的错误码放在 `code` 上。 */
function isDuplicate(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ER_DUP_ENTRY'
  );
}

/**
 * 「不能把最后一个能进后台的人弄没」。
 *
 * 这一条是后台**唯一一个会把你自己锁在门外的操作**,而它一旦发生就没有任何界面
 * 能挽回 —— 只能去数据库里手改 `role`。所以要拦两种情形,而且**分别给话**:
 *
 * 1. 操作的是自己 —— 直接说"不能对自己做",不绕圈子
 * 2. 目标不是自己,但他是**最后一个启用中的管理员** —— 那降级/停用他就等于关门
 *
 * 判据是"启用中的管理员"而不是"管理员":一个被停用的 admin 顶不上用,把他算进去
 * 会让这个哨兵给出虚假的安全感。
 */
async function guardLastAdmin(
  targetId: number,
  operatorId: number,
  verb: string,
): Promise<Response | null> {
  const target = await findUser(targetId);
  if (!target || target.role !== 'admin' || target.status !== 'active') return null;

  if (targetId === operatorId) {
    return fail(`不能${verb}自己的账号 —— 换个管理员来操作`);
  }

  const admins = await countActiveAdmins();
  if (admins <= 1) {
    return fail(`这是唯一一个启用中的管理员,${verb}他就没人能进后台了`);
  }

  return null;
}
