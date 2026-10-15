/**
 * 服务端配置。**只在 `prerender = false` 的路由里 import。**
 *
 * ## 为什么用 `process.loadEnvFile()` 而不是 dotenv
 *
 * 那是 Node 内置的(20.12 起),而 `engines` 钉在 `>=22.12`、CI 也钉在 Node 22
 * —— 于是这件事**不需要加第三个运行期依赖**。仓库现在只有两个(`astro` 与
 * `@astrojs/sitemap`),这个风格值得保住。
 *
 * ## 为什么读 `process.env` 而不是 `import.meta.env`
 *
 * `import.meta.env.X` 在 Astro 里是**构建期常量替换**,值会被打进服务端 bundle
 * —— 也就是说数据库口令会在 `npm run build` 那一刻被烤进产物,改配置要重新构建,
 * 而且产物里躺着口令。`process.env` 是**运行期**读的,改 `.env` 重启即可。
 *
 * ## `.env` 在哪
 *
 * `process.loadEnvFile()` 不带参数时读 `path.resolve(process.cwd(), '.env')`,
 * 也就是**进程的工作目录**。`npm run dev` / `preview` 都在仓库根下跑,所以没问题;
 * 但把 standalone 产物部署到服务器时,**必须在产物根目录起进程**(或者改用绝对
 * 路径),否则它会在别处找一个不存在的 `.env`,而那种失败是静默的 —— 所有配置
 * 都退回默认值,连不上库时报的错也只会说"连不上",不会说"我没读到配置"。
 */

try {
  process.loadEnvFile();
} catch {
  /*
   * `.env` 不存在是**正常状态**,不是错误:`.env` 在 `.gitignore` 里,新克隆的
   * 仓库本来就没有它,CI 里也没有。所以这里不能抛 —— 抛了的话整个站连静态页
   * 都起不来,而那和配置无关。
   *
   * 真缺配置时的表现是"连不上数据库",那条路径由 `db.ts` 给出一句人话。
   */
}

function readString(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  // 配置写坏了(比如端口写成 `3306 `之外的什么)就退回默认值并**在日志里说一句**
  // —— 静默用默认值会让"为什么连的是别的库"变成一个查不出来的问题
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    console.warn(`[env] ${name}=${raw} 不是整数,已退回默认值 ${fallback}`);
    return fallback;
  }
  return value;
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return raw === 'true' || raw === '1';
}

export const env = {
  db: {
    host: readString('DB_HOST', '127.0.0.1'),
    port: readInt('DB_PORT', 3306),
    user: readString('DB_USER', 'root'),
    password: readString('DB_PASSWORD', ''),
    database: readString('DB_NAME', 'mouse_test'),
    /*
     * 一个连接池就够:这是单进程的演示级后台,并发是"管理员点一下"这个量级。
     * 上限给 10 是为了**别把 MySQL 默认的 151 个连接占满** —— 本地开发时同一台
     * 机器上往往还开着别的项目。
     */
    connectionLimit: readInt('DB_POOL_LIMIT', 10),
  },

  /** 登录 cookie 的名字。带前缀是为了不和同域下别的东西撞。 */
  sessionCookie: readString('SESSION_COOKIE', 'mouse_test_session'),

  /** 登录态有效期。默认 7 天。 */
  sessionTtlMs: readInt('SESSION_TTL_HOURS', 24 * 7) * 3600 * 1000,

  /*
   * **默认 false,这一条是刻意的。**
   *
   * 本地 `astro dev` 与 `astro preview` 都是 http,而带 `Secure` 的 cookie 在
   * http 下**浏览器根本不会存** —— 表现是"登录成功但立刻又变成未登录",而且
   * 服务端日志里一个字都没有。所以默认关掉,上线换成 https 时在 `.env` 里打开。
   *
   * 部署到 HTTPS 之后**必须**设成 `true`:不带 Secure 的会话 cookie 会在明文
   * 连接上被发出去。
   */
  cookieSecure: readBool('COOKIE_SECURE', false),

  /** 首次启动播种管理员用。留空就不播种(绝不会有一个默认口令)。 */
  admin: {
    username: readString('ADMIN_USERNAME', ''),
    password: readString('ADMIN_PASSWORD', ''),
  },
} as const;
