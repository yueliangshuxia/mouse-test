import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TOOL_MOTIF } from '../src/lib/tool-motifs';
import {
  DIAGNOSTIC_TOOLS,
  FUN_TOOLS,
  NAV,
  READY_TOOLS,
  REPAIR,
  TOOLBOX,
  TOOLS,
} from '../src/lib/tools';

/*
 * 这一组守的是**报头那三段结构**和**注册表里那些会指向不存在页面的地方**。
 *
 * 报头现在是三段:框住的一组诊断工具 / 折叠出来的「更多」 / 「工具箱」。
 * 三段都由 `tools.ts` 的 `NAV` 一处导出,`ToolNav.astro` 照它渲染 ——
 * 所以这里的输入**就是模板的输入**,不会出现"测的是一个集合、渲染的是另一个"。
 */

/** 仓库根的绝对路径。用例跑在 `tests/` 下,往上退一级就是根 */
const ROOT = new URL('../', import.meta.url);

function pagePath(slug: string): string {
  return fileURLToPath(new URL(`src/pages/${slug}.astro`, ROOT));
}

describe('报头分组', () => {
  /*
   * 这条和 `mini-cards.test.ts` 里那条「两片恰好分完 `READY_TOOLS`」是同一件事的
   * **上一层重述**:那边守的是首页两片网格,这边守的是报头三段。
   *
   * 为什么值得写第二遍:报头不是从 `DIAGNOSTIC_TOOLS` / `FUN_TOOLS` 直接渲染的,
   * 它走的是 `NAV` 这个中间对象。哪天有人"顺手"把 `NAV.group` 改成 `READY_TOOLS`
   * (看着更简单),或者把 `dropdown` 换成别的视图,首页那几条用例**一条都不会红**
   * —— 而报头里会多出一堆本该在下拉里的项、或者丢掉一整片。
   */
  it('NAV.group 与 NAV.dropdown 恰好分完 READY_TOOLS,不重不漏且保持顺序', () => {
    const group = NAV.group.map((tool) => tool.slug);
    const dropdown = NAV.dropdown.map((tool) => tool.slug);

    // 不重:漏一条是"某个工具从导航里静默消失",重一条是它被渲染两遍
    const all = [...group, ...dropdown];
    expect(new Set(all).size, '有工具在报头里出现了两次').toBe(all.length);

    /*
     * 不漏。这一句是整组用例里最要紧的一条。
     *
     * **比较方式是"按 slug 排序后相等",不是"逐项相等"** —— 后者还顺带要求
     * 两片拼起来保持着 `READY_TOOLS` 的顺序,而 `keyboard-test` 挪进下拉之后
     * 那个顺序**注定对不上**(它在 `READY_TOOLS` 里排第 10,在下拉里排最后)。
     * 顺序由下面那两条各自守一段就够了,这里要的是**集合层面的不重不漏**。
     */
    const allSlugs = [...group, ...dropdown].slice().sort();
    expect(allSlugs).toEqual(READY_TOOLS.map((tool) => tool.slug).sort());

    /*
     * 顺序两段各自保持 —— 报头靠这个顺序决定"先折谁"。
     *
     * **这两条从"等于两个 filter"改成了"各自是它们的子序列,而且挪走的那几个
     * 确实在下拉里"。** 报头那一组从这一版起**有了自己的一份分组**:`keyboard-test`
     * 被挪进了「工具箱」下拉(它是这十个诊断工具里唯一不测鼠标的,摆在
     * 「鼠标测试」那一排里本来就别扭 —— 理由写在 `tools.ts` 的
     * `HEADER_DROPDOWN_DIAGNOSTIC` 上面),所以 `NAV.group` 不再等于 `DIAGNOSTIC_TOOLS`。
     *
     * 直接写 `expect(group).toEqual(DIAGNOSTIC_TOOLS…)` 会红,而且红得对;
     * 但改成"照抄一遍同一个 filter"就成了同义反复,什么都测不出来。
     * 所以守住的是**真正的那两条不变量**:两段各自保持原顺序,而且
     * **从框里少掉的必须一个不少地出现在下拉里** —— 后者才是这条用例原本
     * 要挡的"某个工具从导航里静默消失"。
     */
    const diagSlugs = DIAGNOSTIC_TOOLS.map((tool) => tool.slug);
    const funSlugs = FUN_TOOLS.map((tool) => tool.slug);

    expect(group).toEqual(diagSlugs.filter((slug) => group.includes(slug)));
    expect(dropdown.slice(0, funSlugs.length)).toEqual(funSlugs);

    const movedOut = diagSlugs.filter((slug) => !group.includes(slug));
    expect(dropdown.slice(funSlugs.length)).toEqual(movedOut);
    for (const slug of movedOut) {
      expect(dropdown, `${slug} 从框里挪走了,却没进下拉 —— 它从报头里消失了`).toContain(slug);
    }

    // 两段都非空:空的那一段会让报头少一整块,而不是报错
    expect(group.length).toBeGreaterThan(0);
    expect(dropdown.length).toBeGreaterThan(0);
  });

  /*
   * 「工具箱」**不是一个 `Tool`**(理由写在 `tools.ts` 的 `TOOLBOX` 注释里),
   * 所以它一旦混进 `READY_TOOLS`,后果不是报错而是**渲染到错的地方**:
   * 它会出现在首页(要么被当成诊断工具塞进框里,要么被当成趣味工具列进
   * 「更多工具」),而它在任何一处都不是一件能测的东西。
   */
  it('工具箱本身不在 READY_TOOLS 里', () => {
    expect(READY_TOOLS.map((tool) => tool.slug)).not.toContain(TOOLBOX.slug);
    expect(TOOLS.map((tool) => tool.slug)).not.toContain(TOOLBOX.slug);
  });

  /*
   * 「鼠标维修」和工具箱是同一类东西:一扇门,不是一件能测的工具。
   *
   * 混进 `READY_TOOLS` 的后果也一样 —— 它会出现在首页(诊断卡片的网格里,
   * 或者「更多工具」的清单里),而它两个地方都不是。
   *
   * **但它比工具箱更危险一点**:工具箱只是分类错了,而维修页要是被当成
   * 一件"工具"排进首页,就等于把服务入口摆进了测量台 —— 那正是
   * `mouse-repair.astro` 文件头里那条"故障判定区永远不出现服务信息"
   * 要挡的事。所以这条判据守的不只是分类,还有那件更要紧的事。
   */
  it('「鼠标维修」也不在 READY_TOOLS 里', () => {
    expect(READY_TOOLS.map((tool) => tool.slug)).not.toContain(REPAIR.slug);
    expect(TOOLS.map((tool) => tool.slug)).not.toContain(REPAIR.slug);
  });

  /*
   * `'none'` 那一档(「不测量」)说的是"这一页压根不做测量"。
   * 一件**诊断**工具说自己不测量,要么是 `confidence` 填错了档,要么是
   * `group` 填错了 —— 两种都是那一页在给用户一个错的选页依据。
   *
   * 反过来的方向不设限:趣味工具**可以**是测量类的(反应、瞄准都报精确读数),
   * 只是它们不上首页,所以那枚徽章在工具箱页上显示。
   */
  it('诊断工具没有一个是「不测量」', () => {
    for (const tool of DIAGNOSTIC_TOOLS) {
      expect(tool.confidence, `${tool.slug} 是诊断工具,却标成"不测量"`).not.toBe('none');
    }
  });
});

