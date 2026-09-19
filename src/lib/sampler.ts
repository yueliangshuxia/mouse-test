/**
 * 指针采样层。
 *
 * 这一层是**薄**的:回调里只往预分配的 TypedArray 写数,不碰 DOM、不绘制、
 * 不做统计。原因是 1000Hz 鼠标每秒产生 1000 个事件,回调里放任何 DOM 操作
 * 都会直接拖垮测量精度——正是我们想测的东西会被自己的代码污染。
 *
 * 复杂度全部在 `analysis.ts`(纯函数、可单测),这里只负责忠实记录。
 */

/**
 * 采样缓冲区。
 *
 * 用 TypedArray 而非对象数组:**后者会产生大量短命对象,GC 一跑就是几毫秒的
 * 停顿,而这几毫秒会被如实记录成"丢帧"**,凭空造出硬件故障的假象。
 */
/** `SampleBuffer.flags`:这一条采样之前有报文因时间戳重复而被丢弃(计时精度不足)。 */
export const FLAG_DUPLICATE_TIMESTAMP = 1;
/** `SampleBuffer.flags`:这一条采样之前有报文因时间戳倒序而被丢弃(真正的顺序异常)。 */
export const FLAG_OUT_OF_ORDER_TIMESTAMP = 2;

export interface SampleBuffer {
  /** event.timeStamp(毫秒) */
  t: Float64Array;
  /** clientX */
  x: Float32Array;
  /** clientY */
  y: Float32Array;
  /** 按键位掩码:1=左 2=右 4=中 8=侧键4 16=侧键5 */
  buttons: Uint8Array;
  /**
   * 位标记,取值见 `FLAG_*`。**被拒的采样本身没有槽位**,所以标记记在
   * 它后面第一条被接受的采样上——位置差一条,对窗口统计没有影响。
   *
   * 之所以要按样本存而不是记一个总数:分析窗口只取缓冲区末尾的一段,
   * 而用户画圈的速度是先慢后快的。累计总数会被开头那几秒稀释掉,
   * 让"计时精度够不够"这个判断变得迟钝——而它恰恰是最该及时反映的东西。
   */
  flags: Uint8Array;
  /** 已写入的样本数 */
  n: number;
  capacity: number;
}

/**
 * 时间戳模式,**在收到第一个合并事件时才确定**。
 *
 * - `per-sample`:每个合并事件带自己的 timestamp(Chrome/Edge)。可以做间隔分布、抖动分析。
 * - `aggregate`:合并事件 timestamp 恒为 0(Firefox)。只能数个数算平均 Hz,
 *   **抖动和丢帧分析做不了**。缓冲区里只记录被派发的那一层事件。
 */
export type TimestampMode = 'unknown' | 'per-sample' | 'aggregate';

/**
 * 实际生效的采样通道,**在收到第一个事件时才确定**。
 *
 * - `pointerrawupdate`:Chrome 77+ / Firefox 140+。**不等待下一帧**,规范要求
 *   "尽快以很高频率派发"。这是精度优先时的首选。
 * - `pointermove`:回退通道。Chrome 把它对齐到 requestAnimationFrame 之前,
 *   事件因此被攒成批,时间戳带上批处理涂抹——这是浏览器端测量误差的主要来源。
 */
export type SamplerChannel = 'none' | 'pointerrawupdate' | 'pointermove';

export interface Sampler {
  readonly buffer: SampleBuffer;
  /**
   * 浏览器实际收到的原始上报次数,含被合并进列表里的那些。
   *
   * 逐采样模式下它约等于 `buffer.n`;聚合模式下**大于** `buffer.n`——那里每个
   * 被派发的事件只落一条样本,而一次派发背后可能是好几个硬件报文。
   */
  readonly reportedSamples: number;
  readonly timestampMode: TimestampMode;
  readonly coalescedSupported: boolean;
  readonly channel: SamplerChannel;
  /** 缓冲区写满过,后续样本被丢弃 */
  readonly overflowed: boolean;
  /** 收到过 pointercancel——通常指向驱动或设备层问题 */
  readonly cancelled: boolean;
  readonly running: boolean;
  /** 开始采样。已在运行则无操作 */
  start(): void;
  /** 暂停采样,缓冲区内容保留。可反复 start/stop */
  stop(): void;
  reset(): void;
  destroy(): void;
}

