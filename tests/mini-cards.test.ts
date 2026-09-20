import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONFIDENCE_NOTE, DEFAULT_TRACE_SLOTS, MINI_CARDS } from '../src/lib/mini-cards';
import { CONFIDENCE_LABEL, DIAGNOSTIC_TOOLS, FUN_TOOLS, READY_TOOLS } from '../src/lib/tools';
import type { Confidence } from '../src/lib/tools';

/*
 * 这一组用例守的是**首页那份说明书和工具注册表之间的对应关系**。
 *
 * 两处是靠 `slug` 人肉挂钩的:卡片表里少一条,首页就凭空少一张卡(而且不报错);
 * 多一条、或者 slug 打错一个字母,那张卡的链接就指向一个不存在的页面 ——
 * **构建不报错,上线才 404**。和 `url.ts` 那条是同一类事故。
 *
 * 所以这里不测"卡片长什么样",只钉住这张对应表。
 */

/**
 * `mini-devices.ts` 的源码,**注释已经剥掉**。
 *
 * 剥注释不是洁癖:注释里举的例子(「签错名写成了 `push` 加一个字面量」这种)会被
 * 后面的正则当成真的键读进来 —— 那不是代码在写,却会让用例报一个假故障。
 * 这条踩过一次:一段说明文字让用例红了,而它指的那个键根本不存在。
 *
 * 下面的扫描和 `mini-cards.ts` 是**两个世界共用值**的同一类守护:一处写字符串、
 * 另一处按字符串找,中间没有任何类型能拦住打错的字母。
 */
