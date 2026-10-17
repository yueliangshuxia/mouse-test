/**
 * 后台的导航清单。**纯数据**,和 `tools.ts` 是同一个角色:导航和"哪些页真的存在"
 * 只有这一份事实来源。
 *
 * ## 为什么它不进 `tools.ts`
 *
 * `tools.ts` 那份注册表描述的是**被测的东西**(工具页、可信度、报头位置),而
 * 后台不测量任何东西 —— `Tool.confidence` 必填,给它填哪一档都是假话。工具箱页
 * (`TOOLBOX`)和维修页(`REPAIR`)是同一个处境,当时也是这么处理的。
 *
 * ## `path` 不带前后的斜杠,也不带 base
 *
 * 它既是 `<a href>` 的输入(拼之前过一遍 `href()`),**也是页面文件的路径**
 * (`admin/users` → `src/pages/admin/users.astro`)。`tests/admin-nav.test.ts`
 * 拿它去 `existsSync`,所以加一项而忘了建文件会当场红,而不是点出一个 404。
 */

import type { IconName } from './icons';

export interface AdminNavItem {
  /** 站点相对路径。既是链接的目标,也是页面文件的位置。 */
  path: string;
  label: string;
  /** 一句话说明,给概览页那几张卡用。 */
  blurb: string;
  /**
   * 侧栏那一项前面的图标。
   *
   * **必填**,理由和 `Tool.group` 一样:可选的话漏写不报错,结果只是那一项
   * 比旁边矮一截、或者缩进跟着偏 —— 而那种参差在一列里很扎眼。必填漏写是
   * `npm run typecheck` 直接红。取值见 `lib/icons.ts`。
   */
  icon: IconName;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  {
    path: 'admin',
    label: '概览',
    blurb: '几个关键数,以及四个模块的入口。',
    icon: 'overview',
  },
  {
    path: 'admin/users',
    label: '用户',
    blurb: '建账号、改角色、启用停用、重置密码。',
    icon: 'users',
  },
  {
    path: 'admin/ads',
    label: '广告位',
    blurb: '首页与工具箱页那两个位置的广告,以及曝光与点击。',
    icon: 'ads',
  },
  {
    path: 'admin/analysis',
    label: '数据分析',
    blurb: '曝光与点击按天的曲线、用户构成。测量数据那一块还没有来源。',
    icon: 'analysis',
  },
  {
    path: 'admin/audit',
    label: '站点体检',
    blurb: '从注册表算出来的自检:色相、母题、英文覆盖、FAQ 与 JSON-LD。',
    icon: 'audit',
  },
] as const;

/**
 * 后台页面**不属于** `ADMIN_NAV`,但同属后台:登录页与注销接口。
 *
 * 单独列出来是因为守导航的那条用例要问的是"注册表里的每一项有没有对应文件",
 * 而这两个没有侧栏入口(登录页不需要,注销是个接口)。
 */
export const LOGIN_PATH = 'login';
