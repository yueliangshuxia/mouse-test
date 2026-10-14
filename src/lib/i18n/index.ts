/**
 * 目录的统一入口。
 *
 * **它必须是一个能 `import` 的 `.ts` 模块,不能是 frontmatter 数据。**
 * 这是被 `<script>` 那一侧逼出来的:全站 419 条运行时句子是在 `<script>` 里
 * 拼的,而 frontmatter 变量在 `<script>` 里不存在(见 CLAUDE.md「页面约定」)。
 * 目录如果是 frontmatter 里的对象,那 419 条就一条都拿不到。
 */

import { en } from './en';
import { zh, type Catalog } from './zh';
import { DEFAULT_LOCALE, localePath } from './locale';
import type { Locale } from './locale';
import { href } from '../url';

export {
  LOCALES,
  DEFAULT_LOCALE,
  HTML_LANG,
  OG_LOCALE,
  LOCALE_LABEL,
  altLocalePath,
  isLocale,
  localePath,
  parsePath,
} from './locale';
export type { Locale } from './locale';
export type { Catalog } from './zh';

export const CATALOGS: Record<Locale, Catalog> = { zh, en };

export function getCatalog(locale: Locale): Catalog {
  return CATALOGS[locale] ?? CATALOGS.zh;
}

/**
 * 一件工具的**全名**和**报头短名**。
 *
 * 名字和短名都从目录来,而不是从 `tools.ts` —— 那两样是"出现在多个页面上
 * 的文字"(报头、首页卡片、工具箱清单、维修页索引卡),正是目录该管的东西。
 * `tools.ts` 那边暂时还留着同样两份中文,由 `tests/i18n.test.ts` 的对账用例
 * 钉着,漂了会红。
 *
 * 查不到时**返回 slug 本身**而不是空串:空串在页面上的样子是一片空白
 * (和"这一项没做好"分不开),slug 至少看得出是哪一个。
 */
export function toolCopy(slug: string, locale: Locale): { name: string; navLabel: string } {
  const entry = getCatalog(locale).tools[slug as keyof Catalog['tools']];
  return entry ?? { name: slug, navLabel: slug };
}

/**
 * 按 **slug** 取那一页的目录条目(取不到返回 `null`)。
 *
 * 需要它的只有工具箱清单页:它列的是 `NAV.dropdown` 那八件,**每一件的说明文字
 * 就是那一页自己的 `metaDescription`**。不把八条说明抄进 `toolbox.ts` 是因为
 * **同一句话只能有一个来源** —— `tools.ts` 里那份中文 description 和每页目录里的
 * `metaDescription` 已经被 `tests/i18n.test.ts` 钉成同一个字符串,再抄第三份
 * 就是给日后漂移留缝。
 *
 * `pageCopyBySlug` 和 `toolCopy` 是**两件不同的事**:`toolCopy` 按 slug 取
 * **名字与报头短名**(在 `tools` 命名空间里,20 个 slug 都有);这个按 slug 取
 * **那一页的目录**(在 `pages` 命名空间里,**只有翻过的页才有**)。
 */
export function pageCopyBySlug(
  locale: Locale,
  slug: string,
): { slug: string; metaTitle: string; metaDescription: string } | null {
  for (const page of Object.values(getCatalog(locale).pages)) {
    if (page.slug === slug) return page;
  }
  return null;
}

/**
 * 一个鼠标按键的**名字**和**副标题**(`主键` / `滚轮按下` 那种)。
 *
 * 和 `toolCopy` 同一套写法:表里没有的编号给一个**看得出是哪一个**的兜底
 * (`按键 9`),而不是空串 —— 一块空白的按键牌会被读成"这一项还没做好"。
 */
export function buttonCopy(code: number, locale: Locale): { name: string; note: string } {
  const table: Record<string, { name: string; note: string }> = getCatalog(locale).buttons;
  return (
    table[String(code)] ??
    { name: fill(getCatalog(locale).buttons.unknown.name, { code: String(code) }), note: '' }
  );
}

