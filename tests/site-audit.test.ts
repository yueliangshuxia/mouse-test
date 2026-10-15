import { describe, expect, it } from 'vitest';
import { auditSite } from '../src/lib/site-audit';
import { NAV, READY_TOOLS, REPAIR, TOOLBOX } from '../src/lib/tools';

const audit = auditSite();

describe('站点体检', () => {
  it('每一件已上线的工具都有一行', () => {
    expect(audit.rows).toHaveLength(READY_TOOLS.length);
    expect(audit.rows.map((row) => row.slug).sort()).toEqual(
      READY_TOOLS.map((tool) => tool.slug).sort(),
    );
  });

  it('每一行的 slug 不重复', () => {
    const slugs = audit.rows.map((row) => row.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('分支不重不漏,而且和注册表算出来的一样', () => {
    expect(audit.counts.tools).toBe(audit.counts.diagnostic + audit.counts.fun);
    expect(audit.counts.diagnostic).toBe(READY_TOOLS.filter((t) => t.group === 'diagnostic').length);
    expect(audit.counts.fun).toBe(READY_TOOLS.filter((t) => t.group === 'fun').length);
  });

  it('报头位置只有三种取值,而且和 NAV 对得上', () => {
    const inGroup = audit.rows.filter((row) => row.nav === 'group');
    const inDropdown = audit.rows.filter((row) => row.nav === 'dropdown');
    expect(inGroup.map((r) => r.slug).sort()).toEqual(NAV.group.map((t) => t.slug).sort());
    expect(inDropdown.map((r) => r.slug).sort()).toEqual(NAV.dropdown.map((t) => t.slug).sort());
    // 两段拼起来就是全部 —— 所以 'none' 这一档现在一个都不该有
    expect(audit.rows.filter((row) => row.nav === 'none')).toHaveLength(0);
  });
});

/*
 * 这一组是这个文件里**最值钱的**。
 *
 * `auditSite()` 算出来的那几条不变量,判据和 `tests/nav.test.ts` /
 * `tests/mini-cards.test.ts` 里守的是同一份东西 —— 也就是说,下面这条断言
 * 一旦红了,CI 里早就有另一条红的了。它在这里的意义不是"再守一遍",而是
 * **保证后台那一页不会显示一条红的**:页面上显示的和 CI 里守的必须是同一个
 * 事实,不然管理员看到的体检结论就是假的。
 */
describe('体检页上那几条不变量,现在全部成立', () => {
  for (const invariant of audit.invariants) {
    it(invariant.name, () => {
      expect(invariant.ok, invariant.detail).toBe(true);
    });
  }

  it('不变量一共七条 —— 少了说明有人删掉了体检项', () => {
    expect(audit.invariants).toHaveLength(7);
  });
});

describe('体检指出的真实情况', () => {
  it('17 件工具全部翻过英文', () => {
    expect(audit.counts.translatedTools).toBe(READY_TOOLS.length);
  });

  it('工具箱翻过、维修页没翻 —— 那是产品决定,不是漏做', () => {
    const byslug = new Map(audit.extraPages.map((page) => [page.slug, page]));
    expect(byslug.get(TOOLBOX.slug)?.translated).toBe(true);
    expect(byslug.get(REPAIR.slug)?.translated).toBe(false);
  });

  it('路由总数 = 17 件工具 + 工具箱 + 维修页', () => {
    expect(audit.counts.totalPages).toBe(17 + 2);
    expect(audit.counts.translatedPages).toBe(17 + 1);
  });

  /*
   * **这一条是体检页上唯一一个"指得出空缺"的地方。**
   *
   * `/button-test/` 那一页的目录里没有 `faq` 数组,而 JSON-LD 的 `FAQPage`
   * 节点正是从同一个数组造出来的 —— 所以它同时缺"页面上的问答"和"结构化数据
   * 里的 FAQPage"。这不是推测,是数出来的。
   *
   * 写成断言而不是留个注释:哪天给那一页补上 FAQ,这条会红 —— 那时候该改的
   * 是这里,而不是让体检查页继续报一个已经不存在的空缺。
   */
  it('唯一没有 FAQ 的是 button-test,而且体检如实把它排除在覆盖之外', () => {
    const withoutFaq = audit.rows.filter((row) => !row.hasFaq).map((row) => row.slug);
    expect(withoutFaq).toEqual(['button-test']);
    expect(audit.counts.withFaq).toBe(READY_TOOLS.length - 1);
  });

  it('色相与母题都是满的', () => {
    expect(audit.counts.withHue).toBe(audit.counts.tools);
    expect(audit.counts.withMotif).toBe(audit.counts.tools);
  });
});

describe('体检是纯的', () => {
  it('两次调用得到同样一份结论(没有藏在模块里的可变状态)', () => {
    expect(auditSite()).toEqual(auditSite());
  });
});
