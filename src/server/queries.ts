/**
 * 后台各页要用的查询。**SQL 全部集中在这一个文件里**,不散进页面和接口 ——
 * 那样"这两页算的到底是不是同一个数"就没有第二个地方可以查。
 *
 * 这一层只做"取数",不做判断:校验在 `lib/admin-form.ts`(纯函数、有单测),
 * 会话与角色在 `server/auth.ts`。所以这里每个函数都可以被页面直接调用。
 */

import type { RowDataPacket } from 'mysql2/promise';
import { execute, query } from './db';
import type { AdInput } from '../lib/admin-form';
import type { AdRecord, AdSlot } from '../lib/ads';
import type { Role } from './auth';

/* ------------------------------------------------------------------ 用户 */

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  role: Role;
  status: 'active' | 'disabled';
  created_at: string;
  last_login_at: string | null;
}

export interface AdminUser {
  id: number;
  username: string;
  role: Role;
  status: 'active' | 'disabled';
  createdAt: string;
  lastLoginAt: string | null;
}

export async function listUsers(): Promise<AdminUser[]> {
  const rows = await query<UserRow[]>(
    'SELECT id, username, role, status, created_at, last_login_at FROM users ORDER BY id',
  );
  return rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    role: row.role,
    status: row.status,
    createdAt: String(row.created_at),
    lastLoginAt: row.last_login_at === null ? null : String(row.last_login_at),
  }));
}

interface CountRow extends RowDataPacket {
  n: number;
}

/** 还活着(未停用)的管理员有几个。**改角色和停用之前都要先问这一句。** */
export async function countActiveAdmins(): Promise<number> {
  const rows = await query<CountRow[]>(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'",
  );
  return Number(rows[0]?.n ?? 0);
}

export async function findUser(id: number): Promise<AdminUser | null> {
  const rows = await query<UserRow[]>(
    'SELECT id, username, role, status, created_at, last_login_at FROM users WHERE id = ?',
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    username: String(row.username),
    role: row.role,
    status: row.status,
    createdAt: String(row.created_at),
    lastLoginAt: row.last_login_at === null ? null : String(row.last_login_at),
  };
}

export async function createUser(username: string, passwordHash: string, role: Role): Promise<number> {
  const result = await execute(
    'INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)',
    [username, passwordHash, role, 'active'],
  );
  return Number(result.insertId);
}

export async function setUserRole(id: number, role: Role): Promise<void> {
  await execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
}

export async function setUserStatus(id: number, status: 'active' | 'disabled'): Promise<void> {
  await execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
  /*
   * **停用之后要顺手把这个人现有的会话删掉。**
   *
   * `readSession()` 每次都会重新查 `status`,所以即使不删也拦得住 —— 但那意味着
   * 库里躺着一堆"登录着但用不了"的行,而且它们会一直占到 cookie 过期。删掉更干净:
   * 停用这个动作的语义就是"立刻下线"。
   */
  if (status === 'disabled') {
    await execute('DELETE FROM sessions WHERE user_id = ?', [id]);
  } else {
    // 反过来:重新启用时**不**恢复会话,他得重新登录一次
  }
}

export async function setUserPassword(id: number, passwordHash: string): Promise<void> {
  await execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  // 改了密码就该把所有已登录的会话踢掉 —— 否则"改密码"挡不住已经拿到会话的人
  await execute('DELETE FROM sessions WHERE user_id = ?', [id]);
}

/* ------------------------------------------------------------------ 广告 */

interface AdRow extends RowDataPacket {
  id: number;
  slot: string;
  title: string;
  body: string;
  url: string;
  weight: number;
  active: number;
}

function toAd(row: AdRow): AdRecord {
  return {
    id: Number(row.id),
    // 库里可能存着一个已经不在 `AD_SLOTS` 里的槽位(旧数据),那种行不该让
    // 整张列表崩掉,所以按字符串收下,由过滤那一侧决定要不要用它
    slot: String(row.slot) as AdSlot,
    title: String(row.title),
    body: String(row.body),
    url: String(row.url),
    weight: Number(row.weight),
    active: Number(row.active) === 1,
  };
}

export async function listAds(): Promise<AdRecord[]> {
  const rows = await query<AdRow[]>(
    'SELECT id, slot, title, body, url, weight, active FROM ads ORDER BY slot, id',
  );
  return rows.map(toAd);
}