/** 站内链接的**语言感知**版本:`href()` 拼 `base`,`localePath()` 加语言前缀 */
export function localeHref(locale: Locale, path = ''): string {
  return href(localePath(locale, path));
}

/**
 * **已经翻好的页面。**由目录自己推出来 —— 每份页面目录都带一个 `slug` 字段,
 * 所以**新翻一页自动进这个集合**,不需要再维护第二张表。
 *
 * 它存在的理由是一次真实的 404:中英开关原先无条件地把另一种语言算成
 * `/en/<当前页>/`,而多数页面根本没有英文版 —— 用户点 EN,落到的是 404 页。
 */
export const TRANSLATED_SLUGS: ReadonlySet<string> = new Set(
  Object.values(CATALOGS.en.pages).map((page) => page.slug),
);

/**
 * 这一页有没有另一种语言。**站点根(`''`)算有** —— `/en/` 是真的存在的,
 * 它是英文首页。
 */
export function isTranslated(slug: string): boolean {
  return slug === '' || TRANSLATED_SLUGS.has(slug);
}

/**
 * 站内跳转的地址:目标页翻过就走那种语言,**没翻过就落回默认语言**。
 *
 * **拿它替掉直接拼 `localePath` 的写法。**拼 `localePath('en', 'dpi-test/')`
 * 是构建不会报错、点下去才 404 的那一类 —— 和 `href()` 那条"写根路径构建
 * 不报错、上线才 404"是同一个形状,所以同一个解法:收进一个函数。
 */
export function pageHref(locale: Locale, slug: string): string {
  const target = locale === DEFAULT_LOCALE || isTranslated(slug) ? locale : DEFAULT_LOCALE;
  return href(localePath(target, slug ? `${slug}/` : ''));
}

/**
 * 把句子里的 `{name}` 换成值。
 *
 * 运行时拼出来的那 419 条句子因此可以**整句**住在目录里,而不是被切成
 * "前半句 + 变量 + 后半句"三块 —— 拆开之后翻译的人看不到完整的句子,
 * 语序和格位就没法处理(中英的语序本来就不一样,英文里那个数可能得挪到句尾)。
 *
 * 找不到对应值的占位符**原样留着**:屏幕上出现一个 `{count}` 一眼就看得见,
 * 而悄悄替成空串只会让句子读起来怪,却不知道怪在哪儿。
 */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  );
}

/**
 * 把 `analysis.ts` 给出来的**判据代码**格式化成一句话。
 *
 * 句子住在目录的 `quality` 命名空间里。那边只给代码和已经格式化好的数值
 * (理由写在 `QualityIssue` 的注释里),拼接在这一步。
 *
 * 查不到就把**代码本身**显示出来:屏幕上冒出一个 `duplicate-poor` 一眼看得见,
 * 而悄悄给空串那一行会无声无息地消失。
 */
export function formatIssue(
  locale: Locale,
  issue: { code: string; params: Record<string, string> },
): string {
  const table: Record<string, string> = getCatalog(locale).quality;
  const template = table[issue.code];
  return template ? fill(template, issue.params) : issue.code;
}

/**
 * 运行期读出当前语言。**从 DOM 上读回来,不从 `import.meta.env` 推。**
 *
 * 这是被逼出来的:全站 419 条运行时句子是在 `<script>` 里拼的,而
 * frontmatter 变量在 `<script>` 里不存在(见 CLAUDE.md「页面约定」)。
 * `<html lang>` 是构建期写死的、运行期又是 DOM 上的事实,所以它就是那个
 * "两个世界都看得见"的来源 —— 和 `cps-test` 的 `renderDurations()`
 * 从按钮 `textContent` 读标签是同一个办法。
 *
 * 判据只看**开头是不是 `en`**:`HTML_LANG.en` 是 `'en'`,`zh` 是 `'zh-CN'`。
 */
export function currentLocale(): Locale {
  const lang = typeof document === 'undefined' ? '' : document.documentElement.lang;
  return lang.toLowerCase().startsWith('en') ? 'en' : DEFAULT_LOCALE;
}
