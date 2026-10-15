/**
 * 站点体检 —— **纯注册表 + 目录派生,一行数据库都不碰,也不读任何源文件。**
 *
 * 它把仓库里几处"要靠人记着"的事实集中算一遍,好让它们在后台的一页上被看见:
 * 哪件工具有色相没母题、哪一页还没翻英文、哪一页没有 FAQ。**这些都是静默的** ——
 * 少一个母题不会报错,只是工具箱那一格空着;没翻英文不会报错,只是英文访客
 * 落到中文页。
 *
 * ## 为什么读的是目录,不是源码文件
 *
 * 「这一页有没有 FAQ」本来是源码里的事(`<dl class="faq">` 在不在)。但读源文件
 * 有两条死路:构建产物里没有 `src/`(部署后 `readFileSync` 会静默找不到),
 * 而用 `import.meta.glob('?raw')` 把源码打进 bundle 又会把整棵页面源码拖进
 * 服务端产物。
 *
 * 好在**有一个等价的判据住在数据里**:每一页的目录条目带不带 `faq` 数组。
 * JSON-LD 里那个 `FAQPage` 节点就是从同一个数组造出来的,所以这一个判据**同时
 * 管着两件事**(页面上有没有问答、结构化数据里有没有 FAQPage)。这一条是
 * 2026-10-15 数过一遍确认的:19 页里 17 页有,`button` 与 `home` 没有。
 *
 * 于是整页体检没有任何 I/O,可以在单测里被完整覆盖。
 */

import {
  CONFIDENCE_LABEL,
  DIAGNOSTIC_TOOLS,
  FUN_TOOLS,
  NAV,
  READY_TOOLS,
  REPAIR,
  TOOLBOX,
} from './tools';
import type { Confidence } from './tools';
import { TOOL_HUE } from './tool-hues';
import { TOOL_MOTIF } from './tool-motifs';
import { CATALOGS, TRANSLATED_SLUGS } from './i18n';

/** 这件工具在报头里的位置:`group` 是框里那一段,`dropdown` 是「更多 / 工具箱」那个面板。 */
export type NavSlot = 'group' | 'dropdown' | 'none';

export interface AuditRow {
  slug: string;
  name: string;
  group: 'diagnostic' | 'fun';
  confidence: Confidence;
  confidenceLabel: string;
  hue: boolean;
  motif: boolean;
  nav: NavSlot;
  translated: boolean;
  hasFaq: boolean;
}

export interface AuditInvariant {
  name: string;
  ok: boolean;
  /** 不通过时说明差在哪儿;通过时给一句"守的是什么"。 */
  detail: string;
}

export interface SiteAudit {
  rows: AuditRow[];
  counts: {
    tools: number;
    diagnostic: number;
    fun: number;
    /** 已经翻成英文的工具页 */
    translatedTools: number;
    /** 全站已翻页数(含工具箱、含英文首页),分母是路由总数 */
    translatedPages: number;
    totalPages: number;
    withFaq: number;
    withHue: number;
    withMotif: number;
  };
  /** 非工具的两个页面,单独列 —— 它们没有 `Tool` 的那些字段可填。 */
  extraPages: Array<{ slug: string; label: string; translated: boolean }>;
  invariants: AuditInvariant[];
}

/**
 * 这一页的目录里有没有 `faq` 数组。
 *
 * `pageCopyBySlug()` 的返回类型是**刻意收窄**的(只有 slug / meta 三样),拿不到
 * `faq` —— 那个函数是给工具箱清单页取"说明文字"用的,收窄正是它的本分。所以
 * 这里直接走目录,并用一次断言把结构问题问出来。
 *
 * 断言是必要的,不是偷懒:每一页目录的形状本来就各不相同(有的有 `faq`、
 * 有的有 `steps`、有的有 `points`),`Object.values` 出来的是一个**并集**,
 * TypeScript 没法给出一个统一的 `faq` 属性。而这里问的正是一个**结构问题**
 * (「这一份条目里有没有这个键」),不是"取值"。
 */
function hasFaq(slug: string): boolean {
  for (const page of Object.values(CATALOGS.zh.pages) as Array<Record<string, unknown>>) {
    if (page.slug !== slug) continue;
    return Array.isArray(page.faq) && page.faq.length > 0;
  }
  return false;
}

function navSlotOf(slug: string): NavSlot {
  if (NAV.group.some((tool) => tool.slug === slug)) return 'group';
  if (NAV.dropdown.some((tool) => tool.slug === slug)) return 'dropdown';
  return 'none';
}

function hasToolCopy(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(CATALOGS.zh.tools, slug);
}

