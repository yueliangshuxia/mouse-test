/**
 * 报头那一条横向菜单的**溢出折叠**。
 *
 * 需求是一句话:十个工具排成一行,窗口够宽就全部平铺,不够宽就把尾部那些
 * 收进一个「更多」下拉里。
 *
 * ## 为什么这件事必须有 JS
 *
 * "搬到几个才够"取决于**每一项的实际像素宽度**和**容器当前的实际宽度**,
 * 两者都是渲染之后才有的事实。CSS 能表达"装不下就折行"或"超出就裁掉",
 * 但表达不了"把装不下的那几个挪到另一个盒子里",因为那要求先知道是**哪几个**。
 * 于是只能量。**要尺寸就去量,别算** —— 尤其这里全是中文,字宽估不准。
 *
 * ## 为什么量的是 `--track` 而不是整个 nav
 *
 * 下拉面板是 `position: absolute`,搬进去的项不再参与行内布局,所以每搬一项
 * `--track` 就短一截,"够不够"能一项一项地收敛。如果直接量 nav,面板的宽度
 * 会被算进去,搬多少都不变。
 *
 * ## 顺序:先全部收回,再从前端往下搬
 *
 * 每次重排都**先把所有项收回行内、把「更多」藏起来**,从干净状态重来。
 * 增量式地"再收一个/再放一个"在窗口来回拖动时会漂 —— 上一次的取舍会一直
 * 影响这一次,最后停在一个不是最小的折叠数上。
 */

/** 量出来的差值容得下 1px 的取整误差,不然会永远觉得差一点点 */
const SLACK_PX = 1;

export function mountNavOverflow(nav: Element): void {
  const track = nav.querySelector<HTMLElement>('[data-nav-track]');
  const more = nav.querySelector<HTMLElement>('[data-nav-more]');
  const trigger = nav.querySelector<HTMLElement>('[data-nav-trigger]');
  const panel = nav.querySelector<HTMLElement>('[data-nav-panel]');
  if (!track || !more || !trigger || !panel) return;

  /*
   * **在这里一次性取好,之后不再重新查询。**
   * 这些节点会被搬进搬出,而搬动只改变父子关系、不改变身份,所以同一个
   * 数组在重排之间始终有效 —— 每一次重排都照它的顺序 `appendChild` 回去,
   * 原始顺序因此不会丢。
   */
  const items = Array.from(track.querySelectorAll<HTMLElement>('.site-nav__item'));
  if (items.length === 0) return;

  let open = false;

  function setOpen(next: boolean): void {
    open = next;
    if (next) more!.setAttribute('data-open', '');
    else more!.removeAttribute('data-open');
    trigger!.setAttribute('aria-expanded', next ? 'true' : 'false');
  }

  function fits(): boolean {
    return track!.scrollWidth <= track!.clientWidth + SLACK_PX;
  }

  function layout(): void {
    // 1. 全部收回行内,顺手把下拉收掉 —— 从干净状态重来
    for (const item of items) track!.appendChild(item);
    more!.hidden = true;
    setOpen(false);

    // 装得下就到此为止:宽窗口下报头里一个多余的东西都没有
    if (fits()) return;

    // 2. 装不下才把「更多」放回来,然后从最后一项往前搬,搬一个量一次
    more!.hidden = false;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      panel!.insertBefore(items[i], panel!.firstChild);
      if (fits()) break;
    }
  }

  // ---- 重排的时机 ----

  /*
   * 窗口尺寸变了。用 rAF 合并:拖动窗口边缘时 `resize` 每帧能派发好几次,
   * 而每次重排都会**读写交替**地触发布局,是我们自己给自己制造的抖动。
   */
  let queued = 0;
  function scheduleLayout(): void {
    if (queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      layout();
    });
  }

  window.addEventListener('resize', scheduleLayout);

  /*
   * 字体没就绪之前量出来的宽度是**替身的宽度**。本站用的是系统字体,
   * 正常情况下这一步立刻就完成;留着是为了万一以后换了网络字体 ——
   * 那时候不重排一遍,折叠数会按替身字体定下来,之后再也不会修正。
   */
  document.fonts?.ready.then(layout).catch(() => {});

  // ---- 下拉的开合 ----

  /*
   * **面板"展开"这件事有两份状态,必须一起维护。**
   *
   * CSS 那份(`:hover` / `:focus-within` / `[data-open]`)管的是它**看起来**
   * 开没开;这份 `open` 管的是 `aria-expanded` 说的是什么。CSS 里的 `:hover`
   * 读不出来,所以悬停也得在这里同步一次 —— 少了这一步,读屏用户听到的
   * 展开状态会和眼前看到的不一致。
   *
   * 于是三条路都走同一个 `setOpen`:悬停、键盘焦点、点击。触屏没有悬停,
   * 靠的是点击那条。
   */
  more.addEventListener('pointerenter', () => setOpen(true));
  more.addEventListener('pointerleave', () => setOpen(false));

  more.addEventListener('focusin', () => setOpen(true));
  more.addEventListener('focusout', () => {
    // 焦点在下拉内部移动时 `focusout` 也会派发,等一拍再判断还在不在里面
    queueMicrotask(() => {
      if (!more.contains(document.activeElement)) setOpen(false);
    });
  });

  trigger.addEventListener('click', () => setOpen(!open));
  more.addEventListener('click', (event) => {
    // 点了里面某一项 = 要跳走了,别让下拉停在原地等页面卸载
    if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('pointerdown', (event) => {
    if (!open) return;
    if (event.target instanceof Node && more.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !open) return;
    setOpen(false);
    trigger.focus();
  });

  layout();
}
