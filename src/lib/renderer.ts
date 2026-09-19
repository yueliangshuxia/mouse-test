/**
 * Canvas 轨迹渲染层。
 *
 * 与采样层严格解耦:采样回调只写缓冲区,本层在 requestAnimationFrame 里
 * 读缓冲区绘制。**绝不在事件回调里绘制**——1000Hz 下那等于每秒触发 1000 次
 * 重绘,卡顿会被如实记录成"丢帧",自己把自己测出故障。
 *
 * 渐隐用的是 `destination-out` 每帧擦一点,而不是"每帧重绘全部历史点":
 * 后者在采了几万个点之后是 O(n) 的每帧开销,前者是 O(1)。长轨迹会自然淡出,
 * 不会糊满整个测试区。
 */

import type { SampleBuffer } from './sampler';

export interface TrailRenderer {
  /** 清空画布并从当前位置继续(不丢失缓冲区) */
  clear(): void;
  /** 元素尺寸变化后调用:重新计算 DPR 缩放与坐标原点 */
  resize(): void;
  start(): void;
  stop(): void;
  destroy(): void;
  readonly running: boolean;
}

export interface TrailRendererOptions {
  /** 每帧擦除的强度,0–1。越大轨迹消失越快 */
  fade?: number;
  lineWidth?: number;
  /** 轨迹颜色。留空则从 CSS 变量 --trail-color 读取 */
  stroke?: string;
}

const DEFAULT_FADE = 0.045;
const DEFAULT_LINE_WIDTH = 2;

export function createTrailRenderer(
  canvas: HTMLCanvasElement,
  buffer: SampleBuffer,
  options: TrailRendererOptions = {},
): TrailRenderer {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法获取 2D 绘图上下文');
  }
  // 下面的函数是**声明式**的,会被提升,TS 因此不会把上面这个守卫的收窄结果
  // 带进它们的作用域。在这里固化成显式非空类型,省掉每一处都写断言。
  const ctx: CanvasRenderingContext2D = context;

  const fade = options.fade ?? DEFAULT_FADE;
  const lineWidth = options.lineWidth ?? DEFAULT_LINE_WIDTH;
  let stroke = options.stroke ?? '';

  let drawnUpTo = 0;
  let rafId = 0;
  let running = false;

  // DPR 缩放与元素原点,在 resize 时刷新
  let dpr = 1;
  let originX = 0;
  let originY = 0;

  function readStrokeColor(): void {
    if (options.stroke) return;
    const fromVar = getComputedStyle(canvas).getPropertyValue('--trail-color').trim();
    // 兜底值要和 :root 的 --trail-color 一致。它只在变量解析为空时生效
    // ——而那正是令牌改到一半的状态,此时画布会保持这个颜色,看起来像渲染层
    // 出了问题而不是样式的事,所以别让它和主题脱节。
    stroke = fromVar || '#5ed69b';
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    originX = rect.left;
    originY = rect.top;

    // 改动画布尺寸会清空内容且改变坐标系。历史点存的是 client 坐标,
    // 元素尺寸变了之后换算基准也变了,重绘旧轨迹只会得到错位的线。
    // 直接从现在这个点继续,是唯一不会画出错误轨迹的做法。
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawnUpTo = buffer.n;
  }

  function clear(): void {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    drawnUpTo = buffer.n;
  }

  function drawFrame(): void {
    rafId = requestAnimationFrame(drawFrame);

    const rect = canvas.getBoundingClientRect();
    originX = rect.left;
    originY = rect.top;

    // 每帧擦掉一点点,形成渐隐的尾巴。独立于历史长度,是 O(1) 的。
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';

    const n = buffer.n;
    if (n - drawnUpTo < 2) {
      drawnUpTo = n;
      return;
    }
    // 起点要回退一格,才能和上一帧的最后一段接上
    let start = drawnUpTo - 1;
    if (start < 0) start = 0;
    if (n - start < 2) return;

    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(buffer.x[start] - originX, buffer.y[start] - originY);

    for (let i = start + 1; i < n; i++) {
      ctx.lineTo(buffer.x[i] - originX, buffer.y[i] - originY);
    }
    ctx.stroke();

    drawnUpTo = n;
  }

  function start(): void {
    if (running) return;
    running = true;
    readStrokeColor();
    resize();
    rafId = requestAnimationFrame(drawFrame);
  }

  function stop(): void {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function destroy(): void {
    stop();
    drawnUpTo = 0;
  }

  return {
    clear,
    resize,
    start,
    stop,
    destroy,
    get running() {
      return running;
    },
  };
}

/**
 * 观察元素尺寸变化。用于在测试区大小改变后让渲染层重新计算 DPR 与原点。
 * 返回取消观察的函数。
 */
export function observeResize(element: Element, onChange: () => void): () => void {
  if (typeof ResizeObserver === 'undefined') {
    return () => {};
  }
  const observer = new ResizeObserver(onChange);
  observer.observe(element);
  return () => observer.disconnect();
}
