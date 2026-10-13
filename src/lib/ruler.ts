/**
 * "沿尺子移动一段固定距离"的测量流程。
 *
 * DPI 测试和加速度测试的用户操作是**同一套**:把鼠标放在尺子某刻度上,
 * 开始测量,沿尺子直着推一段,停下。区别只在结果怎么解读——前者看绝对数值,
 * 后者比较两次不同速度下的数值。所以流程抽在这里,两个页面各自解释自己的结果。
 *
 * 这一层是薄的(和采样层同理):它只负责**界定这一次手势**,不做任何换算。
 * 像素换算成 DPI 是纯函数 `estimateDpi` 的活,那边有单测。
 *
 * ## 起止由谁定:`trigger`
 *
 * 两个页面问的是同一个量(推了多远),但"这一次从哪儿到哪儿"是**两套**:
 *
 * - `'first-move'`(加速度页):点按钮 → 第一次移动就是起点 → 停住结算。
 *   起止都是**推出来的**。
 * - `'manual'`(DPI 页):点起点带钉起点 → 移动 → 再点一下结束。
 *   起止都是**点出来的**,所以这里一个静止判定都不做 —— 用户推的过程中
 *   停一下是常事,把它当成"推完了"会提前结算,而那个数看着完全正常。
 *
 * 两种模式共用 `snapshot()` / `onProgress` / 偏轴统计 / 自动选轴**同一份实现**,
 * 差别只在那个起点坐标从哪儿来、以及谁来喊停。
 */

export interface RulerResult {
  /** 沿主轴走过的净位移(像素,取绝对值) */
  pixels: number;
  /**
   * 自动选出的主轴。
   *
   * 不要求用户先声明"我要横着推":横着推还是竖着推都是合理的测量方式,
   * 而**净位移在哪根轴上更大,那段距离就在哪根轴上**。自动判断比让用户
   * 多做一个选择更不容易出错——选错了量出来的距离会小得离谱。
   */
  axis: 'x' | 'y';
  /** 从第一次移动到结束的时长(毫秒) */
  durationMs: number;
  /** 记录到的移动事件数 */
  samples: number;
  /** 沿主轴的平均速度(像素/秒)。加速度测试用它确认用户真的快起来了 */
  speedPxPerSec: number;
  /** 垂直于主轴方向的最大偏移(像素),用来提示"你推歪了" */
  crossAxisDriftPx: number;
}

export interface RulerOptions {
  /**
   * 起止由谁定。见文件头。
   *
   * `'manual'` 下 `stillnessMs` / `maxDurationMs` 两个都不起作用 ——
   * 起止都是用户给的,替他结束后半段是错的。
   */
  trigger?: 'first-move' | 'manual';
  /** 静止多久算这次量完了(毫秒)。只在 `'first-move'` 下用 */
  stillnessMs?: number;
  /** 一次手势最长允许多久(毫秒),超时自动结束。只在 `'first-move'` 下用 */
  maxDurationMs?: number;
  /**
   * 移动过程中的实时回调,用于显示"已经移动了多少像素"。
   *
   * 第二个参数是**原样转交的那个 `pointermove` 事件**:画面上的标记要跟着指针
   * 走,而 `RulerResult` 里只有距离、没有"指针现在在哪儿"。让页面自己再挂一个
   * `pointermove` 也能做到,但那就成了每帧两份监听、两条独立的坐标换算。
   * 加速度页不用它,少写一个参数即可。
   */
  onProgress?: (current: RulerResult, event: PointerEvent) => void;
  /** 结束时回调。`null` 表示这次手势太短,不足以得出结果 */
  onFinish: (result: RulerResult | null) => void;
}

export interface Ruler {
  /** 开始等待移动。**计时从第一次移动才开始**,所以可以先点再摆鼠标 */
  start(): void;
  /**
   * 把起点钉在这里。**只在 `trigger: 'manual'` 下用。**
   *
   * 它会顺手 `start()`(没在跑就先挂上监听),所以页面上就是一步:
   * 「点起点带 → `anchorAt(x, y)`」。拆成两步没有好处,只多一种写错的方式。
   */
  anchorAt(x: number, y: number): void;
  /** 用户主动结束 */
  finish(): void;
  /** 放弃这一次,不回调结果 */
  cancel(): void;
  readonly running: boolean;
  destroy(): void;
}

const DEFAULT_STILLNESS_MS = 700;
const DEFAULT_MAX_DURATION_MS = 20_000;

