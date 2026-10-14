import { describe, expect, it } from 'vitest';
import { en } from '../src/lib/i18n/en';
import { zh } from '../src/lib/i18n/zh';
import {
  DEFAULT_LOCALE,
  HTML_LANG,
  LOCALES,
  OG_LOCALE,
  altLocalePath,
  isLocale,
  localePath,
} from '../src/lib/i18n/locale';
import { REPAIR, TOOLBOX, TOOLS, findTool } from '../src/lib/tools';
import { QUALITY_CODES } from '../src/lib/analysis';
import { BUTTONS } from '../src/lib/mouse-buttons';

/*
 * 这一组守两件事:**目录和注册表不能漂**,以及**路径换算别把英文页算到中文地址上**。
 *
 * 前者是因为中文的 `name` / `navLabel` 这一版**故意存在于两处**(目录一份、
 * `tools.ts` 一份)—— 摘掉 `tools.ts` 那一份要一次性改 21 个页面的 JSON-LD,
 * 所以这一版先接受重复,用这条用例把两份绑在一起。**漂了会红。**
 */

describe('目录与注册表对账', () => {
  it('每一件工具、工具箱、维修页在目录里都有条目', () => {
    const slugs = [...TOOLS.map((tool) => tool.slug), TOOLBOX.slug, REPAIR.slug];
    for (const slug of slugs) {
      expect(
        zh.tools[slug as keyof typeof zh.tools],
        `${slug} 在 tools.ts 里有,目录里却没有 —— 报头/卡片上会显示成 slug`,
      ).toBeTruthy();
    }
  });

  it('目录里的中文和 tools.ts 里那份逐字相同', () => {
    for (const tool of TOOLS) {
      const copy = zh.tools[tool.slug as keyof typeof zh.tools];
      expect(copy?.name, `${tool.slug} 的全名两边对不上`).toBe(tool.name);
      expect(copy?.navLabel, `${tool.slug} 的报头短名两边对不上`).toBe(tool.navLabel);
    }
    expect(zh.tools[TOOLBOX.slug as keyof typeof zh.tools]?.navLabel).toBe(TOOLBOX.navLabel);
    expect(zh.tools[REPAIR.slug as keyof typeof zh.tools]?.navLabel).toBe(REPAIR.navLabel);
  });

  it('英文版没有一个是空的', () => {
    for (const [slug, copy] of Object.entries(en.tools)) {
      expect(copy.name.trim(), `${slug} 的英文全名是空的`).not.toBe('');
      expect(copy.navLabel.trim(), `${slug} 的英文短名是空的`).not.toBe('');
    }
  });

  it('两份目录的键完全一样', () => {
    const keys = (o: object) => Object.keys(o).sort();
    expect(keys(en)).toEqual(keys(zh));
    expect(keys(en.tools)).toEqual(keys(zh.tools));
    expect(keys(en.common)).toEqual(keys(zh.common));
    expect(keys(en.confidence)).toEqual(keys(zh.confidence));
    expect(keys(en.chrome)).toEqual(keys(zh.chrome));
  });

  it('修维页和工具箱不是工具,但目录里仍然要有它们的名字', () => {
    for (const slug of [TOOLBOX.slug, REPAIR.slug]) {
      expect(findTool(slug), `${slug} 不该出现在 TOOLS 里`).toBeUndefined();
      expect(en.tools[slug as keyof typeof en.tools]).toBeTruthy();
    }
  });

  /*
   * 已翻译的页面:它的 `<title>` / meta description 也搬进了目录,所以
   * `tools.ts` 里那一份**又是一处重复** —— 同 `name` / `navLabel`,靠这条钉住。
   *
   * **逐页翻译推进时往这张表里加一行。** 等 21 页都翻完,`tools.ts` 里
   * `title` / `description` 那两列就可以整列删掉,这段也跟着删。
   */
  const TRANSLATED = [
    { slug: 'cps-test', copy: zh.pages.cps, enCopy: en.pages.cps },
    { slug: 'doodle-test', copy: zh.pages.doodle, enCopy: en.pages.doodle },
    { slug: 'dead-pixel-test', copy: zh.pages.deadPixel, enCopy: en.pages.deadPixel },
    { slug: 'sensitivity-converter', copy: zh.pages.sensitivity, enCopy: en.pages.sensitivity },
    { slug: 'button-test', copy: zh.pages.button, enCopy: en.pages.button },
    { slug: 'dpi-test', copy: zh.pages.dpi, enCopy: en.pages.dpi },
    { slug: 'polling-rate-test', copy: zh.pages.polling, enCopy: en.pages.polling },
    { slug: 'hold-drag-test', copy: zh.pages.holdDrag, enCopy: en.pages.holdDrag },
    { slug: 'scroll-test', copy: zh.pages.scroll, enCopy: en.pages.scroll },
    { slug: 'double-click-test', copy: zh.pages.doubleClick, enCopy: en.pages.doubleClick },
    { slug: 'acceleration-test', copy: zh.pages.acceleration, enCopy: en.pages.acceleration },
    { slug: 'keyboard-test', copy: zh.pages.keyboard, enCopy: en.pages.keyboard },
    { slug: 'reaction-test', copy: zh.pages.reaction, enCopy: en.pages.reaction },
    { slug: 'aim-test', copy: zh.pages.aim, enCopy: en.pages.aim },
    { slug: 'steadiness-test', copy: zh.pages.steadiness, enCopy: en.pages.steadiness },
    { slug: 'trail-test', copy: zh.pages.trail, enCopy: en.pages.trail },
    { slug: 'refresh-visual-test', copy: zh.pages.refresh, enCopy: en.pages.refresh },
  ];

  it('已翻译页面的 meta 和 tools.ts 里那份逐字相同', () => {
    for (const { slug, copy } of TRANSLATED) {
      const tool = findTool(slug);
      expect(tool, `${slug} 不在注册表里`).toBeTruthy();
      expect(copy.metaTitle, `${slug} 的 <title> 两边对不上`).toBe(tool?.title);
      expect(copy.metaDescription, `${slug} 的 meta description 两边对不上`).toBe(tool?.description);
    }
  });

  it('已翻译页面的英文 meta 不是空的', () => {
    for (const { slug, enCopy } of TRANSLATED) {
      expect(enCopy.metaTitle.trim(), `${slug} 的英文 <title> 是空的`).not.toBe('');
      expect(enCopy.metaDescription.trim(), `${slug} 的英文 description 是空的`).not.toBe('');
    }
  });

  /*
   * **`analysis.ts` 和目录之间那道锁。**
   *
   * 判据代码现在住在 `analysis.ts`(`QUALITY_CODES`),文案住在目录的 `quality`
   * 命名空间里。两边分开是有理由的 —— `analysis.ts` 是全站唯一一个不 import
   * 任何东西的纯层,把它接到呈现层上会把那条界线拆掉。
   *
   * 代价就是这条:**加了一条判据却忘了写文案**,类型上不会响。所以在这里补上,
   * 而且**两边都查** —— 英文漏了同样是一句话说不出来。
   * (反过来的方向不查:目录里多留一条没人判的文案无害,只是死数据。)
   */
  /*
   * **五个按键名在 `mouse-buttons.ts` 和目录里各有一份**,同 `tools.ts` 的
   * `name` / `navLabel` —— 那一份暂时摘不掉(它还被两个页面的脚本用着),
   * 所以靠这条把两份绑住。漂了会红。
   */
  it('按键名两边逐字相同,而且编号一个不漏', () => {
    for (const button of BUTTONS) {
      const copy = zh.buttons[String(button.code) as keyof typeof zh.buttons];
      expect(copy, `按键 ${button.code} 在 mouse-buttons.ts 里有,目录里没有`).toBeTruthy();
      expect(copy?.name, `按键 ${button.code} 的名字两边对不上`).toBe(button.name);
      expect(copy?.note, `按键 ${button.code} 的副标题两边对不上`).toBe(button.note);
    }
    for (const code of Object.keys(zh.buttons)) {
      if (code === 'unknown') continue;
      expect(BUTTONS.map((b) => String(b.code)), `目录里多了一个 mouse-buttons.ts 里没有的编号 ${code}`).toContain(code);
    }
  });

  it('每一条判据代码都有中英文文案', () => {
    for (const code of QUALITY_CODES) {
      expect(zh.quality[code], `${code} 在 analysis.ts 里判了,中文目录里却没有`).toBeTruthy();
      expect(en.quality[code], `${code} 缺英文文案`).toBeTruthy();
    }
  });
});

