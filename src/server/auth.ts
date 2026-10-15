/**
 * 登录、会话与角色守卫。
 *
 * ## 为什么会话存库,而不是签一个自包含的 token
 *
 * 自包含签名(JWT 那一路)不需要查库,代价是**签出去就收不回来** —— 想踢一个
 * 账号下线,只能等它自己过期。后台里"把这个账号停掉"是一个真会用到的手势,
 * 所以这里的取舍很明确:多一次查库,换来能吊销。
 *
 * ## 角色守卫分两层,而且第二层不是多余的
 *
 * `requireUser()` 问的是"你是登录过的谁";`requireAdmin()` 问的是"你是不是管理员"。
 * 一个**普通用户**账号能通过第一层 —— 所以后台的每一页必须调的是第二层。
 * "登录即可进后台"是这类系统最常见的一个窟窿,而它不会报任何错。
 *
 * 另外 `readSession()` 每次都会**重新查一遍 `status`**:管理员在后台停掉一个
 * 账号之后,那个人**当前那个会话立刻失效**,不需要等他重新登录。这一条是刻意
 * 的 —— 只查一次角色、之后信任 cookie 的话,停用按钮就只是个装饰品。
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import type { RowDataPacket } from 'mysql2/promise';
import { env } from './env';
import { execute, query } from './db';
import { hashPassword, verifyPassword } from '../lib/password';
import { createLoginThrottle } from '../lib/login-throttle';
import { href } from '../lib/url';

export type Role = 'user' | 'admin';

export interface SessionUser {
  id: number;
  username: string;
  role: Role;
  /** 这一轮会话的 token —— 注销时要用它把库里那一行删掉 */
  token: string;
  /** 每个会话一枚,渲染进表单的隐藏域 */
  csrfToken: string;
  expiresAt: string;
}

/*
 * 行类型都 `extends RowDataPacket`。这不是装饰:mysql2 的 `query()` 上挂着一个
 * `T extends RowDataPacket[]` 的约束(`RowDataPacket` 自己的 `constructor.name`
 * 被钉成了字面量 `'RowDataPacket'`),一个**独立定义的接口是不满足它的** ——
 * 不继承的话,`query<SessionRow[]>` 会在类型检查这一关就红。
 */
interface SessionRow extends RowDataPacket {
  id: number;
  username: string;
  role: Role;
  status: 'active' | 'disabled';
  token: string;
  csrf_token: string;
  expires_at: string;
}

interface CredentialRow extends RowDataPacket {
  id: number;
  password_hash: string;
  status: 'active' | 'disabled';
}

/** 登录页的地址。走 `href()` 拼 base —— 写死 `/login` 在子路径部署下就是 404 */
export function loginUrl(): string {
  return href('login/');
}

/** 后台首页 */
export function adminUrl(): string {
  return href('admin/');
}

/*
 * 接口地址也走 `href()`。**这是那个坑最容易复发的形状**:`<form action="/api/auth/login">`
 * 看着天经地义,而站点在 `/mouse-test` 子路径上 —— 它会 POST 到别的站的根路径
 * 去,构建不报错,点下去才 404。所以地址一律从函数来,页面里不出现字面量。
 */
export function loginEndpoint(): string {
  return href('api/auth/login');
}

export function logoutEndpoint(): string {
  return href('api/auth/logout');
}

export function homeUrl(): string {
  return href();
}

function tokenHex(): string {
  return randomBytes(32).toString('hex');
}

/*
 * 防爆破:同一个用户名连续失败 5 次,锁 60 秒。
 *
 * **判断住在 `lib/login-throttle.ts` 里**(纯逻辑、时钟注入、有单测),这里只持有
 * 一个进程级的实例。原来的那几行就写在这个文件里 —— 而 `auth.ts` import 了
 * `db.ts` / `mysql2`,于是 `tests/` 那套纯 node 环境一行都测不到它。测不到的那段
 * 恰好出过一次**静默**的 bug:判断"锁过期没有"的写法把还在累计的计数一起删了,
 * 连打多少次都锁不上,却不报错、不打日志。搬走就是为了能把它钉住。
 *
 * 仍旧如实记着的一条限制:这张表住在**进程内存**里,只挡得住单进程,重启即清。
 * 演示规模够用;要顶住分布式撞库得把计数放进 Redis。
 */
const throttle = createLoginThrottle();

/**
 * 一个假口令哈希,用来在"用户不存在"时**照样跑一遍 scrypt**。
 *
 * 不这么做的话,"用户不存在"会立刻返回,而"口令错"要等 ~50ms —— 攻击者拿响应
 * 时间就能把哪些用户名存在**一个一个问出来**。代价是每次登录失败都多算一次
 * scrypt,而那正是我们想要的成本。
 */
let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(tokenHex());
  return dummyHash;
}

export interface NewSession {
  token: string;
  csrfToken: string;
  expiresAt: Date;
}

