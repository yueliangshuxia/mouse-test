/**
 * 维修页的图。
 *
 * ## 为什么是自己画的线稿,不是照片
 *
 * 仓库是**公开**的,所以网上下载的产品图一律不能用 —— 版权说不清,而且
 * 这类图片往公开仓库里放,以后换域名、被人扒图都是麻烦。商家自己的商品图
 * (淘宝详情页那套)另有问题:那是**广告物料**,蓝渐变加金色立体字,
 * 贴进这个站会当场拆掉两寄存器设计系统(纸面走无彩色、只有三处有颜色,
 * 见 `global.css` 的文件头)。
 *
 * 所以走本站已经有的那条路:内联 SVG 线稿,`currentColor` 描边,一个
 * 写死的颜色都没有。`mouse-figure.ts` 和 `tool-motifs.ts` 都是这么做的,
 * 这里是第三例 —— 好处是一样的:跟着主题走、体积小、可以随便改。
 *
 * **真实照片另外放。** 工作室自己的实拍(拆解图、微动特写、修好的成品)是
 * **内容**,不是界面装饰 —— 和坏点页那五片纯色是同一种例外,可以用彩色。
 * 但那是后面往里填的事,这一版先把形状搭出来。
 *
 * ## 画的为什么就是测试页那只鼠标
 *
 * `REPAIR_HERO_SVG` 的几何和 `MOUSE_FIGURE_SVG` 是**同一只** —— 同样的
 * `viewBox="2 2 52 88"`、同样的圆角矩形外壳、同样五块可拆的部件。
 *
 * 这是有意的:用户是拿着"刚才在上面测出双击"这个结论过来的,让他看到
 * **同一只鼠标**、只是换成了标注拆解区的画法,两边就对得上了。再画一只
 * 长得不一样的鼠标,只会让人怀疑说的是不是同一个东西。
 *
 * 差别只有两处,都是维修页才需要的:
 * - 可维修的那五块从"会亮的部件"变成"标出来的区域"(`__zone`),多一层浅底
 * - 没有 `data-mb`,也没有滚轮那两支方向箭头 —— 这一页不测任何东西,
 *   属性挂钩和方向箭头在这里都是没有含义的装饰
 */
export const REPAIR_HERO_SVG = `
<svg class="repair-figure" viewBox="2 2 52 88" aria-hidden="true" focusable="false">
  <rect class="repair-figure__shell" x="12" y="4" width="40" height="84" rx="14" />
  <path class="repair-figure__zone" d="M32 4 L26 4 A14 14 0 0 0 12 18 L12 44 L32 44 Z" />
  <path class="repair-figure__zone" d="M32 4 L38 4 A14 14 0 0 1 52 18 L52 44 L32 44 Z" />
  <rect class="repair-figure__zone" x="28.5" y="20" width="7" height="16" rx="3.5" />
  <rect class="repair-figure__zone" x="4" y="38" width="10" height="13" rx="3" />
  <rect class="repair-figure__zone" x="4" y="56" width="10" height="13" rx="3" />
</svg>`;