function driverSource(): string {
  return readFileSync(new URL('../src/lib/mini-devices.ts', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

describe('mini-cards', () => {
  /*
   * 对应的是 `DIAGNOSTIC_TOOLS`,不是 `READY_TOOLS`。
   *
   * 趣味工具**不上首页卡片**(理由写在 `mini-cards.ts` 的文件头),首页那一节
   * 只给两个链接。所以拿 `READY_TOOLS` 去比的话,加一个不上卡片的工具会红成
   * "少了一张卡",而它本来就不该有卡。
   *
   * **判据是"覆盖",不是"一一对应"。** 首页一张卡可以用 `covers` 顶掉几个工具页
   * (前三张并成一张),所以卡片数可以少于诊断工具数。但"每个工具恰好被覆盖一次"
   * 这一条不能松 —— 它才是原来那句"少一条首页就少一张卡"的**准确版本**。
   * 松成"两边都不为空"等于把闸门拆了:漏配一条、或者 `covers` 里打错一个字母,
   * 那个工具就从首页**静默消失**,而构建、类型、其余用例全都不会响。
   */
  it('每个诊断工具恰好被一张卡覆盖,不重不漏', () => {
    const diagnostic = new Set(DIAGNOSTIC_TOOLS.map((tool) => tool.slug));
    const claimed: string[] = [];

    for (const card of MINI_CARDS) {
      expect(diagnostic.has(card.slug), `${card.slug} 不是诊断工具,却占了一张卡`).toBe(true);
      claimed.push(card.slug);
      for (const slug of card.covers ?? []) {
        expect(diagnostic.has(slug), `${card.slug} 声称顶了 "${slug}",但没有这个诊断工具`).toBe(
          true,
        );
        claimed.push(slug);
      }
    }

    // 不重。被 `covers` 认领的工具如果自己也有一张卡,同一页的读数槽会被渲染两遍
    expect(new Set(claimed).size, '有工具被两张卡同时认领').toBe(claimed.length);

    // 不漏。漏掉的那一个会从首页静默消失 —— 这条是整组用例最要紧的一句
    expect([...claimed].sort()).toEqual([...diagnostic].sort());
  });

  it('主工具的顺序跟着 DIAGNOSTIC_TOOLS —— 卡片位置只有一份顺序', () => {
    // 顺序只有一份(`TOOLS`),两片网格是切出来的。合并之后卡片数变了,
    // 但"卡片顺序 = 主工具在注册表里的顺序"这条还得成立,否则合并一张卡
    // 就等于把某几项的位置偷偷挪了。
    const positions = MINI_CARDS.map((card) =>
      DIAGNOSTIC_TOOLS.findIndex((tool) => tool.slug === card.slug),
    );
    expect(positions).not.toContain(-1);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('趣味工具确实没有卡片 —— 有卡片就说明它会被首页当诊断项渲染', () => {
    const carded = new Set(MINI_CARDS.map((card) => card.slug));
    for (const tool of FUN_TOOLS) {
      expect(carded.has(tool.slug), `${tool.slug} 是趣味工具,不该有卡片`).toBe(false);
    }
  });
  /*
   * 跨格(`MiniCard.wide`)唯一的那条不变量:**落位不留空**。
   *
   * 旧的写法是"至多一张卡声明 wide" + "声明了的必须真有 covers",它守的其实是
   * **当初那个数**(8 张卡、1 张跨格 = 9 格铺满三行)的代数推论,而不是那条性质
   * 本身:它连"去掉一张 wide 之后 7 张卡铺成 2+2+1+1+1 = 三行剩两格"也拦不住,
   * 更拦不住 `auto-fit` 的**行中空洞**(一张 wide 卡落在第 2 列时,它后面那一格
   * 谁也填不上)。而现在轨迹卡也跨格了,而它**没有** `covers` —— 旧判据的两条
   * 会同时红,却红在错误的地方。
   *
   * 所以直接算最后剩几个空格:按 `auto-fit` 的稀疏落位从头走一遍,统计"格子数
   * 减卡片占位"。这条比旧的**更强**(一张 wide 都不该有的极端情形它同样挡住),
   * 也不再依赖卡片的总数是几。
   *
   * 这个失败**不报任何错**:类型、构建、其余用例全都不响,只有首页末尾(或行中)
   * 多出一片谁也说不上为什么的空白。
   */
  it('卡片在 3 列下的落位不留空 —— 跨格数与张数的搭配只有一种是对的', () => {
    // 容器封顶 1060 < 四列下界 1248,所以"三列"就是最宽的那一档
    const COLUMNS = 3;

    let row = 0;
    let col = 0;
    for (const card of MINI_CARDS) {
      const span = card.wide ? 2 : 1;
      if (col + span > COLUMNS) {
        row++; // 放不下就换行,前面那几格空着 —— 正是要找的洞
        col = 0;
      }
      col += span;
      if (col === COLUMNS) {
        row++;
        col = 0;
      }
    }

    const cells = MINI_CARDS.reduce((n, card) => n + (card.wide ? 2 : 1), 0);
    const holes = (row + (col ? 1 : 0)) * COLUMNS - cells;

    expect(
      holes,
      `${MINI_CARDS.length} 张卡(${MINI_CARDS.filter((c) => c.wide).length} 张跨格)在 3 列下会空出 ${holes} 格`,
    ).toBe(0);
  });

  it('没有重复的 slug', () => {
    const slugs = MINI_CARDS.map((card) => card.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('卡片上会出现的四档都有一句话,而且不许比 CONFIDENCE_LABEL 敢说的更高', () => {
    // 不是测措辞好不好,是测**四档齐全**:漏一档的话 `CONFIDENCE_NOTE[confidence]`
    // 在运行期是 `undefined`,卡片底部会印出「undefined」—— 而它不报错。
    //
    // 遍历的是 `CONFIDENCE_LABEL` 减去 `'none'`,不是全部五档:第五档
    // 「不测量」**刻意不进这份骨架**,它永远不会出现在首页卡片上(见
    // `mini-cards.ts` 的 `CONFIDENCE_NOTE` 和 `index.astro` 的 `CONFIDENCE_ORDER`)。
    // 这里显式用 `Exclude` 收窄,所以将来再加一档,这一行是**编译错误**。
    const cardLevels = (Object.keys(CONFIDENCE_LABEL) as Confidence[]).filter(
      (level): level is Exclude<Confidence, 'none'> => level !== 'none',
    );
    expect(cardLevels.length).toBeGreaterThan(0);
    for (const level of cardLevels) {
      expect(CONFIDENCE_NOTE[level], `缺少 ${level} 这一档`).toBeTruthy();
      expect(CONFIDENCE_NOTE[level].length).toBeGreaterThan(8);
    }
  });

  it('「不测量」不进首页图例', () => {
    // 这是一条**反向**断言,挡的是"顺手把五档补齐"。
    // 图例解释的是卡片上那枚徽章,而卡片只出诊断工具;给「不测量」也配一句话
    // 会让首页多印一行永远用不到的解释 —— 而它看起来像是补全,不像出错。
    expect(Object.keys(CONFIDENCE_NOTE)).not.toContain('none');
  });

  it('放得进卡片的必须有提示语和读数槽,放不进的必须给出理由', () => {
    for (const card of MINI_CARDS) {
      if (card.kind === null) {
        // 空态那句话在这里没用(槽里放的是 fallback),但理由必须写清楚,
        // 而且得说人话 —— 卡片上就这么一段,写不清楚等于没解释。
        expect(card.fallback, `${card.slug} 说放不进来,却没写为什么`).toBeTruthy();
        expect(card.fallback!.length).toBeGreaterThan(12);
        expect(card.readouts).toHaveLength(0);
      } else {
        // 空态不许是个空框:没数据时不画空槽,那是全站既成规矩
        // (见 global.css 的 `.rate-chart:empty`)。
        expect(card.prompt, `${card.slug} 的装置槽缺提示语`).toBeTruthy();
        expect(card.readouts.length).toBeGreaterThan(0);
        expect(card.fallback, `${card.slug} 放得进卡片,不该有 fallback`).toBeUndefined();
      }
      expect(card.note, `${card.slug} 缺那一声明`).toBeTruthy();
    }
  });

  it('读数槽的 key 在一张卡里不重名 —— 重名会让两个槽抢同一个写入', () => {
    for (const card of MINI_CARDS) {
      const keys = card.readouts.map((readout) => readout.key);
      expect(new Set(keys).size, `${card.slug} 的读数 key 有重名`).toBe(keys.length);
    }
  });

  it('方向带的格数是正整数 —— 它决定页面渲染几个格子', () => {
    // 格数漏了、或者写成 0 和负数,带子就只剩底下那条基线:页面上不报错,
    // 只是永远不出东西。和线接错了是同一类静默失败,所以钉在这里。
    for (const card of MINI_CARDS) {
      for (const readout of card.readouts) {
        if (readout.kind !== 'trace') continue;
        const slots = readout.slots ?? DEFAULT_TRACE_SLOTS;
        expect(
          Number.isInteger(slots) && slots > 0,
          `${card.slug} 的 ${readout.key} 格数不合法:${slots}`,
        ).toBe(true);
      }
    }
  });

  /*
   * 装置那边 `ctx.write('presses')` 的名字必须真的落在某个读数槽上。
   *
   * 写错**不会报任何错**:`write()` 找不到槽就走 `setText(null)` —— 一个空操作,
   * 于是那一格永远是破折号,而没有任何地方提示"线接错了"。这类静默失败正是本站
   * 最该防的东西,所以把它钉在这里。
   *
   * 刻意**不去给工厂和卡片建映射** —— 那要给每个工厂起名,名字迟早和 `DEVICES`
   * 表漂掉。全文件里的 write 键取并集,落进全部卡片的读数键并集即可:打错一个
   * 字母的键不会出现在任何一张卡里,这条判据抓得住。
   */
  it('装置写入的每一个 key 都能找到对应的读数槽', () => {
    const source = driverSource();

    // `.push(` 一起扫:方向带也按 key 挂钩,签错名同样是**静默不画**。
    const written = new Set(
      [...source.matchAll(/\.(?:write|push)\(\s*'([^']+)'/g)].map((match) => match[1]),
    );
    const declared = new Set(MINI_CARDS.flatMap((card) => card.readouts.map((r) => r.key)));

    // 先确认真的扫到了东西 —— 一个空集合会让下面的断言永远通过(假绿)
    expect(written.size).toBeGreaterThan(8);

    for (const key of written) {
      expect(declared.has(key), `mini-devices.ts 往 "${key}" 写,但没有任何读数槽叫这个名字`).toBe(
        true,
      );
    }
  });

  /*
   * 模式表本身的完整性。
   *
   * `key` 打错一个字母不会报任何错:按钮照旧能按、照旧高亮,而 `ctx.mode` 永远
   * 不等于它 —— 工厂于是**静默地**跑在另一套口径上。和 `write()` 签错名是同一类
   * 事故,所以钉在同一层。
   */
  it('模式表的 key 唯一、有标签,而且至多一个默认', () => {
    for (const card of MINI_CARDS) {
      const modes = card.modes ?? [];
      const keys = modes.map((mode) => mode.key);
      expect(new Set(keys).size, `${card.slug} 的模式 key 有重名`).toBe(keys.length);
      expect(
        modes.filter((mode) => mode.default).length,
        `${card.slug} 声明了不止一个默认模式 —— 默认是哪一个会变成源码顺序说了算`,
      ).toBeLessThan(2);
      for (const mode of modes) {
        expect(mode.key, `${card.slug} 有一个模式没写 key`).toBeTruthy();
        expect(mode.label, `${card.slug} 的模式 ${mode.key} 没写标签`).toBeTruthy();
      }
    }
  });

  /*
   * 装置比对过的模式 key 必须真的存在。
   *
   * `ctx.mode === 'five'` 里的字面量写在 `mini-devices.ts`,而 key 写在
   * `mini-cards.ts` —— **一个字符串横跨两个文件**。改了一处,那一整段分支就永远
   * 走不到,而按钮照旧亮、页面照旧不报错,只是那个模式悄悄变成了另一个模式的行为。
   * 这正是上面 `write()` 那条扫的是同一类东西,所以用同一个办法扫。
   */
  it('装置比对过的模式 key 都在卡片表里', () => {
    const source = driverSource();
    const compared = new Set(
      [...source.matchAll(/ctx\.mode\s*===\s*'([^']+)'/g)].map((match) => match[1]),
    );

    // 一个空集合会让下面那个循环永远通过(假绿),所以先确认扫到了东西
    expect(compared.size).toBeGreaterThan(0);

    const declared = new Set(
      MINI_CARDS.flatMap((card) => (card.modes ?? []).map((mode) => mode.key)),
    );
    for (const key of compared) {
      expect(declared.has(key), `mini-devices.ts 比对了模式 "${key}",但没有任何卡片声明它`).toBe(
        true,
      );
    }
  });

  /*
   * 卡头那枚重置按钮的挂钩:`data-mini-reset` 写在 `MiniCard.astro`,
   * 读在 `mini-devices.ts` 的 `card.querySelector('[data-mini-reset]')`。
   *
   * **又一个字符串横跨两个文件**,而且失败得比上面两条都安静:对不上时
   * `querySelector` 返回 `null`,`resetButton?.addEventListener` 那个 `?.` 让它
   * 变成一句空操作 —— 按钮照旧渲染、照旧有悬停态、按下去了什么也不发生,
   * 没有异常、没有告警、没有红。和 `write()` 签错名是同一类事故。
   *
   * 顺带钉住"哪些卡有按钮":判据是 `spec.kind !== null`,写错成无条件渲染的话,
   * 三张纯说明的卡会多出一枚**按下去没有任何反应**的按钮 —— 那也是静默的。
   */
  it('重置按钮的挂钩在模板和驱动两边对得上,而且只给带装置的卡', () => {
    const astro = readFileSync(new URL('../src/components/MiniCard.astro', import.meta.url), 'utf8');
    const driver = driverSource();

    const attr = astro.indexOf('data-mini-reset');
    expect(attr, 'MiniCard.astro 里没有 data-mini-reset').toBeGreaterThan(-1);
    // 只该有一处:复制粘贴出一份的话,`querySelector` 只会命中最先那个
    expect(astro.indexOf('data-mini-reset', attr + 1), 'data-mini-reset 出现了不止一次').toBe(-1);
    // 驱动那边要按同一个字面量去找
    expect(driver, 'mini-devices.ts 没有按 [data-mini-reset] 去找').toContain("'[data-mini-reset]'");
    // 渲染它的那个条件必须是 `kind !== null`,不能无条件
    expect(
      astro.slice(0, attr),
      'data-mini-reset 前面没有 spec.kind !== null 那个守卫 —— 三张纯说明的卡会多出一枚没作用的按钮',
    ).toContain('spec.kind !== null');
  });

  /*
   * 四个装置工厂**每一个都注册了重置回调**。
   *
   * 驱动的重置只清两样东西:读数槽(`outputs`)和方向带(`traces`)。工厂画进
   * `ctx.live` 里的一切 —— 大数字、说明字、画布、鼠标图、chip —— **都得由它
   * 自己清**,而没有任何类型或运行时机制要求它这么做:少注册一个(`onReset`
   * 是可选的调用,不是必实现的成员),那张卡重置之后就**只清了一半**,
   * 剩下半截旧读数挂在那儿冒充新结果。所以按 `MiniFactory` 的声明把源码切成
   * 四段,逐段找一个 `ctx.onReset(`。
   *
   * 先确认扫到了东西:一段都切不出来时下面的循环是空的,那种假绿正是这条要防的。
   */
  it('每一个装置工厂都注册了重置回调', () => {
    const source = driverSource();
    const decls = [...source.matchAll(/const\s+\w+Mini\s*:\s*MiniFactory\s*=/g)];
    expect(decls.length, '一个 MiniFactory 都没扫到,正则或写法变了').toBeGreaterThan(0);

    // 最后一段切到装置表为止,免得把驱动自己的代码也算进某个工厂里
    const table = source.indexOf('const DEVICES');
    expect(table, '找不到 const DEVICES —— 切分边界变了').toBeGreaterThan(-1);

    for (let i = 0; i < decls.length; i++) {
      const start = decls[i].index ?? 0;
      const end = i + 1 < decls.length ? (decls[i + 1].index ?? source.length) : table;
      const name = source.slice(start, start + 40).replace(/\s+/g, ' ');
      expect(source.slice(start, end), `${name} 没有注册 ctx.onReset —— 重置只会清掉一半`).toContain(
        'ctx.onReset(',
      );
    }
  });
});

/*
 * 首页两片网格的分组不变量。
 *
 * `index.astro` 是按 `group` 把 `READY_TOOLS` 切成两片渲染的:诊断工具一片、
 * 趣味功能一片。这个切法有一个静默失败 —— **新加的工具忘了填 `group`**,
 * 或者填了个没人在过滤的值,那一项就会**从首页上凭空消失**,而构建、类型、
 * 上面那条"与 READY_TOOLS 一一对应"的用例**全都不会响**(卡片表里它还在)。
 *
 * 所以这里钉的是"这个划分是完整的":两边合起来必须一个字不差地等于
 * `READY_TOOLS`,既不重也不漏。`Tool.group` 是必填字段,typecheck 只能拦住
 * "没写",拦不住"写了个别的值",这条用例补上那一半。
 */
describe('首页分组', () => {
  it('诊断 + 趣味 恰好等于 READY_TOOLS,不重不漏', () => {
    const grouped = [...DIAGNOSTIC_TOOLS, ...FUN_TOOLS].map((tool) => tool.slug);
    expect(grouped.slice().sort()).toEqual(READY_TOOLS.map((tool) => tool.slug).sort());
  });

  it('两片都不是空的', () => {
    // 空的那一片会让首页多出一个只有标题、没有卡片的空节 ——
    // `index.astro` 不判断空集,会老老实实渲染一个空网格
    expect(DIAGNOSTIC_TOOLS.length).toBeGreaterThan(0);
    expect(FUN_TOOLS.length).toBeGreaterThan(0);
  });

  it('每一片都保持了 READY_TOOLS 的顺序', () => {
    // 顺序只有一份:两片是"切"出来的,不是各自排的。
    // 切出来的子序列必然保序 —— 这条就是防止有人日后改成手工列两份。
    for (const slice of [DIAGNOSTIC_TOOLS, FUN_TOOLS]) {
      const positions = slice.map((tool) => READY_TOOLS.indexOf(tool));
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
  });
});
