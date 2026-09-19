/**
 * 浏览器能力探测。
 *
 * 这个站有一批"测不准"的情况是平台限制造成的,不是 bug:
 * - 未开启跨域隔离时计时器被钳到 100µs,8000Hz(间隔 125µs)根本分辨不出来
 * - Firefox 把合并事件的 timestamp 设为 0,拿不到间隔分布
 * - 触屏没有左右键和滚轮
 *
 * 本模块负责在页面启动时把这些探测出来,交给 UI 如实告知用户。
 * **宁可说"测不了",也不要给一个看起来精确的假数字。**
 */

export interface Capabilities {
  /** PointerEvent 是否可用。为 false 时测试完全无法运行 */
  pointerEvents: boolean;
  /** 是否支持 getCoalescedEvents()——回报率测量超过刷新率的前提 */
  coalescedEvents: boolean;
  /**
   * 是否**可能**收到 pointerrawupdate。它不等待下一帧,是精度优先时的首选通道。
   *
   * 注意:这只是特性探测的结果。Chrome 142+ 起该事件只在安全上下文中派发,
   * 而非安全上下文里这个特性检测仍然为 true——事件却永远不会来。所以采样层
   * 不靠它做决策,而是让真实派发来投票,这里只用于给用户提示。
   */
  pointerRawUpdate: boolean;
  /**
   * 是否处于安全上下文(HTTPS 或 localhost)。Chrome 142+ 起
   * `getCoalescedEvents()` 与 `pointerrawupdate` 都只在安全上下文暴露,
   * 非 HTTPS 页面上回报率测试会直接失去意义。
   */
  secureContext: boolean;
  /** 页面是否处于跨域隔离状态 */
  crossOriginIsolated: boolean;
  /** 计时精度的人类可读描述 */
  timerResolution: string;
  /**
   * 计时精度是否足以分辨 8000Hz。
   * 8000Hz 的间隔是 125µs,100µs 的量化精度下只会被测成 100 或 200,分辨不了。
   */
  canMeasureHighRates: boolean;
  /** 是否有精细指针设备(真鼠标)。触屏为 false */
  finePointer: boolean;
  /** 面向用户的告警,按严重程度排列 */
  warnings: string[];
}

/** 理论上,未隔离的上下文计时器被钳到 100µs。 */
const COARSE_RESOLUTION_MS = 0.1;

/**
 * 探测当前环境。
 *
 * 注意:合并事件的 timestamp 是否可用**无法在这里判断**——它只有在真实收到
 * 第一个合并事件时才知道(Firefox 返回 0)。那部分由采样层动态判定并回报。
 */
export function detectCapabilities(): Capabilities {
  const pointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;
  const coalescedEvents =
    pointerEvents && typeof PointerEvent.prototype.getCoalescedEvents === 'function';
  const crossOriginIsolated =
    typeof self !== 'undefined' && 'crossOriginIsolated' in self
      ? Boolean((self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated)
      : false;

  const pointerRawUpdate =
    typeof window !== 'undefined' && 'onpointerrawupdate' in window;

  const secureContext =
    typeof self !== 'undefined' && 'isSecureContext' in self
      ? Boolean((self as unknown as { isSecureContext?: boolean }).isSecureContext)
      : false;

  const finePointer =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: fine)').matches
      : false;

  const warnings: string[] = [];

  if (!pointerEvents) {
    warnings.push('当前浏览器不支持 Pointer Events,无法运行测试。请升级浏览器。');
  }

  if (!secureContext) {
    // Chrome 142 起这条从"建议"变成了"硬性失败",必须放在最前面说。
    warnings.push(
      '当前页面不是安全上下文。Chrome 142 起,只有 HTTPS 页面才能读取合并事件,否则回报率测试会完全失效。请改用 HTTPS 访问。',
    );
  }

  if (!coalescedEvents) {
    warnings.push(
      '当前浏览器不支持 getCoalescedEvents(),测得的回报率上限受屏幕刷新率限制,结果不可信。建议改用最新版 Chrome 或 Edge。',
    );
  }

  if (!crossOriginIsolated) {
    warnings.push(
      `页面未开启跨域隔离,计时精度被限制在 ${COARSE_RESOLUTION_MS * 1000}µs。` +
        '回报率在 1000Hz 以内仍然可靠,但 2000Hz 及以上无法准确分辨。',
    );
  }

  if (!pointerRawUpdate) {
    warnings.push(
      '当前浏览器不支持 pointerrawupdate,采样会被对齐到屏幕刷新率再派发,时间戳带有批处理延迟。结果可用,但精度不如 Chrome 或 Edge。',
    );
  }

  if (!finePointer) {
    warnings.push(
      '检测不到鼠标等精细指针设备。触屏没有左右键和滚轮,大部分测试在触屏上无法进行。',
    );
  }

  return {
    pointerEvents,
    coalescedEvents,
    pointerRawUpdate,
    secureContext,
    crossOriginIsolated,
    timerResolution: crossOriginIsolated ? '5µs 或更好' : '100µs 或更粗',
    canMeasureHighRates: crossOriginIsolated,
    finePointer,
    warnings,
  };
}