export async function findAd(id: number): Promise<AdRecord | null> {
  const rows = await query<AdRow[]>(
    'SELECT id, slot, title, body, url, weight, active FROM ads WHERE id = ?',
    [id],
  );
  return rows[0] ? toAd(rows[0]) : null;
}

/** 某个槽位**此刻**在投的那些。按权重挑是在 `lib/ads.ts` 的纯函数里做的。 */
export async function adsForSlot(slot: AdSlot): Promise<AdRecord[]> {
  const rows = await query<AdRow[]>(
    'SELECT id, slot, title, body, url, weight, active FROM ads WHERE slot = ? AND active = 1',
    [slot],
  );
  return rows.map(toAd);
}

export async function createAd(input: AdInput): Promise<number> {
  const result = await execute(
    'INSERT INTO ads (slot, title, body, url, weight, active) VALUES (?, ?, ?, ?, ?, 1)',
    [input.slot, input.title, input.body, input.url, input.weight],
  );
  return Number(result.insertId);
}

export async function updateAd(id: number, input: AdInput): Promise<void> {
  await execute('UPDATE ads SET slot = ?, title = ?, body = ?, url = ?, weight = ? WHERE id = ?', [
    input.slot,
    input.title,
    input.body,
    input.url,
    input.weight,
    id,
  ]);
}

export async function setAdActive(id: number, active: boolean): Promise<void> {
  await execute('UPDATE ads SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
}

export async function deleteAd(id: number): Promise<void> {
  // `ad_events` 那边有 ON DELETE CASCADE,所以统计一起走
  await execute('DELETE FROM ads WHERE id = ?', [id]);
}

/* -------------------------------------------------------------- 广告统计 */

export async function recordAdEvent(adId: number, kind: 'impression' | 'click'): Promise<void> {
  /*
   * **一次事件一条 upsert,不是一行。** `(ad_id, kind, 今天)` 撞上唯一键就自增 ——
   * 于是这张表的规模是 `广告数 × 2 × 天数`,和访客量无关。
   *
   * `CURDATE()` 用的是**数据库服务器的日期**,不是访客的。所以"今天"这条线在
   * 跨时区时会有一点偏移 —— 这里接受,因为这一页看的是趋势,不是精确到某一刻的
   * 计数,而"按访客本地日期分段"要额外存时区(那反而离"时间只到天"的隐私承诺更远)。
   */
  await execute(
    `INSERT INTO ad_events (ad_id, kind, day, count) VALUES (?, ?, CURDATE(), 1)
       ON DUPLICATE KEY UPDATE count = count + 1`,
    [adId, kind],
  );
}

export interface DailyPoint {
  day: string;
  impressions: number;
  clicks: number;
}

interface DailyRow extends RowDataPacket {
  day: string;
  impressions: number;
  clicks: number;
}

/**
 * 最近 `days` 天的曝光与点击。
 *
 * **返回的是补齐过的连续日期**,不是库里那几行 —— 中间没有数据的日子必须出现
 * 且为 0,否则折线会把两个相隔很远的点直接连起来,读起来像"那天有数据"。
 * 补零放在这里而不是图表组件里:那样图表组件只管画,不掺业务判断。
 */
export async function adDailyStats(days: number): Promise<DailyPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));

  const rows = await query<DailyRow[]>(
    `SELECT day,
            SUM(CASE WHEN kind = 'impression' THEN count ELSE 0 END) AS impressions,
            SUM(CASE WHEN kind = 'click'      THEN count ELSE 0 END) AS clicks
       FROM ad_events
      WHERE day >= ?
      GROUP BY day
      ORDER BY day`,
    [formatDay(since)],
  );

  const byDay = new Map(rows.map((row) => [String(row.day), row]));
  const series: DailyPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = formatDay(date);
    const row = byDay.get(key);
    series.push({
      day: key,
      impressions: Number(row?.impressions ?? 0),
      clicks: Number(row?.clicks ?? 0),
    });
  }
  return series;
}

/**
 * 本地日期串 `YYYY-MM-DD`。
 *
 * **不用 `toISOString()`** —— 它按 UTC 切,在东八区的晚上会给出"昨天"。
 * `dateStrings: true`(见 `db.ts`)让库里那边也是同一套口径,两边就对得上了。
 */
function formatDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/* ------------------------------------------------------------------ 概览 */

export interface Overview {
  users: number;
  activeAdmins: number;
  disabledUsers: number;
  ads: number;
  activeAds: number;
  todayImpressions: number;
  todayClicks: number;
}