export function auditSite(): SiteAudit {
  const rows: AuditRow[] = READY_TOOLS.map((tool) => ({
    slug: tool.slug,
    name: tool.name,
    group: tool.group,
    confidence: tool.confidence,
    confidenceLabel: CONFIDENCE_LABEL[tool.confidence],
    hue: Boolean(TOOL_HUE[tool.slug]),
    motif: Boolean(TOOL_MOTIF[tool.slug]),
    nav: navSlotOf(tool.slug),
    translated: TRANSLATED_SLUGS.has(tool.slug),
    hasFaq: hasFaq(tool.slug),
  }));

  const extraPages = [
    { slug: TOOLBOX.slug, label: TOOLBOX.navLabel, translated: TRANSLATED_SLUGS.has(TOOLBOX.slug) },
    { slug: REPAIR.slug, label: REPAIR.navLabel, translated: TRANSLATED_SLUGS.has(REPAIR.slug) },
  ];

  // 分母 = 路由总数(17 个工具页 + 工具箱 + 维修页),和 `tests/nav.test.ts`
  // 那张 existsSync 表是同一份口径。**不含首页与 404** —— 首页是站点根,
  // 404 不在任何注册表里(它是被访问出来的,不是被链接出来的)。
  const totalPages = READY_TOOLS.length + extraPages.length;
  const translatedPages =
    rows.filter((row) => row.translated).length + extraPages.filter((page) => page.translated).length;

  const counts = {
    tools: rows.length,
    diagnostic: DIAGNOSTIC_TOOLS.length,
    fun: FUN_TOOLS.length,
    translatedTools: rows.filter((row) => row.translated).length,
    translatedPages,
    totalPages,
    withFaq: rows.filter((row) => row.hasFaq).length,
    withHue: rows.filter((row) => row.hue).length,
    withMotif: rows.filter((row) => row.motif).length,
  };

  /*
   * 这几条**不是新的判断**,而是把 `tests/` 里已经在守的不变量在页面上重算一遍
   * —— 单测在 CI 里跑,管理员在后台里看。两边共用同一份注册表,所以不会出现
   * "测试说没问题、页面上却是红的"。
   *
   * 判据全部写成**集合层面**的比较,不写成"第 0 项等于什么":
   * 顺序会变(键盘就从框里挪进过下拉),而不重不漏不会。
   */
  const diagnosticSlugs = DIAGNOSTIC_TOOLS.map((tool) => tool.slug);
  const funSlugs = FUN_TOOLS.map((tool) => tool.slug);
  const parted = [...diagnosticSlugs, ...funSlugs];
  const readies = READY_TOOLS.map((tool) => tool.slug);

  const navSlugs = [...NAV.group.map((t) => t.slug), ...NAV.dropdown.map((t) => t.slug)];

  const missingHue = rows.filter((row) => !row.hue).map((row) => row.slug);
  const missingMotif = rows.filter((row) => !row.motif).map((row) => row.slug);
  // 「工具箱」那个面板里每一件都要画一个小预览,所以缺母题在那里是**看得见的**
  // 一块空白(而缺色相只是没颜色)。分开报,因为后果不一样。
  const dropdownMissingMotif = NAV.dropdown
    .filter((tool) => !TOOL_MOTIF[tool.slug])
    .map((tool) => tool.slug);
  const missingCopy = READY_TOOLS.filter((tool) => !hasToolCopy(tool.slug)).map((tool) => tool.slug);
  // `tools` 命名空间装的是**名字与报头短名**,20 个 slug 都该在(17 件工具 +
  // 工具箱 + 维修页)。多一个少一个都说明注册表和目录分了家。
  const copyCount = Object.keys(CATALOGS.zh.tools).length;
  const expectedCopyCount = READY_TOOLS.length + extraPages.length;

  const invariants: AuditInvariant[] = [
    {
      name: '诊断 + 趣味 = 全部已上线工具',
      ok: parted.length === readies.length && new Set(parted).size === parted.length,
      detail:
        parted.length === readies.length
          ? `${parted.length} 件,不重不漏`
          : `拼起来 ${parted.length} 件、去重后 ${new Set(parted).size} 件,而总数是 ${readies.length} 件`,
    },
    {
      name: '报头两段拼起来 = 全部已上线工具',
      ok: navSlugs.length === readies.length && new Set(navSlugs).size === navSlugs.length,
      detail: `框里 ${NAV.group.length} 件 + 面板里 ${NAV.dropdown.length} 件 = ${navSlugs.length} 件,去重后 ${new Set(navSlugs).size} 件`,
    },
    {
      name: '每件工具都有色相',
      ok: missingHue.length === 0,
      detail: missingHue.length === 0 ? `${rows.length} 件全有` : `缺:${missingHue.join('、')}`,
    },
    {
      name: '每件工具都有母题',
      ok: missingMotif.length === 0,
      detail: missingMotif.length === 0 ? `${rows.length} 件全有` : `缺:${missingMotif.join('、')}`,
    },
    {
      name: '工具箱面板里每一项都有预览母题',
      ok: dropdownMissingMotif.length === 0,
      detail:
        dropdownMissingMotif.length === 0
          ? `${NAV.dropdown.length} 件全有`
          : `缺:${dropdownMissingMotif.join('、')}(那一格会是空白)`,
    },
    {
      name: '每件工具在中文目录里都有名字',
      ok: missingCopy.length === 0,
      detail: missingCopy.length === 0 ? `${rows.length} 件全有` : `缺:${missingCopy.join('、')}`,
    },
    {
      name: '中文目录里的工具条目数对得上注册表',
      ok: copyCount === expectedCopyCount,
      detail: `目录 ${copyCount} 条 / 应有 ${expectedCopyCount} 条(17 件工具 + 工具箱 + 维修页)`,
    },
  ];

  return { rows, counts, extraPages, invariants };
}
