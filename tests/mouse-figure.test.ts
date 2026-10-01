import { describe, expect, it } from 'vitest';
import { BUTTON_CODES } from '../src/lib/mouse-buttons';
import { MOUSE_FIGURE_SVG } from '../src/lib/mouse-figure';

/*
 * 这张图与 `mouse-buttons.ts` 之间是**靠编号约定**接起来的:图上每一瓣带一个
 * `data-mb`,消费方按 `[data-mb="${code}"]` 找节点来点亮它。
 *
 * 这条约定**没有任何类型或运行期机制看着**。加第六个键(比如滚轮左右倾)时,
 * `BUTTONS` 加一行、`eachButtonEdge` 的循环跟着变长,一切照常编译、单测照常全绿 ——
 * 只是**图上没有那一瓣**,于是那个键在首页卡片和 `/button-test/` 上都点不亮。
 * 反过来删掉一瓣也一样:过期的那一瓣永远亮不起来,谁也不报错。
 *
 * 所以这里钉两件事:五个 `data-mb` 的编号集合**恰好等于** `BUTTON_CODES`(不重、
 * 不漏、没有表外的幽灵),以及两支方向箭头都在(少了哪一支,那个方向就静默地不亮)。
 * 这是纯字符串检查,node 环境就够,不需要 DOM。
 */

/** 抓出所有 `data-mb="N"`,按出现顺序 */
function mbCodes(svg: string): number[] {
  return [...svg.matchAll(/data-mb="(\d+)"/g)].map((m) => Number(m[1]));
}

describe('mouse-figure', () => {
  it('五个可亮的部分,编号集合恰好等于 BUTTON_CODES', () => {
    const codes = mbCodes(MOUSE_FIGURE_SVG);

    // 不重:同一瓣写两遍的话,后一个 `[data-mb]` 会覆盖前一个,前一个永远不亮
    expect(new Set(codes).size).toBe(codes.length);
    // 不漏、也没有表外的:排序后逐个对上
    expect([...codes].sort((a, b) => a - b)).toEqual([...BUTTON_CODES].sort((a, b) => a - b));
  });

  it('两支方向箭头都在,而且方向值只有 up / down', () => {
    const dirs = [...MOUSE_FIGURE_SVG.matchAll(/data-wheel-dir="([a-z]+)"/g)].map((m) => m[1]);

    expect([...dirs].sort()).toEqual(['down', 'up']);
  });

  it('图上的类名一律走 `mouse-figure` 前缀', () => {
    /*
     * 它原先叫 `.mini-mouse*` —— 那是首页卡片的 `mini-` 前缀,而这张图现在
     * 也长在 `/button-test/` 上,在页面标记里是个假话。改名之后**样式表是唯一
     * 跟着改的地方**,图上漏改一个类名的话那一瓣会静默地没有长相
     * (元素在、`data-down` 也对,就是不变色)。
     */
    const classes = [...MOUSE_FIGURE_SVG.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/));

    expect(classes.length).toBeGreaterThan(0);
    for (const name of classes) expect(name.startsWith('mouse-figure')).toBe(true);
  });
});
