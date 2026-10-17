import { describe, expect, it } from 'vitest';
import { ICONS } from '../src/lib/icons';
import { UNDRAW_STATUS_PAGE_SVG } from '../src/lib/illustrations';
import { ADMIN_NAV } from '../src/lib/admin-nav';

/*
 * 这个文件守的是**"图里不许出现颜色"**那条纪律。
 *
 * 它的价值在"以后":图标是从 Iconify 上按名字取的,而那个站上有几千个图标、
 * 其中一部分**自带写死的填充色**(品牌图标、彩色插画类的最多)。取错一个,
 * 页面上就多出一个不属于这台设计系统的色块 —— 而**它不会报错**,看起来
 * 还挺"正常"。生成脚本里那道正则只挡得住当时那一次,挡不住以后有人手动
 * 往 `icons.ts` 里贴一段。
 */

/** 一个 SVG 片段里所有写死的颜色。`none` / `currentColor` 不算。 */
function hardcodedColors(markup: string): string[] {
  const found = markup.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g) ?? [];
  return [...new Set(found)];
}

describe('图标', () => {
  it('至少有一个,而且每个都不是空串', () => {
    const names = Object.keys(ICONS);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(ICONS[name as keyof typeof ICONS].length, `${name} 是空的`).toBeGreaterThan(20);
    }
  });

  /*
   * 这一条是**最值钱的**:lucide 那一套全是 `currentColor` 描边图标,而
   * Iconify 上别的集合不一定是。取错集合时,这条会直接指出是哪一个。
   */
  it('每一个都用 currentColor,没有写死的颜色', () => {
    for (const [name, body] of Object.entries(ICONS)) {
      expect(hardcodedColors(body), `${name} 里有写死的颜色`).toEqual([]);
      expect(body, `${name} 没有用 currentColor`).toContain('currentColor');
    }
  });

  it('只存内层,不带 <svg> —— 尺寸是消费者的事', () => {
    /*
     * **判据只到"外层没有 `<svg>`"这一步,不去查 `width=` / `height=`。**
     *
     * 第一版顺手加了那条,结果 `overview` 当场红了 —— 因为 lucide 的
     * `layout-dashboard` 里有 `<rect width="7" height="7">`,那是**图形的几何**,
     * 和"这个图标多大"是两回事。一条过宽的判据会把正常代码判成坏的,
     * 而这比漏判更糟:它会训练人去改断言而不是改代码。
     */
    for (const [name, body] of Object.entries(ICONS)) {
      expect(body.startsWith('<g') || body.startsWith('<path'), `${name} 的外层不是 <g>/<path>`).toBe(true);
      expect(body, `${name} 里带了一层 <svg>`).not.toContain('<svg');
    }
  });

  it('后台侧栏的每一项都有图标,而且那个图标真的存在', () => {
    for (const item of ADMIN_NAV) {
      expect(item.icon, `${item.path} 没写 icon`).toBeTruthy();
      expect(ICONS[item.icon], `${item.path} 指向的图标 ${item.icon} 不存在`).toBeDefined();
    }
  });
});

describe('插画', () => {
  it('没有任何写死的颜色 —— 全部换成纸面令牌了', () => {
    expect(hardcodedColors(UNDRAW_STATUS_PAGE_SVG)).toEqual([]);
  });

  it('用的是本站真有的令牌,不是编出来的名字', () => {
    const used = [...new Set(UNDRAW_STATUS_PAGE_SVG.match(/var\(--[a-z-]+\)/g) ?? [])];
    expect(used.length).toBeGreaterThan(0);
    // 这几个是 `global.css` 里真有的(见「样式:两个寄存器」里的令牌表)
    const known = new Set([
      'var(--text)',
      'var(--text-dim)',
      'var(--text-faint)',
      'var(--bg-inset)',
      'var(--bg-elevated)',
      'var(--border)',
    ]);
    for (const token of used) {
      expect(known.has(token), `用了不存在的令牌 ${token}`).toBe(true);
    }
  });

  it('去掉了 width / height,尺寸留给页面定', () => {
    expect(UNDRAW_STATUS_PAGE_SVG).not.toMatch(/<svg[^>]*\swidth="/);
    expect(UNDRAW_STATUS_PAGE_SVG).not.toMatch(/<svg[^>]*\sheight="/);
    // viewBox 必须留着,否则缩放会失真
    expect(UNDRAW_STATUS_PAGE_SVG).toContain('viewBox');
  });

  it('是自托管的一整段,不是对第三方的一次引用', () => {
    /*
     * **不能简单地查 `https?://`**:`xmlns="http://www.w3.org/2000/svg"` 是一个
     * **命名空间标识符**,它从来不发起请求,但字面上就是那个形状。第一版这么写,
     * 这条用例当场红了 —— 红得对(它逼我把判据写准),但结论是"测试太粗"。
     *
     * 真正的判据是"有没有东西会被**取回来**":`<image href>`、`<use href>` 指向
     * 外部、CSS 里的 `url(http…)`。命名空间先剥掉再查。
     */
    const withoutNamespaces = UNDRAW_STATUS_PAGE_SVG.replace(/\sxmlns(:[a-z]+)?="[^"]*"/g, '');
    expect(withoutNamespaces).not.toMatch(/https?:\/\//);
    expect(UNDRAW_STATUS_PAGE_SVG).not.toContain('<image');
    expect(UNDRAW_STATUS_PAGE_SVG).not.toMatch(/url\(\s*['"]?https?:/);
  });
});