export async function createSession(userId: number): Promise<NewSession> {
  const token = tokenHex();
  const csrfToken = tokenHex();
  const expiresAt = new Date(Date.now() + env.sessionTtlMs);

  /*
   * 顺手清一次过期会话。放在这里而不是定时任务里,是因为这一层没有"启动钩子"
   * 可用(见 `db.ts` 的注释),而登录是这张表唯一会增长的地方 —— 在增长的
   * 地方做清理,规模就永远是"当前活着的会话数"。
   */
  await execute('DELETE FROM sessions WHERE expires_at < NOW()');
  await execute(
    'INSERT INTO sessions (token, user_id, csrf_token, expires_at) VALUES (?, ?, ?, ?)',
    [token, userId, csrfToken, expiresAt],
  );
  return { token, csrfToken, expiresAt };
}

export async function destroySession(token: string): Promise<void> {
  await execute('DELETE FROM sessions WHERE token = ?', [token]);
}

/**
 * 读出当前会话。**读不到、过期、账号被停用,一律返回 `null`** ——
 * 三种情况在调用方看来是同一件事:你没登录。
 */
export async function readSession(cookies: AstroCookies): Promise<SessionUser | null> {
  const token = cookies.get(env.sessionCookie)?.value;
  if (!token) return null;

  const rows = await query<SessionRow[]>(
    `SELECT u.id, u.username, u.role, u.status, s.token, s.csrf_token, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > NOW()`,
    [token],
  );
  const row = rows[0];
  if (!row) return null;

  if (row.status !== 'active') {
    // 账号被停用:当场把这一轮会话删掉,别让它继续在库里躺着
    await destroySession(token);
    return null;
  }

  return {
    id: Number(row.id),
    username: String(row.username),
    role: row.role,
    token: row.token,
    csrfToken: row.csrf_token,
    expiresAt: String(row.expires_at),
  };
}

/** 写会话 cookie。`Secure` 由 `.env` 决定 —— 本地 http 下带上它,浏览器根本不存。 */
export function attachSessionCookie(cookies: AstroCookies, session: NewSession): void {
  cookies.set(env.sessionCookie, session.token, {
    path: href(),
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    expires: session.expiresAt,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(env.sessionCookie, {
    path: href(),
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
  });
}

export type LoginResult = { ok: true; session: NewSession } | { ok: false; error: string };

export async function login(username: string, password: string): Promise<LoginResult> {
  const lockedFor = throttle.lockedFor(username);
  if (lockedFor > 0) {
    const seconds = Math.ceil(lockedFor / 1000);
    return { ok: false, error: `尝试次数太多,请 ${seconds} 秒后再试` };
  }

  const rows = await query<CredentialRow[]>(
    'SELECT id, password_hash, status FROM users WHERE username = ?',
    [username],
  );
  const row = rows[0];

  if (!row) {
    // 用户不存在也照样算一遍 scrypt,别让响应时间把用户名暴露出去
    await verifyPassword(password, await getDummyHash());
    throttle.noteFailure(username);
    return { ok: false, error: '用户名或密码不对' };
  }

  const passed = await verifyPassword(password, String(row.password_hash));
  if (!passed) {
    throttle.noteFailure(username);
    return { ok: false, error: '用户名或密码不对' };
  }

  // 口令对但账号被停用 —— 给的提示和口令错一样,不额外泄露"这个号存在"
  if (row.status !== 'active') {
    throttle.noteFailure(username);
    return { ok: false, error: '用户名或密码不对' };
  }

  throttle.clear(username);
  const session = await createSession(Number(row.id));
  await execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [Number(row.id)]);
  return { ok: true, session };
}

/**
 * 校验表单里的 CSRF 令牌。
 *
 * **比的是会话那一枚,不是"有没有填"。** 每个会话一枚令牌,所以"换个会话"必然
 * "换个令牌" —— 攻击者拿到的旧令牌在一个新会话里没有用。
 *
 * 用 `timingSafeEqual` 而不是 `===`:长度不等时它会抛,所以先比长度(长度本来
 * 就是从表单里看得见的,不算泄露)。
 */
export function verifyCsrf(user: SessionUser | null, submitted: unknown): boolean {
  if (!user) return false;
  const value = String(submitted ?? '');
  if (value.length !== user.csrfToken.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(user.csrfToken));
}

/** 登录过的谁。**能通过这一层的不一定是管理员。** */
export async function requireUser(cookies: AstroCookies): Promise<SessionUser | null> {
  return readSession(cookies);
}

/** 只放管理员进来。后台每一页都必须调这个,而不是 `requireUser`。 */
export async function requireAdmin(cookies: AstroCookies): Promise<SessionUser | null> {
  const user = await readSession(cookies);
  return user && user.role === 'admin' ? user : null;
}

/**
 * 从 `locals` 里取当前管理员。**取不到就抛,不返回 `null`。**
 *
 * 中间件拦在路由之前(见 `src/middleware.ts`),所以后台页面里这一句必然成功。
 * 之所以让它抛而不是让调用方判空:真走到"没有用户"那一步,说明**这个页面没有被
 * 中间件覆盖**,那是一个编程错误,不是一种运行状态。返回 `null` 的话,每个页面都
 * 得写一句"判空之后干嘛" —— 而那种分支写出来也是死代码,还会让人以为"没登录"
 * 是一种正常情况。
 */
export function localAdmin(locals: App.Locals): SessionUser {
  if (!locals.user) {
    throw new Error('这个页面没有被中间件守卫 —— 见 src/middleware.ts');
  }
  return locals.user;
}
