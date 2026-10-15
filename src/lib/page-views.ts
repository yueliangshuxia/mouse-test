/**
 * 哪些路径可以被计数。**这是那一类"开放的写接口"唯一的一道门。**
 *
 * ## 为什么白名单要从注册表推,不手写
 *
 * `/api/view` 是一个**谁都能调的**接口(它必须公开 —— 访客没有账号)。如果它
 * 照单全收客户端递上来的路径,那张表就会被任何人用任意字符串填满:一千行长
 * 得像 `/../../etc/passwd` 或者一段广告的"页面名"。手写一份白名单能挡住它,
 * 但**加一件工具就会忘了加一行**,而那种漏是静默的 —— 那一页从此不计数,
 * 看板上少一根柱子,没人看得出来。
 *
 * 所以清单从 `READY_TOOLS` 推出来:加一件工具,它自动进白名单。
 *
 * ## 存的是**去掉 base 的路径**(`/cps-test/` 这种)
 *
 * 不是 `location.pathname`(那在子路径部署下是 `/mouse-test/cps-test/`)。理由
 * 是**那个 base 会变**:现在站点挂在 `/mouse-test` 子路径上,上线换成备案域名
 * 之后落在域名根,于是库里一半的行会变成另一种写法,而历史数据里那两种写法
 * 指的其实是同一页。存站点相对路径,换域名时**一行数据都不用动**。
 *
 * 客户端也不去猜这个串 —— 由服务端渲染在 `data-view-path` 上(值来自注册表),
 * 脚本原样递回来。这样"客户端算路径"这件容易出错的事根本不存在。
 */

import { READY_TOOLS } from './tools';

/** 可以被计数的路径集合。从注册表推出来 —— 见文件头。 */
export const VIEW_PATHS: ReadonlySet<string> = new Set(
  READY_TOOLS.map((tool) => `/${tool.slug}/`),
);

/**
 * 这一条路径算不算数。
 *
 * **判据是集合成员,不是前缀匹配、不是正则。** 那两种写法都会放过一些本不该
 * 记的东西(`/cps-test/anything`、大小写变体、末尾多一个斜杠),而它们带来的
 * 后果不是安全漏洞,是**表里长出一些看起来像页面的行**,看板上一行行读下去
 * 不知道那是什么。
 */
export function isCountablePath(path: unknown): path is string {
  return typeof path === 'string' && VIEW_PATHS.has(path);
}

/**
 * 一件工具的站点相对路径。`cps-test` → `/cps-test/`。
 *
 * 两端(渲染 `data-view-path` 的和校验的)走的是同一个函数,所以不会出现
 * "渲染出来是 `/cps-test`、校验要的是 `/cps-test/`"这种两边各写一半的坑。
 */
export function toolViewPath(slug: string): string {
  return `/${slug}/`;
}
