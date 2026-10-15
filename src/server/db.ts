/**
 * MySQL 连接池 + **懒启动**(迁移与播种)。
 *
 * ## 为什么是懒启动,以及它什么时候不该用
 *
 * Astro 的服务端没有"进程启动"这个钩子 —— 造一个出来要挂 adapter 的钩子,而那
 * 会把这一层和框架的版本绑在一起。懒启动是:第一次有人取连接时,先 await 一个
 * promise,它做完迁移和播种就把自己标记成完成,之后每次调用只是看一眼状态。
 *
 * 代价是**第一个请求会慢一点**(它要建表),而且数据库连不上时每个路由都会
 * 500(而不是启动时就崩)。演示规模下这两条都可以接受。
 *
 * **生产环境应该显式跑迁移**,而不是让第一个访客替你把表建出来 ——
 * 那意味着线上库的结构是由"谁先访问"决定的。真要那么做时,把
 * `ensureReady()` 提到一个 `npm run db:migrate` 脚本里即可,函数本身不用改。
 *
 * ## 裸 SQL,不上 ORM
 *
 * 这是 PLAN 定的,理由有两条而且都不是洁癖:仓库到现在只有两个运行期依赖;
 * 而且**裸 SQL 直接贴进论文附录比 ORM 生成的查询强** —— 附录里要让人看懂
 * "这条统计是怎么算出来的"。
 */

import { createPool } from 'mysql2/promise';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { env } from './env';
import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations';
import { hashPassword } from '../lib/password';

let pool: Pool | undefined;
let bootstrapped: Promise<void> | undefined;

function getPool(): Pool {
  pool ??= createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    connectionLimit: env.db.connectionLimit,
    /*
     * 时间日期一律取原始字符串,不让驱动转成 JS `Date`。
     *
     * 转成 `Date` 会带进时区:驱动按连接时区解释,而 JS 按本地时区渲染,于是
     * "今天"这个词在两边可能不是同一天 —— 而 AD 统计那一页整张表的粒度就是
     * "天"。取字符串则"库里存的是什么、页面上显示的就是什么"。
     */
    dateStrings: true,
    /*
     * **显式声明 utf8mb4,不靠驱动的默认值。**
     *
     * `mysql2` 的默认连接字符集是 `UTF8_GENERAL_CI`,那是 **utf8mb3** —— 三个字节
     * 以内的字符(汉字都算)没问题,但**四个字节的字符(emoji、部分生僻字)会被
     * 丢掉或者直接报错**。而广告的标题与说明是管理员手输的自由文本,往里粘一个
     * emoji 是完全正常的事;表本身建的就是 utf8mb4,连接这一侧不对齐,
     * 就等于留了一个"某些字存进去会坏"的角落。
     *
     * 实测过一次:中文往返是好的(所以这个坑不会在普通演示里露出来),
     * 正是那种"平时看不出、出事时查不到"的类型。
     */
    charset: 'utf8mb4',
    // 一次插入多行时希望拿到 insertId,其余默认即可
    namedPlaceholders: false,
  });
  return pool;
}

async function migrate(connection: Pool): Promise<void> {
  await connection.query(MIGRATIONS_TABLE);
  const [rows] = await connection.query<RowDataPacket[]>('SELECT version FROM schema_migrations');
  const applied = new Set(rows.map((row) => String(row.version)));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    for (const statement of migration.statements) {
      await connection.query(statement);
    }
    await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', [migration.version]);
    console.info(`[db] 已应用迁移 ${migration.version}`);
  }
}

/**
 * 首次启动时,如果**一个用户都没有**,就拿 `.env` 里的 `ADMIN_USERNAME` /
 * `ADMIN_PASSWORD` 建一个管理员。
 *
 * 三条约束,少一条都不行:
 *
 * 1. **只在表为空时建。** 否则每次重启都会往库里塞一个新管理员。
 * 2. **`.env` 没给就不建,只在日志里说一句。** 一个"默认口令"是这类后台最典型
 *    的窟窿 —— 上线忘关,全世界都知道密码。
 * 3. 建出来的口令走正常的 `hashPassword`,不存明文。
 */
async function seed(connection: Pool): Promise<void> {
  const [rows] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) AS n FROM users');
  const count = Number(rows[0]?.n ?? 0);
  if (count > 0) return;

  if (!env.admin.username || !env.admin.password) {
    console.warn(
      '[db] users 表是空的,而 .env 里没有 ADMIN_USERNAME / ADMIN_PASSWORD —— 没有建管理员。\n' +
        '     填好这两项再重启,或者用 SQL 手工插一个。',
    );
    return;
  }

  const hash = await hashPassword(env.admin.password);
  await connection.query('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)', [
    env.admin.username,
    hash,
    'admin',
    'active',
  ]);
  console.info(`[db] 已建立初始管理员 ${env.admin.username}`);
}

async function bootstrap(): Promise<void> {
  const connection = getPool();
  try {
    await migrate(connection);
    await seed(connection);
  } catch (error) {
    /*
     * 把"连不上"翻译成一句能照着做的话。
     *
     * 原文是 `connect ECONNREFUSED 127.0.0.1:3306` 这类,它没有说清"该去改哪儿"
     * —— 而真实原因十有八九就那三个:MySQL 没起、`.env` 没填、库还没建。
     */
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `连接或初始化 MySQL 失败(${env.db.user}@${env.db.host}:${env.db.port}/${env.db.database})。\n` +
        `原始错误:${detail}\n` +
        '检查三件事:MySQL 服务在跑吗、`.env` 填了吗、库建了吗(见 .env.example 顶上那几条 SQL)。',
      { cause: error },
    );
  }
}

/**
 * 保证库结构就绪。所有读写都必须先 await 它 —— `query()` / `execute()` 已经
 * 代劳了,直接用那两个。
 */
export function ensureReady(): Promise<void> {
  // 只跑一次:失败也不重试,因为失败的原因(连不上/没配)不会因为重试就好
  bootstrapped ??= bootstrap();
  return bootstrapped;
}

/**
 * 查一批行。
 *
 * 泛型默认是 `RowDataPacket[]`,调用方传自己那一行的形状即可:
 * `query<{ n: number } & RowDataPacket>(...)`。
 */
export async function query<T extends RowDataPacket[]>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<T> {
  await ensureReady();
  const [rows] = await getPool().query<T>(sql, params as unknown[]);
  return rows;
}

/** 执行一条写语句,拿回 `affectedRows` / `insertId`。 */
export async function execute(
  sql: string,
  params: readonly unknown[] = [],
): Promise<ResultSetHeader> {
  await ensureReady();
  const [result] = await getPool().query<ResultSetHeader>(sql, params as unknown[]);
  return result;
}

/** 数据库是否连得上。给 `/api/health` 用。 */
export async function ping(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await ensureReady();
    await getPool().query('SELECT 1');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
