/**
 * `App.Locals` 的类型声明。
 *
 * 中间件把当前会话写进 `context.locals.user`(见 `src/middleware.ts`),页面和布局
 * 再从 `Astro.locals.user` 读回来 —— 这是 Astro 给"一次请求里跨层传东西"的口子。
 * 但它是**弱类型**的:不在这里声明,`Astro.locals.user` 会被推成 `any`,而拼错
 * (写 `Astro.locals.users`)不报错、只是永远读不到东西。
 *
 * 声明之后它是 `SessionUser | undefined`,于是:
 *
 * - 页面里 `Astro.locals.user.username` 会**当场类型报错**(可能是 undefined),
 *   逼调用方先判一下 —— 而"这个页面到底有没有被中间件覆盖"正是要看的问题
 * - 拼错属性名同样是类型错误
 *
 * 关键在两处细节:文件里有顶层 `import`(所以它是一个模块,`declare global` 才有
 * 意义),而 `App` 用 `namespace` 声明在 `global` 里 —— Astro 就是从这个位置读的。
 */
import type { SessionUser } from './server/auth';

declare global {
  namespace App {
    interface Locals {
      /** 当前登录的管理员。中间件只在 `/admin/**` 与 `/api/admin/**` 上填它。 */
      user?: SessionUser;
    }
  }
}
