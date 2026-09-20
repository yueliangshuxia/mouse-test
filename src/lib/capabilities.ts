/**
 * 浏览器能力探测。
 *
 * 这个站有一批"测不准"的情况是平台限制造成的,不是 bug:
 * - 未开启跨域隔离时时间戳被钳到 100µs,逐条间隔失去意义(见下面 `COARSE_RESOLUTION_MS`)
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
  /** 是否有精细指针设备(真鼠标)。触屏为 false */
  finePointer: boolean;
  /** 面向用户的告警,按严重程度排列 */
  warnings: string[];
}

/**
 * 未隔离的上下文里,`DOMHighResTimeStamp` 被钳到 100µs(隔离后放开到 5µs)。
 *
 * 这是 Chrome 官方的口径(Chrome 64 起为缓解 Spectre 而降精度,Chrome 91 起
 * 统一到 100µs,并明确"开启跨域隔离可放宽到 5µs")。**实测吻合**:本地
 * `astro dev`(配了 `server.headers`)是 5µs;把 service worker 摘掉模拟
 * GitHub Pages 的原始状态时,`performance.now()` 与 `event.timeStamp`
 * 都落在 100µs 网格上。
 *
 * 线上 `dist/` 的隔离由 `public/coi-serviceworker.js` 提供,所以这里**多数时候
 * 不该走到这条告警**;真走到了就说明 service worker 没注册上(隐私模式之类),
 * 那是诚实的降级,不是故障。
 *
 * 受损的**只有逐条间隔**。回报率页的主口径是"报文数 ÷ 时长",量化只作用在
 * 首尾两个时间戳上,不受这一点限制——所以这里**不再**给"能测到几千 Hz"这种
 * 门槛,那是拍出来的数,不是量出来的。
 */
const COARSE_RESOLUTION_MS = 0.1;

/**
 * 这一页的告警该按什么口径给。
 *
 * `timing` 问的是那一句:**这一页的结论吃不吃"两个事件之间差多久"**。
 *
 * **默认 `true`,不传就是原来的行为** —— 全站绝大多数页面的判据都建立在
 * 时间戳上,所以那十一个既有页面一个字都不用改。
 *
 * 传 `false` 的是只读坐标或只读计数的页面(手稳度只读 x/y)。它们拿到的是
 * **同一份探测结果**,只是不再收到那四条与时间戳有关的告警:在一条根本不读
 * 时间戳的页面上印一句"本页不报抖动和丢包率就是这个原因",那是**假的** ——
 * 那一页不报它们,是因为它压根不测那两样。这正是全站最反对的那种话。
 */
export interface CapabilityOptions {
  timing?: boolean;
}

/**
 * 探测当前环境。
 *
 * 注意:合并事件的 timestamp 是否可用**无法在这里判断**——它只有在真实收到
 * 第一个合并事件时才知道(Firefox 返回 0)。那部分由采样层动态判定并回报。
 */
export function detectCapabilities(options: CapabilityOptions = {}): Capabilities {
  const timing = options.timing ?? true;

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

  if (timing && !secureContext) {
    // Chrome 142 起这条从"建议"变成了"硬性失败",必须放在最前面说。
    warnings.push(
      '当前页面不是安全上下文。Chrome 142 起,只有 HTTPS 页面才能读取合并事件,否则回报率测试会完全失效。请改用 HTTPS 访问。',
    );
  }

  if (timing && !coalescedEvents) {
    warnings.push(
      '当前浏览器不支持 getCoalescedEvents(),测得的回报率上限受屏幕刷新率限制,结果不可信。建议改用最新版 Chrome 或 Edge。',
    );
  }

  if (timing && !crossOriginIsolated) {
    warnings.push(
      // 这条经 showNotice 的 textContent 输出,所以**不能**带 markdown 标记
      // (和 FAQ 那条同一个坑:星号会原样显示)。
      `页面未开启跨域隔离,时间戳精度被钳在 ${COARSE_RESOLUTION_MS * 1000}µs(隔离后 5µs)。` +
        '8000Hz 的报文间隔只有 125µs,和量化台阶同一量级,逐条间隔因此不可用——' +
        '本页不报抖动和丢包率就是这个原因。回报率用的是「报文数 ÷ 时长」,不受这一条限制;' +
        '但 4000Hz 以上浏览器派发事件会打折,请把这个数当下限看。',
    );
  }

  if (timing && !pointerRawUpdate) {
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
    finePointer,
    warnings,
  };
}