export interface SamplerOptions {
  /**
   * 缓冲区容量。默认 120000 条,按 8000Hz 算够采 15 秒,
   * 按 1000Hz 算够采 120 秒。每个采样占 8+4+4+1 = 17 字节。
   */
  capacity?: number;
  /** 用 setPointerCapture 保证指针移出元素后仍持续收到事件 */
  capture?: boolean;
}

const DEFAULT_CAPACITY = 120_000;

export function createBuffer(capacity = DEFAULT_CAPACITY): SampleBuffer {
  return {
    t: new Float64Array(capacity),
    x: new Float32Array(capacity),
    y: new Float32Array(capacity),
    buttons: new Uint8Array(capacity),
    flags: new Uint8Array(capacity),
    n: 0,
    capacity,
  };
}

export function resetBuffer(buffer: SampleBuffer): void {
  buffer.n = 0;
}

export function createMoveSampler(
  element: HTMLElement,
  options: SamplerOptions = {},
): Sampler {
  const capacity = options.capacity ?? DEFAULT_CAPACITY;
  const buffer = createBuffer(capacity);
  const useCapture = options.capture ?? true;

  /** 累积到**下一条被接受的采样**上的标记,见 SampleBuffer.flags */
  let pendingFlags = 0;
  let reportedSamples = 0;
  let timestampMode: TimestampMode = 'unknown';
  let channel: SamplerChannel = 'none';
  let overflowed = false;
  let cancelled = false;
  let running = false;

  /** 上一条被接受的采样时间戳,用于强制单调递增 */
  let lastTimeStamp = Number.NEGATIVE_INFINITY;

  const coalescedSupported =
    typeof PointerEvent !== 'undefined' &&
    typeof PointerEvent.prototype.getCoalescedEvents === 'function';

  const rawUpdateSupported =
    typeof window !== 'undefined' && 'onpointerrawupdate' in window;

  /** 写入一条样本。返回 false 表示缓冲区已满。 */
  function push(t: number, x: number, y: number, buttons: number): boolean {
    // 时间戳必须严格递增。合并事件列表里可能带着父事件的克隆,而父事件的时间戳
    // 是 rAF 重采样过的(可能与上一条相同甚至更早);不拦住的话会写进间隔为 0
    // 甚至为负的样本,把 Hz 算到荒谬的值。
    //
    // 两种"不递增"要分开记账:相等是**计时器分辨率不足**的证据(见
    // `FLAG_DUPLICATE_TIMESTAMP` 的注释),而变小是真正的顺序异常。
    // 混在一个计数器里就等于把最有用的诊断信号扔了。
    if (!(t > lastTimeStamp)) {
      pendingFlags |= t === lastTimeStamp ? FLAG_DUPLICATE_TIMESTAMP : FLAG_OUT_OF_ORDER_TIMESTAMP;
      return true;
    }

    if (buffer.n >= buffer.capacity) {
      overflowed = true;
      return false;
    }

    lastTimeStamp = t;
    buffer.t[buffer.n] = t;
    buffer.x[buffer.n] = x;
    buffer.y[buffer.n] = y;
    buffer.buttons[buffer.n] = buttons;
    buffer.flags[buffer.n] = pendingFlags;
    pendingFlags = 0;
    buffer.n++;
    return true;
  }

  function handleMove(event: PointerEvent): void {
    if (channel === 'none') channel = 'pointermove';

    if (!coalescedSupported) {
      reportedSamples++;
      push(event.timeStamp, event.clientX, event.clientY, event.buttons);
      return;
    }

    const coalesced = event.getCoalescedEvents();
    if (coalesced.length === 0) {
      // 规范允许返回空列表,此时事件本身就是全部信息
      reportedSamples++;
      push(event.timeStamp, event.clientX, event.clientY, event.buttons);
      return;
    }

    if (timestampMode === 'unknown') {
      // 首次见到合并事件,确定时间戳模式。老版 Firefox 把合并事件的 timestamp
      // 设为 0,用它做间隔分析会得到一堆 0,必须降级为只计数。
      timestampMode = coalesced[0].timeStamp > 0 ? 'per-sample' : 'aggregate';
    }

    reportedSamples += coalesced.length;

    if (timestampMode === 'per-sample') {
      for (let i = 0; i < coalesced.length; i++) {
        const ev = coalesced[i];
        push(ev.timeStamp, ev.clientX, ev.clientY, ev.buttons);
      }
    } else {
      // 聚合模式:合并事件没有可用时间戳,逐采样间隔无从谈起。只记录被派发的
      // 那一层——它的时间戳虽然被 rAF 重采样过,但**首尾跨度**仍然覆盖整段运动,
      // 配上 reportedSamples 就能算出无偏的平均回报率。
      push(event.timeStamp, event.clientX, event.clientY, event.buttons);
    }
  }

  // 参数类型写 Event 而不是 PointerEvent,是因为 TS 的 DOM 类型把
  // pointerrawupdate 映射成了 Event(规范里它其实派发的是 PointerEvent)。
  // 收窄放在函数体里做,调用处就不必逐个断言。
  function handleRawUpdate(event: Event): void {
    // 两个通道**只能选一个**。规范保证"一段区间内全部 pointerrawupdate 的合并
    // 列表拼接起来 == 下一个 pointermove 的合并列表",同时监听会把每个采样
    // 数两遍,间隔分布里凭空多出一半接近 0 的值,Hz 直接翻倍。
    //
    // 这里用"谁先到谁赢"来选,而不是查特性:`onpointerrawupdate in window` 在
    // Chrome 142+ 的非安全上下文里仍然为 true,但事件永远不会派发——只查特性
    // 会选中一个哑通道,一个采样都收不到。让真实派发来投票才可靠。
    if (channel === 'none') {
      channel = 'pointerrawupdate';
      // 规范保证 pointerrawupdate 一定先于同一批的 pointermove 派发,所以此刻
      // 摘掉 pointermove 是安全的:那批 move 还没派发,不会再触发回调。
      element.removeEventListener('pointermove', handleMove);
    }
    if (channel !== 'pointerrawupdate') return;
    handleMove(event as PointerEvent);
  }

  function handleCancel(): void {
    cancelled = true;
  }

  function handleDown(event: PointerEvent): void {
    if (useCapture && element.setPointerCapture) {
      // 保证指针移出元素后 move 事件仍然送到这里——拖拽类测试的前提。
      // 指针已被捕获时重复捕获会抛 InvalidStateError,忽略即可。
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        /* 已在捕获状态,无需处理 */
      }
    }
  }

  function start(): void {
    if (running) return;
    running = true;
    // capture 关掉时这个监听什么都不会做,那就别挂——免得后面有人读到它,
    // 以为这里有什么副作用
    if (useCapture) {
      element.addEventListener('pointerdown', handleDown, { passive: true });
    }
    // 通道敲定后会被保留(reset 刻意不清它),所以**不能**无条件把两个监听都挂上:
    // 一旦已敲定为 pointerrawupdate,再挂 pointermove 就会让每个采样被数两遍,
    // Hz 直接翻倍。这里按已敲定的结果挂,只有还没敲定时才两个都挂、让派发来投票。
    if (channel !== 'pointerrawupdate') {
      element.addEventListener('pointermove', handleMove, { passive: true });
    }
    if (rawUpdateSupported && channel !== 'pointermove') {
      element.addEventListener('pointerrawupdate', handleRawUpdate, { passive: true });
    }
    element.addEventListener('pointercancel', handleCancel, { passive: true });
  }

  function stop(): void {
    if (!running) return;
    running = false;
    element.removeEventListener('pointerdown', handleDown);
    element.removeEventListener('pointermove', handleMove);
    element.removeEventListener('pointerrawupdate', handleRawUpdate);
    element.removeEventListener('pointercancel', handleCancel);
  }

  function reset(): void {
    resetBuffer(buffer);
    pendingFlags = 0;
    reportedSamples = 0;
    overflowed = false;
    cancelled = false;
    lastTimeStamp = Number.NEGATIVE_INFINITY;
    // channel 与 timestampMode 刻意保留:它们描述的是浏览器与设备的行为,
    // 不随数据一起清空。选通道的监听增减已经完成,重置不需要重做。
  }

  function destroy(): void {
    stop();
    reset();
  }

  start();

  return {
    buffer,
    get reportedSamples() {
      return reportedSamples;
    },
    get timestampMode() {
      return timestampMode;
    },
    get coalescedSupported() {
      return coalescedSupported;
    },
    get channel() {
      return channel;
    },
    get overflowed() {
      return overflowed;
    },
    get cancelled() {
      return cancelled;
    },
    get running() {
      return running;
    },
    start,
    stop,
    reset,
    destroy,
  };
}