export function createRulerMeasurement(options: RulerOptions): Ruler {
  const trigger = options.trigger ?? 'first-move';
  const stillnessMs = options.stillnessMs ?? DEFAULT_STILLNESS_MS;
  const maxDurationMs = options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;

  let running = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let startedAt = 0;
  let lastAt = 0;
  let samples = 0;

  /** 全程记录的极值,用来算"推歪了多少" */
  let minCross = 0;
  let maxCross = 0;

  let stillnessTimer = 0;
  let maxTimer = 0;

  function snapshot(): RulerResult | null {
    if (samples < 2) return null;

    const dx = lastX - startX;
    const dy = lastY - startY;
    const axis: 'x' | 'y' = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    const span = axis === 'x' ? dx : dy;
    const durationMs = lastAt - startedAt;

    return {
      pixels: Math.abs(span),
      axis,
      durationMs,
      samples,
      speedPxPerSec: durationMs > 0 ? (Math.abs(span) / durationMs) * 1000 : 0,
      crossAxisDriftPx: maxCross - minCross,
    };
  }

  function clearTimers(): void {
    window.clearTimeout(stillnessTimer);
    window.clearTimeout(maxTimer);
    stillnessTimer = 0;
    maxTimer = 0;
  }

  function detach(): void {
    window.removeEventListener('pointermove', onMove);
  }

  function finish(): void {
    if (!running) return;
    running = false;
    clearTimers();
    detach();
    options.onFinish(snapshot());
  }

  /**
   * 钉下起点并起算。两种模式共用 —— "第一次移动当起点"和"用户点出来的起点"
   * 在数据上是同一件事,只是那个坐标从哪儿来的差别。
   */
  function anchor(x: number, y: number): void {
    startX = lastX = x;
    startY = lastY = y;
    startedAt = lastAt = performance.now();
    minCross = 0;
    maxCross = 0;
    samples = 1;
  }

  function onMove(event: PointerEvent): void {
    if (!running) return;
    const now = performance.now();

    if (samples === 0) {
      anchor(event.clientX, event.clientY);

      if (trigger === 'first-move') {
        // 计时从第一次移动开始,所以超时也在这里起算 —— 用户点了按钮之后
        // 慢慢摆鼠标的时间不该算进这次手势里
        window.clearTimeout(maxTimer);
        maxTimer = window.setTimeout(finish, maxDurationMs);
      } else {
        // manual 模式下 `samples === 0` 只可能是"钉完起点还没动过",不该走到这儿;
        // 真走到了就当作起点已经由这一下移动钉好,不起任何计时器。
        // 不起计时器的理由见文件头:起止都是用户给的。
      }
    } else {
      lastX = event.clientX;
      lastY = event.clientY;
      samples++;

      // 垂直于主轴的偏移在整个过程中重新判定代价太高,先用相对起点的
      // 两个分量一起跟踪,结束时按实际主轴取用
      const cross = Math.abs(event.clientX - startX) >= Math.abs(event.clientY - startY)
        ? event.clientY - startY
        : event.clientX - startX;
      if (cross < minCross) minCross = cross;
      if (cross > maxCross) maxCross = cross;
    }

    lastAt = now;

    const current = snapshot();
    if (current) options.onProgress?.(current, event);

    if (trigger === 'first-move') {
      window.clearTimeout(stillnessTimer);
      stillnessTimer = window.setTimeout(finish, stillnessMs);
    }
  }

  function start(): void {
    // 监听已经挂上了,这里只把这一次手势的状态清空。
    //
    // 不能写成 `if (running) return`:计时是从**第一次移动**开始的,所以
    // 用户点了"开始"却没碰鼠标时,这一次会一直停在"等待中"。再点一次按钮
    // 想重来,会被这个早退挡在门外,看上去就是按钮失灵了。
    if (running) {
      clearTimers();
      samples = 0;
      return;
    }
    running = true;
    samples = 0;
    window.addEventListener('pointermove', onMove, { passive: true });
  }

  function anchorAt(x: number, y: number): void {
    // 没在跑就先挂上监听 —— 页面上「点起点带」是一个动作,不该要他记得先 start()
    if (!running) start();
    clearTimers();
    anchor(x, y);
  }

  function cancel(): void {
    running = false;
    clearTimers();
    detach();
  }

  function destroy(): void {
    cancel();
  }

  return {
    start,
    anchorAt,
    finish,
    cancel,
    destroy,
    get running() {
      return running;
    },
  };
}
