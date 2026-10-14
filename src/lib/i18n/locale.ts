/**
 * 语言(locale)的常量与路径换算。
 *
 * ## 为什么语言是"地址"而不是"状态"
 *
 * 中英开关做成**两个 `<a>`**,而不是像主题开关那样的 `<button>` + `localStorage`。
 * 理由是这一件和主题根本不是同一类东西:
 *
 * - 主题是**你的偏好**,同一份内容你爱怎么看怎么看 —— 存起来、页面自己变,都对。
 * - 语言是**内容的另一份**。它得能被分享(`/en/cps-test/` 发给别人打开就是英文)、
 *   能被搜索引擎分别收录、能在新标签页里打开。**存进 localStorage 的话这三样
 *   一样都拿不到**,而且会出现"地址是中文页、内容是英文"这种对不上的状态。
 *
 * 所以这一层的职责只有一件:**把"当前在哪个语言"和"另一个语言的同一个页面在哪儿"
 * 算出来**。持久化不需要做 —— URL 自己就是持久化。
 *
 * ## 英文带前缀、默认语言不带
 *
 * `/cps-test/` 是中文,`/en/cps-test/` 是英文。默认语言不占前缀,这是最常见的
 * 做法(中文站的流量主体不该被推进一个目录里),参考站也是这么分的。
 */

export const LOCALES = ['zh', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'zh';

/** 来路不明的值不能当可信 —— 从 URL 里读出来的东西尤其 */
export function isLocale(value: unknown): value is Locale {
  return value === 'zh' || value === 'en';
}

/**
 * 写到 `<html lang>` 上的值。
 *
 * **和 `OG_LOCALE` 是两套口径,别混**:HTML 用连字符(`zh-CN`),
 * Open Graph 用下划线(`zh_CN`)。写错不会报错,只会让抓取方认不出来。
 */
export const HTML_LANG: Record<Locale, string> = {
  zh: 'zh-CN',
  en: 'en',
};

/** Open Graph 的 `og:locale`。同上,口径和 `HTML_LANG` 不一样 */
export const OG_LOCALE: Record<Locale, string> = {
  zh: 'zh_CN',
  en: 'en_US',
};

/** 语言开关上显示的名字。**用各语言自己的写法** —— 英文用户得认得出 "English" */
export const LOCALE_LABEL: Record<Locale, string> = {
  zh: '中文',
  en: 'EN',
};

/**
 * 一个页面在指定语言下的**站内路径**(还没拼 `base`)。
 *
 * 它只负责加前缀这一件事,拼 `base` 仍然是 `href()` 的活 —— 两者是叠着的两层,
 * 不是一件事。**所以这个函数不 import `href`**:调用方拿到路径之后自己接
 * `href(localePath(...))`,或者用下面那个已经拼好的 `localeHref`。
 */
export function localePath(locale: Locale, path = ''): string {
  const rest = path.replace(/^\//, '');
  if (locale === DEFAULT_LOCALE) return rest;
  return rest ? `${locale}/${rest}` : `${locale}/`;
}

/**
 * 从 `Astro.url.pathname` 里读出当前是哪个语言,并给出**去掉语言前缀之后**的
 * 那一段路径。
 *
 * 两种输入都要吃:
 * - `Astro.url.pathname` —— **带 base**(`/mouse-test/en/cps-test/`)
 * - 裸路径(写单测时用)
 *
 * `base` 从 `import.meta.env.BASE_URL` 来,和 `url.ts` 取的是同一个值。
 */
export function parsePath(pathname: string): { locale: Locale; rest: string } {
  const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '');
  let rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  rest = rest.replace(/^\//, '');

  for (const locale of LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    if (rest === locale || rest.startsWith(`${locale}/`)) {
      return { locale, rest: rest.slice(locale.length).replace(/^\//, '') };
    }
  }

  return { locale: DEFAULT_LOCALE, rest };
}

/**
 * **同一个页面在另一种语言下的站内路径**(不拼 base)。
 *
 * 中英开关两个链接都从这里来 —— 一个指向当前语言(就是 `rest` 本身),
 * 一个指向另一种。两处由同一个函数算,不会一处对了另一处漂。
 */
export function altLocalePath(locale: Locale, pathname: string): string {
  const { rest } = parsePath(pathname);
  return localePath(locale, rest);
}
