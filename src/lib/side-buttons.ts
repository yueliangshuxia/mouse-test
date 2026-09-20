/**
 * 拦截鼠标侧键触发的浏览器前进/后退。
 *
 * 鼠标的 X1/X2 键在浏览器里被硬绑定成「后退 / 前进」。Chrome 67 起会把这两次
 * 点击如实派发成 `button` 为 3(后退)和 4(前进)的 `mousedown` / `mouseup`,
 * 并且**把导航当作 `mousedown` 的默认行为**——只要在事件里调用
 * `preventDefault()`,浏览器就不再执行那次跳转。
 * WPT 的 `pointerlock/mouse_buttons_back_forward-manual.html` 就是照这个行为写的。
 *
 * 对本站来说这不是可有可无的礼貌。按键测试页的全部意义就是让用户逐个按过去,
 * 而「按一下侧键就被弹回上一页」会让那一页根本没法用:计数清零、测试中断,
 * 用户还得自己划回来——而且他会以为是鼠标坏了。
 *
 * 监听挂在 `window` 上并用**捕获阶段**,有两个理由:
 *
 * - 要拦的范围由 `scope` 参数决定,而**判据得自己算**。挂在区域元素上做不到
 *   这件事:用户盯着按键卡片看的时候,指针多半停在卡片上而不是下面的测试区,
 *   挂在测试区上的监听会整片漏掉。
 * - 赶在页面上任何 `stopPropagation()` 之前执行。默认行为虽然是在整个派发
 *   结束后才结算的,但捕获阶段先跑能让这条规则不受下游代码影响。
 *
 * 刻意不加 `passive`:要的就是取消默认行为。
 */

/** `MouseEvent.button`:3 = 后退(X1),4 = 前进(X2) */
export const SIDE_BUTTON_BACK = 3;
export const SIDE_BUTTON_FORWARD = 4;

/**
 * 让本页的鼠标侧键不再触发浏览器前进/后退。
 *
 * **不给 `scope` 就是整页拦** —— 工具页要的是这一版:那一页整个就是测试面,
 * 指针停在哪儿按下去都是在测,和位置无关。
 *
 * **给一个 `scope` 就只在"按下点落在它里面"时拦** —— 首页要的是这一版。
 * 那边是一篇正文,八张卡只是它中间的一节;整页拦会让读者习惯性的
 * "按侧键回上一页"在整篇文章上变成没反应,和右键菜单被吃掉是同一类耍横。
 *
 * 判据直接用 `event.target`,不记"上一次按在哪儿"(工具页那套边界判据需要它,
 * 是因为拖拽时指针会离开起始元素)。侧键的导航是**这一次按下**的默认行为,
 * 不涉及拖动 —— 按下那一刻指针在哪儿,`target` 就是哪儿。
 *
 * 返回一个卸载函数,便于调用方只想在一段时间内(比如测试进行中)拦截。
 */
export function suppressSideButtonNavigation(scope?: Element): () => void {
  const block = (event: MouseEvent): void => {
    if (event.button !== SIDE_BUTTON_BACK && event.button !== SIDE_BUTTON_FORWARD) return;
    if (scope && !(event.target instanceof Node && scope.contains(event.target))) return;
    event.preventDefault();
  };

  const options: AddEventListenerOptions = { capture: true };

  // mousedown 是真正决定导航的那一次——默认行为挂在它身上。mouseup 和 auxclick
  // 一起拦是因为各家实现略有出入(Firefox 的时序和 Chrome 不完全一致),
  // 多拦一次不花钱,漏拦一次用户就被弹走了。
  window.addEventListener('mousedown', block, options);
  window.addEventListener('mouseup', block, options);
  window.addEventListener('auxclick', block, options);

  return () => {
    window.removeEventListener('mousedown', block, options);
    window.removeEventListener('mouseup', block, options);
    window.removeEventListener('auxclick', block, options);
  };
}
