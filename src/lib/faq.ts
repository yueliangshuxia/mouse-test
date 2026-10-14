/**
 * FAQ 答案里的 `**强调**` 与 `` `行内代码` ``。
 *
 * 答案在 frontmatter 里是**普通字符串**,而页面用 `{item.a}` 插值 —— Astro 的
 * 花括号是**转义输出**,不是 markdown。所以早先写在里面的 `**...**` 不会变成粗体,
 * 而是原样显示成一串星号(真浏览器里量过,不是推断)。正文里那些 `<strong>` 是
 * JSX 元素、走的是另一条路,所以只有 FAQ 中招。
 *
 * 更麻烦的是同一份字符串还进了 FAQPage 结构化数据:星号会跟着被搜索引擎读走。
 *
 * 所以分成两个函数——**渲染**用 `faqHtml`,`JSON-LD` 用 `faqText`。两处都从
 * 同一份 frontmatter 原文出发,不会像手抄两份那样漂。
 *
 * 页面上用的时候要 `set:html`,否则标签同样会被转义:
 *
 * ```astro
 * <p class="faq__a" set:html={faqHtml(item.a)} />
 * ```
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

/**
 * `**x**` —— 不跨行,最短匹配,和 markdown 的粗体一致。
 *
 * 每个调用点各建一份,不共用模块级的 `g` 正则:`g` 正则带 `lastIndex` 状态,
 * 共用一个对象的话,以后有人拿它 `.test()` 一下就会隔空影响另一个函数。
 */
const emphasis = () => /\*\*(.+?)\*\*/g;

/**
 * `` `x` `` —— 行内代码,渲染成 `<code>`。
 *
 * **和 `**` 是同一个坑的第二半**:正文里那些反引号也是按 markdown 写的,
 * 而花括号是转义输出,不认它们 —— 于是屏幕上**真的印着两个反引号**。
 * 全站扫出 5 处(3 个页面),全都是这个成因。
 *
 * 不跨行(和 `**` 一致):跨行的话一个漏掉的反引号会把后面一整段吞进去。
 */
const codeSpan = () => /`([^`\u000A]+?)`/g;

/**
 * 去掉标记只留文字。给 JSON-LD 用。
 *
 * 结构化数据里出现字面星号是纯粹的噪声,而且没有任何阅读语境能解释它。
 */
export function faqText(answer: string): string {
  // 结构化数据里两种标记都只留文字 —— 字面的星号或反引号是纯噪声
  return answer.replace(emphasis(), '$1').replace(codeSpan(), '$1');
}

/**
 * 把 `**强调**` 变成 `<strong>`、`` `代码` `` 变成 `<code>`。页面里必须配 `set:html`。
 *
 * 先转义再插标签,顺序不能反:反过来的话答案里万一出现 `<`,转义会连
 * 自己刚插进去的 `<strong>` 一起吃掉。
 */
export function faqHtml(answer: string): string {
  return answer
    .replace(/[&<>]/g, (ch) => ESCAPES[ch] ?? ch)
    .replace(emphasis(), '<strong>$1</strong>')
    .replace(codeSpan(), '<code>$1</code>');
}