describe('slug 与页面文件', () => {
  /*
   * 这个文件里**唯一一条真的会拦住事故的用例**。
   *
   * `ready: true` 曾经是那道闸门("不许链接到不存在的页面"),而「工具箱」
   * 为了不当成一个 `Tool` 就绕开了它 —— 于是 `TOOLBOX.slug` 写错一个字母
   * 会是这样:**类型检查通过、构建通过、单测通过、页面全在**,只有报头那一项
   * 指向 404。这正是仓库点过名的那类事故(`url.ts` 那条"写根路径构建不报错、
   * 上线才 404")。
   *
   * 代价六行,换回来的正是丢掉的那道保护。
   */
  it('每一个 slug 都真的有对应的页面文件', () => {
    const slugs = [
      ...READY_TOOLS.map((tool) => tool.slug),
      TOOLBOX.slug,
      REPAIR.slug,
    ];

    for (const slug of slugs) {
      expect(existsSync(pagePath(slug)), `src/pages/${slug}.astro 不存在`).toBe(true);
    }
  });
});

describe('工具箱页', () => {
  /** 剥掉注释,免得注释里提到的名字被当成"代码引用了它" */
  function toolboxSource(): string {
    return readFileSync(fileURLToPath(new URL('src/pages/toolbox.astro', ROOT)), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\/[^\n]*/g, '');
  }

  /*
   * 清单**必须从 `NAV.dropdown` 派生**,不能手写七个 `<li>` ——
   * 手写的那一份迟早和注册表对不上,而"工具箱页少列了一件工具"是**静默的**:
   * 那一件从此在报头下拉里还在、在工具箱页上却没有,没有任何一处会报错。
   *
   * **这条判据的强度有限,要说清楚**:它只是"源码里出现了这个名字"。
   * 注释已经剥掉了(否则举例子提到的名字就会让用例报假故障,`mini-cards.test.ts`
   * 那边踩过一次),但**把 `NAV.dropdown` 读出来又丢掉、底下照样手写七个
   * `<li>`,这条照样过**。它能拦住的是"换成了另一个视图""改成了手写常量",
   * 拦不住"读了但没用"。真正的保证来自上面那条"导航只有一个事实来源"
   * 和 `NAV` 的导出方式,这条只是把最省事的那种退化挡住。
   */
  it('清单是从 NAV.dropdown 派生的,不是手写的第二份', () => {
    expect(toolboxSource()).toContain('NAV.dropdown');
  });

  /*
   * 每一件趣味工具都要有一块预览图形。
   *
   * 少一条的后果是那一格**静默空着**(`TOOL_MOTIF[slug]` 是 `undefined`,
   * 渲染成一片空白)—— 而空白的预览窗看起来像"这一件还没做好",
   * 和 `.rate-chart:empty` 那块 110px 灰槽是同一种罪:把"没有"画成了"坏了"。
   */
  it('下拉里的每一件都有预览图形', () => {
    /*
     * **遍历的是 `NAV.dropdown`,不是 `FUN_TOOLS`。**
     *
     * 这一条原本遍历 `FUN_TOOLS`,而工具箱页渲染的是 `NAV.dropdown` —— 两者
     * 曾经相等,所以看不出差别。`keyboard-test` 挪进下拉之后它们**当场分家**:
     * 页面上会多出一格,而 `TOOL_MOTIF['keyboard-test']` 是 `undefined`,
     * 渲染成一片空白 —— **其余用例照样全绿**。
     *
     * 空白的预览窗看起来像"这一件还没做好",和 `.rate-chart:empty` 那条
     * 110px 灰槽是同一种罪。改成遍历 `NAV.dropdown` 之后,判据就跟着页面走了:
     * 以后再从框里往下拉挪一件,忘了配图形会立刻红。
     */
    for (const tool of NAV.dropdown) {
      expect(TOOL_MOTIF[tool.slug], `${tool.slug} 在下拉里,却没有 TOOL_MOTIF 条目`).toBeTruthy();
    }
  });
});
