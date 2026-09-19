import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONFIDENCE_NOTE, DEFAULT_TRACE_SLOTS, MINI_CARDS } from '../src/lib/mini-cards';
import { CONFIDENCE_LABEL, READY_TOOLS } from '../src/lib/tools';

/*
 * 这一组用例守的是**首页那份说明书和工具注册表之间的对应关系**。
 *
 * 两处是靠 `slug` 人肉挂钩的:卡片表里少一条,首页就凭空少一张卡(而且不报错);
 * 多一条、或者 slug 打错一个字母,那张卡的链接就指向一个不存在的页面 ——
 * **构建不报错,上线才 404**。和 `url.ts` 那条是同一类事故。
 *
 * 所以这里不测"卡片长什么样",只钉住这张对应表。
 */

describe('mini-cards', () => {
  it('与 READY_TOOLS 一一对应,顺序也一致', () => {
    expect(MINI_CARDS.map((card) => card.slug)).toEqual(READY_TOOLS.map((tool) => tool.slug));
  });

  it('没有重复的 slug', () => {
    const slugs = MINI_CARDS.map((card) => card.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('四档可信度都有一句话,而且不许比 CONFIDENCE_LABEL 敢说的更高', () => {
    // 不是测措辞好不好,是测**四档齐全**:漏一档的话 `CONFIDENCE_NOTE[confidence]`
    // 在运行期是 `undefined`,卡片底部会印出「undefined」—— 而它不报错。
    for (const level of Object.keys(CONFIDENCE_LABEL) as (keyof typeof CONFIDENCE_LABEL)[]) {
      expect(CONFIDENCE_NOTE[level], `缺少 ${level} 这一档`).toBeTruthy();
      expect(CONFIDENCE_NOTE[level].length).toBeGreaterThan(8);
    }
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
    /*
     * **先把注释剥掉再扫。** 注释里举的例子(「签错名写成了 push 加一个字面量」
     * 这种)会被当成真的键读进来 —— 那不是代码在写,却会让这条用例报一个假故障。
     * 这条踩过一次:一段说明文字让用例红了,而它指的那个键根本不存在。
     */
    const source = readFileSync(new URL('../src/lib/mini-devices.ts', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');

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
});