describe('localePath / altLocalePath', () => {
  it('默认语言不带前缀,另一种语言带', () => {
    expect(localePath(DEFAULT_LOCALE, 'cps-test/')).toBe('cps-test/');
    expect(localePath('en', 'cps-test/')).toBe('en/cps-test/');
  });

  it('站点根两种语言都要算得出来', () => {
    expect(localePath(DEFAULT_LOCALE, '')).toBe('');
    expect(localePath('en', '')).toBe('en/');
  });

  it('开头的斜杠加不加都一样', () => {
    expect(localePath('en', '/cps-test/')).toBe('en/cps-test/');
  });

  it('从带 base 的 pathname 里能认出语言,并把 rest 剥干净', () => {
    /*
     * 这里喂的是**裸路径**(不带 `/mouse-test`),因为 `import.meta.env.BASE_URL`
     * 在单测里是 `/`。带 base 的那条路由真机验(见计划里的产物校验)。
     */
    expect(altLocalePath('en', '/cps-test/')).toBe('en/cps-test/');
    expect(altLocalePath(DEFAULT_LOCALE, '/en/cps-test/')).toBe('cps-test/');
    expect(altLocalePath(DEFAULT_LOCALE, '/en/')).toBe('');
    expect(altLocalePath('en', '/')).toBe('en/');
  });

  it('中英开关两个方向转一圈回到原地', () => {
    for (const slug of ['', 'cps-test/', 'mouse-repair/', 'en/', 'en/cps-test/']) {
      const toEn = altLocalePath('en', `/${slug}`);
      const backToZh = altLocalePath(DEFAULT_LOCALE, `/${toEn}`);
      const fromZh = altLocalePath(DEFAULT_LOCALE, `/${slug}`);
      expect(altLocalePath('en', `/${fromZh}`)).toBe(toEn);
      expect(backToZh === '' || !backToZh.startsWith('en/')).toBe(true);
    }
  });
});

describe('语言常量', () => {
  it('isLocale 只认这两个,别的值一律不算', () => {
    expect(isLocale('zh')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('en-US')).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('两套口径别写混:HTML 用连字符,OG 用下划线', () => {
    for (const locale of LOCALES) {
      expect(HTML_LANG[locale]).not.toContain('_');
      expect(OG_LOCALE[locale]).not.toContain('-');
    }
    expect(HTML_LANG.zh).toBe('zh-CN');
    expect(OG_LOCALE.zh).toBe('zh_CN');
  });
});
