/**
 * 建表语句。**写成 TS 的字符串常量,不写成 `.sql` 文件。**
 *
 * 理由是部署:`@astrojs/node` 的 standalone 产物里只有 bundle,`src/` 下的
 * `.sql` 文件**不会跟着过去** —— 用 `readFileSync` 读它,在本地一切正常,
 * 上了服务器就静默找不到。字符串常量跟着 bundle 走,没有这个问题。
 *
 * ## 怎么加一条新的
 *
 * 往数组**末尾**追加一条,`version` 取一个没被用过的字符串,永不修改已发布过的
 * 条目 —— 已经跑过的会被 `schema_migrations` 挡住,改它等于让新老机器的表结构
 * 分家。删除列、改列类型这类操作在 MySQL 里单条语句就能做,不需要额外机制。
 *
 * ## 一个已知的粗糙处
 *
 * MySQL 的 DDL 是**自动提交**的,所以一条多语句的迁移跑到一半失败(比如第 3 条
 * 建表报错),前两条已经生效、`schema_migrations` 里却没有记录 —— 重跑会撞上
 * "表已存在"。演示规模下这个风险可以接受(手一滑重来即可),但**它不是没有**,
 * 所以每条语句都写成 `CREATE TABLE IF NOT EXISTS`:重跑时已经建好的直接跳过,
 * 于是这一类失败是**幂等可重试的**。
 */

export interface Migration {
  version: string;
  statements: readonly string[];
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: '001_init',
    statements: [
      /*
       * 用户。`role` 与 `status` 都用 ENUM 而不是 VARCHAR —— 取值域是封闭的
       * (两个角色、两种状态),让数据库来挡住拼错的字符串比在应用层到处判更省事。
       *
       * `password_hash` 存**一整串** `scrypt$N$r$p$盐$散列`(见 `lib/password.ts`)。
       * PLAN 草案里是分成 `password_hash` + `salt` 两列,这里没有采纳:分开存等于
       * 把 scrypt 参数变成"全表一个值",以后调参数时老口令会一起作废。
       */
      `CREATE TABLE IF NOT EXISTS users (
         id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
         username      VARCHAR(32)  NOT NULL,
         password_hash VARCHAR(255) NOT NULL,
         role          ENUM('user','admin')      NOT NULL DEFAULT 'user',
         status        ENUM('active','disabled') NOT NULL DEFAULT 'active',
         created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         last_login_at DATETIME NULL,
         PRIMARY KEY (id),
         UNIQUE KEY uk_users_username (username)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

      /*
       * 会话。**存库而不是签成一个自包含的 token**,为的是能吊销 ——
       * "把这个账号踢下线"在后台是一个真会用到的手势,而自包含签名做不到。
       *
       * `csrf_token` 跟着会话走:它和会话同生共死,所以"换了会话"必然"换了令牌"。
       * 外键带 `ON DELETE CASCADE`,删用户时会话自动清掉(否则会留下一堆指不到
       * 人的行,而 `readSession` 的 JOIN 会把它们静静滤掉 —— 那就成了查不出来的垃圾)。
       */
      `CREATE TABLE IF NOT EXISTS sessions (
         token      CHAR(64) NOT NULL,
         user_id    BIGINT UNSIGNED NOT NULL,
         csrf_token CHAR(64) NOT NULL,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         expires_at DATETIME NOT NULL,
         PRIMARY KEY (token),
         KEY idx_sessions_user (user_id),
         KEY idx_sessions_expires (expires_at),
         CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

      /*
       * 广告。`slot` 的取值域住在代码里(`lib/ads.ts` 的 `AD_SLOTS`),**不加
       * 外键也不加 CHECK** —— 槽位是一个会变的产品概念(加一张新页面就可能多一个
       * 槽位),把它焊进数据库意味着每次加槽位都要写一条迁移。校验在
       * `admin-form.ts` 那一层做,取广告时按 slot 过滤。
       *
       * `(slot, active)` 这条索引是给公开接口那条查询用的:`WHERE slot = ? AND active = 1`。
       */
      `CREATE TABLE IF NOT EXISTS ads (
         id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
         slot       VARCHAR(32)  NOT NULL,
         title      VARCHAR(80)  NOT NULL,
         body       VARCHAR(200) NOT NULL,
         url        VARCHAR(500) NOT NULL,
         weight     INT UNSIGNED NOT NULL DEFAULT 1,
         active     TINYINT(1)   NOT NULL DEFAULT 1,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (id),
         KEY idx_ads_slot_active (slot, active)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

      /*
       * 广告的曝光与点击。**注意它是"按天计数的行",不是"一次一行的事件"。**
       *
       * 唯一键 `(ad_id, kind, day)` 配 `INSERT ... ON DUPLICATE KEY UPDATE count = count + 1`:
       * 一次曝光一条 upsert,这张表永远只有 `广告数 × 2 × 天数` 行。不这么做的话,
       * 一次页面浏览就是一行,几周之内表就大到需要归档 —— 而这一页要的从来只是
       * 一条按天的曲线。
       *
       * 这同时把 PLAN 的隐私红线("时间只到天")**落进了表结构**:这张表里根本没有
       * 存得下"谁、在几点几分、从哪个 IP"的地方。`day` 是 DATE 不是 DATETIME。
       */
      `CREATE TABLE IF NOT EXISTS ad_events (
         id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
         ad_id BIGINT UNSIGNED NOT NULL,
         kind  ENUM('impression','click') NOT NULL,
         day   DATE NOT NULL,
         count INT UNSIGNED NOT NULL DEFAULT 0,
         PRIMARY KEY (id),
         UNIQUE KEY uk_ad_events (ad_id, kind, day),
         CONSTRAINT fk_ad_events_ad FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
    ],
  },

  {
    version: '002_page_views',
    statements: [
      /*
       * 每一页**今天被打开了几次**。
       *
       * ## 这张表就是隐私红线的形状
       *
       * PLAN 的隐私红线有三条,这里逐条落在结构上:
       * **不认人** —— 没有 user_id、没有会话、没有 cookie 标识
       * **不存 IP** —— 连一列都没有
       * **时间只到天** —— `day` 是 `DATE` 不是 `DATETIME`
       *
       * 所以"今天来了 3 个人"这种问题**它答不上来,而且不是没做,是它根本没有
       * 那个能力**。要知道"几个人"就必须在访客身上留记号,而那正是本站一直在
       * 拒绝的东西。要做那个,得先把四处「数据不会上传」改成分层说法。
       *
       * ## 主键就是 `(day, path)`
       *
       * 不给它一个自增 `id`:这张表**只会被 upsert**(`INSERT ... ON DUPLICATE
       * KEY UPDATE count = count + 1`),永远不按 id 取行。自然键既是主键也是
       * 那个 upsert 的判据,少一列少一条索引。
       *
       * `count` 是 `INT UNSIGNED`,不是精确到某一次的数字 —— 它天然是个累加器。
       */
      `CREATE TABLE IF NOT EXISTS page_views (
         day   DATE NOT NULL,
         path  VARCHAR(64) NOT NULL,
         count INT UNSIGNED NOT NULL DEFAULT 0,
         PRIMARY KEY (day, path)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
    ],
  },
];

/**
 * 这一张表由 `db.ts` 自己建(不进 `MIGRATIONS`)—— 它是迁移器的账本,先有账本
 * 才谈得上记流水。
 */
export const MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version    VARCHAR(64) NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;