export async function overview(): Promise<Overview> {
  const [users, admins, disabled, ads, activeAds, today] = await Promise.all([
    query<CountRow[]>('SELECT COUNT(*) AS n FROM users'),
    countActiveAdmins(),
    query<CountRow[]>("SELECT COUNT(*) AS n FROM users WHERE status = 'disabled'"),
    query<CountRow[]>('SELECT COUNT(*) AS n FROM ads'),
    query<CountRow[]>('SELECT COUNT(*) AS n FROM ads WHERE active = 1'),
    query<DailyRow[]>(
      `SELECT SUM(CASE WHEN kind = 'impression' THEN count ELSE 0 END) AS impressions,
              SUM(CASE WHEN kind = 'click'      THEN count ELSE 0 END) AS clicks
         FROM ad_events WHERE day = CURDATE()`,
    ),
  ]);

  return {
    users: Number(users[0]?.n ?? 0),
    activeAdmins: admins,
    disabledUsers: Number(disabled[0]?.n ?? 0),
    ads: Number(ads[0]?.n ?? 0),
    activeAds: Number(activeAds[0]?.n ?? 0),
    // SUM 在没有行时给的是 NULL,不是 0 —— `?? 0` 那一步是必须的
    todayImpressions: Number(today[0]?.impressions ?? 0),
    todayClicks: Number(today[0]?.clicks ?? 0),
  };
}

export interface RoleBreakdown {
  role: Role;
  status: 'active' | 'disabled';
  count: number;
}

interface BreakdownRow extends RowDataPacket {
  role: Role;
  status: 'active' | 'disabled';
  n: number;
}

export async function userBreakdown(): Promise<RoleBreakdown[]> {
  const rows = await query<BreakdownRow[]>(
    'SELECT role, status, COUNT(*) AS n FROM users GROUP BY role, status ORDER BY role, status',
  );
  return rows.map((row) => ({ role: row.role, status: row.status, count: Number(row.n) }));
}

/* -------------------------------------------------------------- 页面浏览 */

/**
 * 记一次浏览。**一次访问一条 upsert**,和广告那张表同一个写法。
 *
 * `path` 必须**已经过白名单**(`lib/page-views.ts` 的 `isCountablePath`)—— 这个
 * 函数自己不再判一次,因为那一层判断有单测而这里没有;两处各判一半反而容易
 * 让人觉得"这里安全"。**调用点只有一个**:`api/view.ts`。
 */
export async function recordPageView(path: string): Promise<void> {
  await execute(
    `INSERT INTO page_views (day, path, count) VALUES (CURDATE(), ?, 1)
       ON DUPLICATE KEY UPDATE count = count + 1`,
    [path],
  );
}

export interface PageViewSummary {
  today: number;
  total: number;
}

/** 今日与最近 `days` 天的浏览量合计。 */
export async function pageViewSummary(days: number): Promise<PageViewSummary> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));

  const [today, total] = await Promise.all([
    query<CountRow[]>('SELECT COALESCE(SUM(count), 0) AS n FROM page_views WHERE day = CURDATE()'),
    query<CountRow[]>('SELECT COALESCE(SUM(count), 0) AS n FROM page_views WHERE day >= ?', [
      formatDay(since),
    ]),
  ]);

  return { today: Number(today[0]?.n ?? 0), total: Number(total[0]?.n ?? 0) };
}

export interface ToolViewRow {
  path: string;
  today: number;
  total: number;
}

interface ToolViewDbRow extends RowDataPacket {
  path: string;
  today: number;
  total: number;
}

/**
 * 逐页的浏览量,按最近这段时期的总数从多到少排。
 *
 * **只返回库里真有的行**,不补零:没被看过的工具不必在表里占一行"0" —— 那和
 * 首页那条「没数据不画空槽」是一个意思,一行 0 会被读成"这一页坏了"。
 */
export async function pageViewsByTool(days: number): Promise<ToolViewRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));

  const rows = await query<ToolViewDbRow[]>(
    `SELECT path,
            SUM(CASE WHEN day = CURDATE() THEN count ELSE 0 END) AS today,
            SUM(count) AS total
       FROM page_views
      WHERE day >= ?
      GROUP BY path
      ORDER BY total DESC, path`,
    [formatDay(since)],
  );

  return rows.map((row) => ({
    path: String(row.path),
    today: Number(row.today ?? 0),
    total: Number(row.total ?? 0),
  }));
}
