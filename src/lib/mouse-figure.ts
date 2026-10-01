/**
 * 鼠标的俯视图 —— 一张内联 SVG,五个可亮的部分 + 两支滚轮方向箭头。
 *
 * **两个消费者,一份字面量。** 首页那张合并卡(`mini-devices.ts` 的
 * `mouseButtonsMini`,造进 `ctx.live`)和 `/button-test/` 那一页(写在标记里)
 * 画的是同一只鼠标 —— 和 `keyboard-layout.ts` / `theme.ts` / `mouse-buttons.ts`
 * 是同一个理由:同一个东西有两份拷贝,迟早有一份先被改、另一份静默地旧着。
 *
 * 五个可亮的部分各带一个 `data-mb`,值是**本站编号**
 * (见 `mouse-buttons.ts`:0 左 / 1 中 / 2 右 / 3 侧键4 / 4 侧键5)。
 * 编号既是 `event.button`、又是本站位掩码里的位序,所以消费方那边
 * `mask & (1 << code)` 和 `[data-mb="${code}"]` 说的是同一个键,不需要换算。
 * `tests/mouse-figure.test.ts` 钉着这个对应关系 —— 加第六个键却忘了画那一瓣,
 * 从此是一条红的用例,而不是首页上少亮一块。
 *
 * **这是个固定字面量**,没有任何用户数据拼进来,所以卡片那边走 `innerHTML` 是安全的。
 * 卡片里它**只能**建在 `ctx.live` 里(`start()` 会 `surface.replaceChildren(live)`,
 * 页面渲染进去的东西一开测就被抹掉),所以样式也**只能在 `global.css`**:
 * 运行期 `createElement` 出来的节点拿不到页面 `<style>` 的 `data-astro-cid`。
 * 本页(标记里直接写)本来可以写在页面 `<style>` 里,但它和卡片共用一份长相,
 * 写在 `global.css` 才是这一份拷贝该在的地方。
 *
 * ## 那两支滚轮箭头
 *
 * 滚轮**没有**自己的读数槽,方向就画在这张图上:轮子亮起来,箭头指出朝哪边。
 * 它比一个 `↓` 字符更值 —— 读数槽留给有量纲的数,方向本来就不是。
 *
 * **两条 path 都常驻,靠 `.mouse-figure[data-wheel]` 选中其中一条显示**(默认
 * `opacity: 0`)—— 和 `[data-mb]` 那五个部件同一套"数据在属性上、长相在
 * `global.css` 里"的分工,不靠增减节点。没滚过就什么都不亮,这是全站
 * "没数据不画空槽"的同一条。
 *
 * 两支箭头各 8×8,一上一下:**上箭头在轮子上方(y 8–16)、下箭头跨在按键分缝上
 * (y 38–46,分缝在 y=44)** —— 下半身那点空间只有 8 个单位,而跨分缝正好是
 * 参考图里那支下箭头的长相。viewBox 一个单位都没动。
 *
 * **高度不在这里定。** 两个消费者要的尺寸差着好几倍(卡片 126 / 52,本页自己给),
 * 而卡片那三条尺寸规则全部挂在 `.mini-device[data-mini-kind='mouse-buttons']`
 * 这个钩子上 —— 挂在共用的 `.mouse-figure` 上会让本页跟着卡片一起变。
 */
export const MOUSE_FIGURE_SVG = `
<svg class="mouse-figure" viewBox="2 2 52 88" aria-hidden="true" focusable="false">
  <rect class="mouse-figure__body" x="12" y="4" width="40" height="84" rx="14" />
  <path class="mouse-figure__part" data-mb="0" d="M32 4 L26 4 A14 14 0 0 0 12 18 L12 44 L32 44 Z" />
  <path class="mouse-figure__part" data-mb="2" d="M32 4 L38 4 A14 14 0 0 1 52 18 L52 44 L32 44 Z" />
  <rect class="mouse-figure__part mouse-figure__wheel" data-mb="1" x="28.5" y="20" width="7" height="16" rx="3.5" />
  <rect class="mouse-figure__part" data-mb="3" x="4" y="38" width="10" height="13" rx="3" />
  <rect class="mouse-figure__part" data-mb="4" x="4" y="56" width="10" height="13" rx="3" />
  <path class="mouse-figure__wheel-arrow" data-wheel-dir="up" d="M32 8 L28 16 L36 16 Z" />
  <path class="mouse-figure__wheel-arrow" data-wheel-dir="down" d="M32 46 L28 38 L36 38 Z" />
</svg>`;
