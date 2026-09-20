/**
 * 鼠标测试的统计计算层。
 *
 * 本模块是**纯函数**:不引用任何浏览器 API,输入输出都是普通数字与 TypedArray。
 * 这样做的目的是让回报率、抖动、空档这些真正容易写错的算法可以用人造数据单测,
 * 而不必依赖真实鼠标硬件——采样层薄到几乎不会错,复杂度全部集中在这里。
 */

/** 常见回报率档位(Hz)。 */
export const STANDARD_RATES = [125, 250, 500, 1000, 2000, 4000, 8000] as const;
export type StandardRate = (typeof STANDARD_RATES)[number];

/**
 * 计算相邻采样的时间间隔(毫秒)。
 *
 * 返回长度为 `n - 1` 的数组;样本不足 2 个时返回空数组。
 * **不保证结果为正值**——重复时间戳会产生 0,乱序会产生负值。
 * 需要统计时请用 {@link positiveIntervals} 过滤。
 */
export function computeIntervals(t: Float64Array, n: number = t.length): Float64Array {
  const count = Math.min(n, t.length);
  if (count < 2) return new Float64Array(0);

  const out = new Float64Array(count - 1);
  for (let i = 1; i < count; i++) {
    out[i - 1] = t[i] - t[i - 1];
  }
  return out;
}

/**
 * 过滤出可用作统计的间隔:有限、且严格大于 0。
 *
 * 零间隔通常来自被浏览器合并后又重复落点的采样,负间隔来自乱序时间戳。
 * 两者都会把平均值算歪(零间隔会让 Hz 变成 Infinity),必须剔除。
 */
export function positiveIntervals(intervals: Float64Array): Float64Array {
  let count = 0;
  for (let i = 0; i < intervals.length; i++) {
    const v = intervals[i];
    if (Number.isFinite(v) && v > 0) count++;
  }
  if (count === intervals.length) return intervals;

  const out = new Float64Array(count);
  let k = 0;
  for (let i = 0; i < intervals.length; i++) {
    const v = intervals[i];
    if (Number.isFinite(v) && v > 0) out[k++] = v;
  }
  return out;
}

/** 升序副本。统计函数内部用,不修改入参。 */
function sortedCopy(values: Float64Array): Float64Array {
  const out = Float64Array.from(values);
  out.sort();
  return out;
}

/**
 * 线性插值求分位数。`p` 取值 0–1。
 * 传入的数组**必须已升序**,否则结果无意义。
 */
export function percentile(sorted: Float64Array, p: number): number {
  const n = sorted.length;
  if (n === 0) return Number.NaN;
  if (n === 1) return sorted[0];

  const clamped = Math.min(1, Math.max(0, p));
  const idx = (n - 1) * clamped;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export interface PollingRateStats {
  /** 1000 / 平均间隔 */
  hz: number;
  /** 1000 / 中位间隔。比平均值更抗离群点,是这个指标的主口径 */
  medianHz: number;
  /** 95 分位间隔(毫秒)。最慢的那 5% 到底有多慢 */
  p95IntervalMs: number;
  /** 1000 / p95IntervalMs */
  p95Hz: number;
  meanIntervalMs: number;
  medianIntervalMs: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  /** 参与统计的间隔数 */
  samples: number;
}

/**
 * 由间隔序列算回报率。
 *
 * 返回 `null` 表示有效间隔不足,无法给出结论——UI 必须如实显示"数据不足",
 * 而不是填 0 或上一个测得的数字。
 */
export function computePollingRate(intervals: Float64Array): PollingRateStats | null {
  const valid = positiveIntervals(intervals);
  if (valid.length < 2) return null;

  let sum = 0;
  for (let i = 0; i < valid.length; i++) sum += valid[i];
  const mean = sum / valid.length;

  const sorted = sortedCopy(valid);
  const median = percentile(sorted, 0.5);
  const p95 = percentile(sorted, 0.95);

  return {
    hz: 1000 / mean,
    medianHz: 1000 / median,
    p95IntervalMs: p95,
    p95Hz: 1000 / p95,
    meanIntervalMs: mean,
    medianIntervalMs: median,
    minIntervalMs: sorted[0],
    maxIntervalMs: sorted[sorted.length - 1],
    samples: valid.length,
  };
}

export interface JitterStats {
  /** 间隔的标准差(毫秒) */
  stddevMs: number;
  /**
   * 变异系数 = 标准差 / 平均间隔。
   * 无量纲,所以**跨档位可比**——1000Hz 的 0.2ms 抖动和 125Hz 的 0.2ms 抖动
   * 严重程度完全不同,直接比标准差会得出错误结论。
   */
  cv: number;
  samples: number;
}

export function computeJitter(intervals: Float64Array): JitterStats | null {
  const valid = positiveIntervals(intervals);
  if (valid.length < 2) return null;

  let sum = 0;
  for (let i = 0; i < valid.length; i++) sum += valid[i];
  const mean = sum / valid.length;
  if (mean <= 0) return null;

  let sq = 0;
  for (let i = 0; i < valid.length; i++) {
    const d = valid[i] - mean;
    sq += d * d;
  }
  // 用样本标准差(n-1),因为这是对设备行为的抽样估计而非总体
  const stddev = Math.sqrt(sq / (valid.length - 1));

  return { stddevMs: stddev, cv: stddev / mean, samples: valid.length };
}

export interface GapStats {
  /** 超过阈值的间隔个数 */
  count: number;
  /** 最长的那个间隔(毫秒) */
  maxGapMs: number;
  /** 全部空档加起来的时长(毫秒),已扣除每个空档本应占用的正常间隔 */
  totalLostMs: number;
}

/**
 * 检测丢帧/空档:间隔超过 `expectedMs * threshold` 即算一次。
 *
 * `expectedMs` 通常传中位间隔——用实测值而非理论值,可以避免
 * 把"档位判断错了"误报成"丢帧了"。
 */
export function detectGaps(
  intervals: Float64Array,
  expectedMs: number,
  threshold = 2,
): GapStats {
  const result: GapStats = { count: 0, maxGapMs: 0, totalLostMs: 0 };
  if (!Number.isFinite(expectedMs) || expectedMs <= 0) return result;

  const limit = expectedMs * threshold;
  for (let i = 0; i < intervals.length; i++) {
    const v = intervals[i];
    if (!Number.isFinite(v) || v <= limit) continue;
    result.count++;
    if (v > result.maxGapMs) result.maxGapMs = v;
    result.totalLostMs += v - expectedMs;
  }
  return result;
}

/**
 * 把实测 Hz 归到最近的标称档位。
 *
 * 容差默认 ±8%,超出所有档位范围时返回 `null`——宁可说"未识别",
 * 也不要把 880Hz 硬说成 1000Hz。
 *
 * 这个容差是从"计数法本身有多准"倒推的:干净段落上的计数法误差在 1% 以内,
 * 所以偏差到 8% 已经不是在标称档位上了,没必要替它圆场。
 * (原生工具用 Raw Input 时容差可以收到 1.5%,浏览器的时间戳精度达不到那个水平,
 * 所以不能照抄。)
 */
export function classifyPollingRate(hz: number, tolerance = 0.08): StandardRate | null {
  if (!Number.isFinite(hz) || hz <= 0) return null;

  let best: StandardRate | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const rate of STANDARD_RATES) {
    const delta = Math.abs(hz - rate);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = rate;
    }
  }

  if (best === null) return null;
  return bestDelta / best <= tolerance ? best : null;
}

export interface Histogram {
  /** 每个区间的计数 */
  bins: Uint32Array;
  min: number;
  max: number;
  binWidth: number;
}

/**
 * 定分箱范围。默认取 1%–99% 分位,这样少数极端离群点不会把所有数据挤进第一个柱子。
 */
function resolveRange(sorted: Float64Array, min?: number, max?: number): [number, number] {
  let lo = min ?? percentile(sorted, 0.01);
  let hi = max ?? percentile(sorted, 0.99);

  // 当绝大多数样本完全相同、只有极少数离群点时,1%–99% 区间会退化成一个点。
  // 若就此收工,那个离群点会被塞进唯一的柱子里彻底看不见——而对一个用来
  // 检测丢帧的工具来说,离群点恰恰是唯一该看的东西。这种情况下回退到真实
  // 的 min/max(若调用方显式指定了某一端则尊重它)。
  if (!(hi - lo > 0) && (min === undefined || max === undefined)) {
    lo = min ?? sorted[0];
    hi = max ?? sorted[sorted.length - 1];
  }
  return [lo, hi];
}

/**
 * 由**已排序**的值建直方图。
 *
 * 单独抽出来是因为调用方常常已经为分位数排过一次序了——重复排一遍 16k 元素
 * 是白烧主线程,而主线程的卡顿在回报率测试里会被如实记录成丢帧。
 */
function histogramFromSorted(
  sorted: Float64Array,
  binCount: number,
  lo: number,
  hi: number,
): Histogram {
  const span = hi - lo;

  // 全部数据真的落在同一个值上——给一个退化但正确的直方图
  if (!(span > 0)) {
    const bins = new Uint32Array(1);
    bins[0] = sorted.length;
    return { bins, min: lo, max: lo, binWidth: 0 };
  }

  const binWidth = span / binCount;
  const bins = new Uint32Array(binCount);
  for (let i = 0; i < sorted.length; i++) {
    let idx = Math.floor((sorted[i] - lo) / binWidth);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    bins[idx]++;
  }

  return { bins, min: lo, max: lo + binWidth * binCount, binWidth };
}

/**
 * 为间隔序列建直方图。
 *
 * 不传 `min`/`max` 时按数据的 1%–99% 分位取范围,这样少数极端离群点
 * 不会把所有数据挤进第一个柱子。
 */
export function buildHistogram(
  values: Float64Array,
  binCount = 40,
  min?: number,
  max?: number,
): Histogram | null {
  const valid = positiveIntervals(values);
  if (valid.length === 0 || binCount < 1) return null;

  const sorted = sortedCopy(valid);
  const [lo, hi] = resolveRange(sorted, min, max);
  return histogramFromSorted(sorted, binCount, lo, hi);
}

// ---------------------------------------------------------------------------
// 连续运动分段
// ---------------------------------------------------------------------------

/** 采样缓冲区里的一段连续运动,用 `[start, end)` 的半开区间表示。 */
export interface Segment {
  start: number;
  end: number;
}

export interface SegmentOptions {
  /** 相邻间隔超过这个值就认为运动中断,在此处切开(毫秒) */
  maxGapMs?: number;
  /** 样本数少于这个值的段不参与分析 */
  minSamples?: number;
  /** 时间跨度短于这个值的段不参与分析(毫秒) */
  minDurationMs?: number;
}

/** 默认断点阈值。人连续画圈时不会有 50ms 的空档,超过必定是停顿或系统卡顿。 */
export const DEFAULT_MAX_GAP_MS = 50;

/** 默认最短段长度。太少样本估出来的分位数没有意义。 */
export const DEFAULT_MIN_SEGMENT_SAMPLES = 100;

/**
 * 默认最短段时长。
 *
 * 只卡样本数是不够的:8000Hz 下 100 个采样只有 12.5ms,加上计时器量化误差
 * 会得出一个抖动极大却看起来同样确定的数字。真实测量需要一段够长的时间。
 */
export const DEFAULT_MIN_SEGMENT_MS = 150;

/**
 * 回报率上限。任何鼠标都不可能超过这个数,超过必定是测量假象——
 * 比如合并事件里混进了重复落点。宁可封顶也不要报出一个荒谬的数。
 */
export const MAX_REPORTED_RATE_HZ = 20_000;

/**
 * 把时间戳序列切成若干**连续运动段**。
 *
 * 这是整个测量的关键一步。用户在两次拖动之间的停顿不会产生任何指针事件,
 * 于是缓冲区里留下一个几百毫秒的巨大间隔。如果直接对全部间隔求统计,
 * 这个间隔会被当成"鼠标这一次上报得很慢",把平均值狠狠拖低——
 * **而且它落在窗口内的时机取决于用户什么时候松手,所以每次测出来的数都不一样**。
 *
 * 正确的做法不是在统计阶段把大间隔"修掉"(任何截尾都会引入不对称偏差),
 * 而是承认运动在这里中断了,把序列**整段切开**,只在最长的那一段上做统计。
 */
export function segmentTimestamps(
  t: Float64Array,
  n: number = t.length,
  options: SegmentOptions = {},
): Segment[] {
  const len = Math.min(n, t.length);
  const maxGapMs = options.maxGapMs ?? DEFAULT_MAX_GAP_MS;
  const minSamples = options.minSamples ?? DEFAULT_MIN_SEGMENT_SAMPLES;
  const minDurationMs = options.minDurationMs ?? DEFAULT_MIN_SEGMENT_MS;

  const segments: Segment[] = [];
  if (len < minSamples) return segments;

  const keep = (start: number, end: number): void => {
    if (end - start < minSamples) return;
    // 只卡样本数不够:高档位下很短的跨度也能凑够样本数,却因为计时量化
    // 给出一个抖动极大却同样确定的读数
    if (!(t[end - 1] - t[start] >= minDurationMs)) return;
    segments.push({ start, end });
  };

  let start = 0;
  for (let i = 1; i < len; i++) {
    const dt = t[i] - t[i - 1];
    // 写成 `!(dt <= 阈值)` 而不是 `dt > 阈值`,是为了让 NaN 也落进"断点"分支——
    // 时间戳非法时保守地切开,好过把它当成一个正常间隔混进统计。
    if (!(dt <= maxGapMs)) {
      keep(start, i);
      start = i;
    }
  }
  keep(start, len);

  return segments;
}

/** 取样本数最多的那一段。段数很多时,最长的一段最有统计价值。 */
export function longestSegment(segments: Segment[]): Segment | null {
  let best: Segment | null = null;
  let bestCount = 0;
  for (const seg of segments) {
    const count = seg.end - seg.start;
    if (count > bestCount) {
      bestCount = count;
      best = seg;
    }
  }
  return best;
}

export interface CountRate {
  /** (样本数 - 1) / 时长 × 1000 */
  hz: number;
  durationMs: number;
  samples: number;
}

/**
 * 计数法回报率:在无停顿的连续段上,用"样本数 ÷ 时长"算速率。
 *
 * **这是浏览器里唯一无偏的估计量。** 间隔统计会被浏览器的批处理涂抹污染
 * (实测 0.3–0.6ms 的到达时间散布),但报文本身不会丢——所以事件总数和总时长
 * 都是准的,两者相除就把涂抹平均掉了。
 */
export function rateByCount(t: Float64Array, segment: Segment): CountRate | null {
  const samples = segment.end - segment.start;
  if (samples < 2) return null;

  const durationMs = t[segment.end - 1] - t[segment.start];
  if (!(durationMs > 0)) return null;

  const hz = ((samples - 1) / durationMs) * 1000;
  if (!Number.isFinite(hz) || hz <= 0) return null;

  return { hz: Math.min(hz, MAX_REPORTED_RATE_HZ), durationMs, samples };
}

// ---------------------------------------------------------------------------
// 汇总
// ---------------------------------------------------------------------------

export interface PollingAnalysis {
  /** 主口径:干净段上的计数法回报率,无偏 */
  hz: number;
  samples: number;
  durationMs: number;
  /** 切出来的连续段总数。大于 1 说明中途停顿过 */
  segmentCount: number;
  /**
   * 被选中的那一段(样本数最多的连续段)。
   * 由它派生出分窗口速率、路程这些需要按样本取材的指标,
   * 省得调用方再跑一遍切段——那会多一次全窗口扫描。
   */
  segment: Segment;
}

export interface PollingAnalysisOptions extends SegmentOptions {}

/**
 * 一次完整的回报率分析:切段 → 取最长段 → 计数法定速率。
 *
 * **这里刻意只做这几件事。** 中间的版本还会从间隔分布里反推"上报周期",
 * 以及"掉包比例""核心离散度""长尾"这几个离散度指标,现在全部删掉了。
 * 原因是它们的输入都是**间隔**,而间隔在浏览器里根本不可信:
 * 浏览器对事件时间戳的批处理涂抹实测有 0.3–0.6ms,而 1000Hz 的周期只有 1ms。
 * 于是一个完全正常的间隔,光靠浏览器的延迟就能越过任何"偏长"的门槛——
 * 实测下来一只好鼠标会稳定报出百分之几的掉包率。门槛再往上调也只是
 * 把这个假象藏起来,治不了根。
 *
 * 计数法不受这个影响:浏览器会拖延事件的**派发**,但不会丢报文,
 * 所以事件总数和总时长都是准的。**只有计数类结论在浏览器里站得住,
 * 那就只给计数类结论。**
 *
 * 返回 `null` 表示没有一段连续运动长到足以给出结论。UI 必须如实显示"数据不足",
 * 不要拿上一次的数字凑合。
 */
export function analyzeSegments(
  t: Float64Array,
  n: number = t.length,
  options: PollingAnalysisOptions = {},
): PollingAnalysis | null {
  const segments = segmentTimestamps(t, n, options);
  const main = longestSegment(segments);
  if (!main) return null;

  const counted = rateByCount(t, main);
  if (!counted) return null;

  return {
    hz: counted.hz,
    samples: counted.samples,
    durationMs: counted.durationMs,
    segmentCount: segments.length,
    segment: main,
  };
}

// ---------------------------------------------------------------------------
// 分窗口速率:峰值与实时曲线
// ---------------------------------------------------------------------------

export interface RateWindow {
  /** 该窗口的计数法回报率 */
  hz: number;
  /** 窗口内的样本数 */
  samples: number;
  /** 窗口起点相对所选段落起点的偏移(毫秒),给曲线图当横轴 */
  offsetMs: number;
  /** 窗口是否覆盖了完整的 `windowMs`。末尾那个常是不满的 */
  full: boolean;
}

export interface WindowOptions {
  /** 窗口时长(毫秒)。默认 200ms——与参照实现一致 */
  windowMs?: number;
  /** 样本数少于这个值的窗口直接丢弃 */
  minSamples?: number;
}

/** 默认窗口时长。200ms 是精度与响应速度的折中,详见 computeRateWindows */
export const DEFAULT_WINDOW_MS = 200;

/**
 * 默认最小样本数。
 *
 * 计数法在 n 个样本上的相对误差量级是 1/n,所以 20 个样本对应约 5% 的
 * 波动——这已经比绝大多数鼠标档位之间的间距还小(125→250 是 100%),
 * 作为"这个窗口算不算数"的门槛够了。再往下调,低档位鼠标就没有窗口可用;
 * 再往上调,高档位下窗口会被拉得很长、丢掉响应速度。
 */
export const DEFAULT_WINDOW_MIN_SAMPLES = 20;

/**
 * 把连续段切成**互不重叠**的等长窗口,每个窗口用计数法算一个速率。
 *
 * 这是"峰值"和"实时曲线"共用的底层。两者都建立在**计数**之上,
 * 而不是间隔之上——所以它们不存在被浏览器批处理涂抹污染的问题。
 *
 * 为什么用互不重叠的窗口而不是滑窗:峰值是对所有窗口取最大值,
 * 而滑窗会让相邻窗口高度相关,"最大值"就变成了对同一段数据反复抽样,
 * 峰值会被系统性地抬高。互不重叠的窗口抽的是独立样本,偏差小得多。
 *
 * 精度特征:窗口内 n 个样本的计数误差约 1/n。1000Hz 下一个 200ms 窗口
 * 有约 200 个样本,误差 0.5%;125Hz 下只有 25 个,误差 4%。
 * **高档位反而更准**,而峰值恰恰是高档位鼠标才关心的指标。
 */
export function computeRateWindows(
  t: Float64Array,
  segment: Segment,
  options: WindowOptions = {},
): RateWindow[] {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const minSamples = options.minSamples ?? DEFAULT_WINDOW_MIN_SAMPLES;

  const windows: RateWindow[] = [];
  if (!(windowMs > 0)) return windows;

  const origin = t[segment.start];
  let i = segment.start;

  while (i < segment.end) {
    const deadline = t[i] + windowMs;
    let j = i + 1;
    // 取到第一个超出窗口的样本为止;j 是开区间端点
    while (j < segment.end && t[j] < deadline) j++;

    const samples = j - i;
    if (samples >= minSamples) {
      const durationMs = t[j - 1] - t[i];
      if (durationMs > 0) {
        const hz = ((samples - 1) / durationMs) * 1000;
        if (Number.isFinite(hz) && hz > 0) {
          windows.push({
            hz: Math.min(hz, MAX_REPORTED_RATE_HZ),
            samples,
            offsetMs: t[i] - origin,
            full: j < segment.end,
          });
        }
      }
    }

    if (j >= segment.end) break;
    i = j;
  }

  return windows;
}

export interface PeakRate {
  hz: number;
  /** 峰值窗口内的样本数,用来判断这个峰值本身有多可信 */
  samples: number;
  /** 参与比较的窗口总数 */
  windows: number;
}

/**
 * 峰值回报率:所有窗口里最高的那个。
 *
 * **它天生会比真实值略高,这是概念本身的性质,不是 bug。** 取一组含噪
 * 观测的最大值时,拿到的是"真值 + 正向噪声"。好在窗口覆盖的是同一个
 * 稳定状态,而每个窗口的噪声很小(1000Hz 下约 0.5%),所以在 3 秒数据
 * 上峰值通常只高出 1% 左右——比参照实现那种 200ms 滑窗的做法干净得多。
 *
 * 判读时应当把它当作"这只鼠标能跑到多少"的上界,而不是典型值。
 */
export function computePeakRate(windows: RateWindow[]): PeakRate | null {
  let best: RateWindow | null = null;
  for (const w of windows) {
    if (best === null || w.hz > best.hz) best = w;
  }
  if (!best) return null;
  return { hz: best.hz, samples: best.samples, windows: windows.length };
}

/**
 * 光标走过的总路程(像素),用主段内的相邻落点累加。
 *
 * 用途是判断"读数偏低是不是因为移动太慢"。鼠标只在**产生了新计数**时才发报文,
 * 所以每秒报文数 ≈ 每秒产生的计数数。不开系统加速、缩放 100% 时,
 * 屏幕像素与计数一一对应,于是 1000Hz 需要每秒移动约 1000 像素才能打满。
 */
export function pathLength(
  x: Float32Array,
  y: Float32Array,
  segment: Segment,
): number {
  let total = 0;
  for (let i = segment.start + 1; i < segment.end; i++) {
    const dx = x[i] - x[i - 1];
    const dy = y[i] - y[i - 1];
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

// ---------------------------------------------------------------------------
// 数据质量评级
// ---------------------------------------------------------------------------

export type QualityLevel = 'good' | 'fair' | 'poor';

export interface TimestampAnomalies {
  /** 时间戳与上一条**完全相同**、因而被丢弃的报文数 */
  duplicate: number;
  /** 时间戳倒序、因而被丢弃的报文数 */
  outOfOrder: number;
}

/**
 * 统计 `[start, end)` 窗口内的采样被丢弃的原因。
 *
 * 传入的是 `SampleBuffer.flags`(见 sampler.ts)。计数**按窗口取**而不是
 * 用会话累计值,是因为分析窗口只覆盖缓冲区末尾——用户画圈先慢后快时,
 * 累计值会被开头那几秒稀释,让"计时精度够不够"这个最该及时反映的判断变迟钝。
 */
export function countAnomalies(
  flags: Uint8Array,
  start = 0,
  end: number = flags.length,
): TimestampAnomalies {
  const from = Math.max(0, start);
  const to = Math.min(end, flags.length);
  let duplicate = 0;
  let outOfOrder = 0;
  for (let i = from; i < to; i++) {
    const f = flags[i];
    if (f & 1) duplicate++;
    if (f & 2) outOfOrder++;
  }
  return { duplicate, outOfOrder };
}

export interface QualityInput {
  /** 主段的实际时长(毫秒) */
  durationMs: number;
  /** 窗口内被接受的采样数 */
  acceptedSamples: number;
  /** 窗口内被丢弃的报文数,见 {@link TimestampAnomalies} */
  anomalies: TimestampAnomalies;
}

export interface QualityIssue {
  level: Exclude<QualityLevel, 'good'>;
  message: string;
}

export interface DataQuality {
  level: QualityLevel;
  issues: QualityIssue[];
  /** 同一时间戳的重复采样占比 */
  duplicateRatio: number;
  outOfOrderRatio: number;
}

/**
 * 各档位的判定阈值。
 *
 * **这些数是按浏览器的计时模型推出来的,不是拿真实硬件标定的。**
 * 原生工具用的是丢包判据(丢弃报文数 > 0 即降级),而浏览器**没有序列号,
 * 根本看不见丢包**——它的主要误差源是计时器量化,不是丢失。所以那套判据
 * 无法照抄,只能另立一套,阈值也就没有现成的参照。倾向是**保守**:
 * 宁可多报一次"一般",也不要让一个被量化污染的数字冒充精确结果。
 *
 * **这里只看计数类的量**(重复时间戳数、倒序数、时长)——它们要么是精确计数,
 * 要么是直接测量,不经过间隔分布。曾经还有基于失配度和掉包比例的两条判据,
 * 已经删掉:那两个量的输入都是间隔,而间隔正是被浏览器涂抹污染的东西,
 * 拿它去判"这次测得准不准"是自相矛盾的。
 */
export const DUPLICATE_RATIO_FAIR = 0.15;
export const DUPLICATE_RATIO_POOR = 0.5;
export const OUT_OF_ORDER_RATIO_FAIR = 0.01;
export const MIN_GOOD_DURATION_MS = 1000;
export const MIN_FAIR_DURATION_MS = 500;

/**
 * 判断这一次测量有多可信。
 *
 * 设计上**分级而非二元**:原生工具可以做到"有一个报文丢失就直接判 Degraded",
 * 因为它的数据源是驱动层的原始序列。浏览器拿到的是已经被浏览器进程重组、
 * 再按帧派发的数据,同样的严格标准只会让每一帧都被判成不可信。
 * 所以这里改成"在哪一个信号上偏了多少",并把原因如实列出来——
 * 用户需要知道的是"该怎么改进",而不是一个红叉。
 *
 * 最有分量的信号是 `duplicateRatio`:它直接说明**当前的计时精度分辨不出
 * 这只鼠标的周期**。8000Hz 鼠标的周期是 125µs,而 Chrome 在未开跨域隔离时
 * 把时间戳量化到 100µs——此时这个比例会飙到很高,是页面该给出的最重要的警告。
 */
export function assessQuality(input: QualityInput): DataQuality {
  // 分母是"窗口内浏览器实际派发过来的报文总数" = 被接受的 + 被丢弃的。
  // 用 acceptedSamples 单独当分母会低估比例:被丢的报文也算发过来过。
  const { duplicate, outOfOrder } = input.anomalies;
  const reported = Math.max(1, input.acceptedSamples + duplicate + outOfOrder);
  const duplicateRatio = duplicate / reported;
  const outOfOrderRatio = outOfOrder / reported;

  const issues: QualityIssue[] = [];
  const raise = (level: Exclude<QualityLevel, 'good'>, message: string): void => {
    issues.push({ level, message });
  };

  // 计时器分辨不出设备周期——浏览器环境下头号误差源
  if (duplicateRatio > DUPLICATE_RATIO_POOR) {
    raise(
      'poor',
      `超过一半的报文落进同一个时间戳(${(duplicateRatio * 100).toFixed(0)}%),` +
        `说明当前计时精度分辨不出这只鼠标的周期,读数只能当作下限。`,
    );
  } else if (duplicateRatio > DUPLICATE_RATIO_FAIR) {
    raise(
      'fair',
      `${(duplicateRatio * 100).toFixed(0)}% 的报文与相邻报文共用时间戳,` +
        `计时精度已经接近极限。`,
    );
  }

  if (outOfOrderRatio > OUT_OF_ORDER_RATIO_FAIR) {
    raise('poor', `${(outOfOrderRatio * 100).toFixed(1)}% 的采样时间戳是倒着走的,数据不可信。`);
  } else if (outOfOrder > 0) {
    raise('fair', `有 ${outOfOrder} 条采样的时间戳倒序,通常来自驱动或系统调度。`);
  }

  if (input.durationMs < MIN_FAIR_DURATION_MS) {
    raise('poor', `有效时长只有 ${input.durationMs.toFixed(0)}ms,太短,统计量不可靠。`);
  } else if (input.durationMs < MIN_GOOD_DURATION_MS) {
    raise(
      'fair',
      `有效时长 ${(input.durationMs / 1000).toFixed(1)} 秒,建议连续画圈 3 秒以上再读数。`,
    );
  }

  let level: QualityLevel = 'good';
  for (const issue of issues) {
    if (issue.level === 'poor') {
      level = 'poor';
      break;
    }
    level = 'fair';
  }

  return { level, issues, duplicateRatio, outOfOrderRatio };
}

// ---------------------------------------------------------------------------
// 点击间隔:双击(连击)测试
// ---------------------------------------------------------------------------

/**
 * 判定"同一次物理按压被记录成了两次"的阈值。
 *
 * 人手不可能在 50ms 内完成一次按下、抬起、再按下——那超出了手指的机械极限,
 * 所以短于这个间隔的两次点击必定来自微动开关的触点抖动,也就是俗称的"连击"。
 * 这是个**保守**的阈值:它会把所有真正的触点抖动都抓出来,同时绝不会把
 * 用户自己的双击误判成故障(人手双击的下限就在 60–80ms 一带)。
 */
export const CLICK_CHATTER_MS = 50;

/**
 * 人手双击的判定区间下沿。与 {@link CLICK_CHATTER_MS} 同值,单列出来是因为
 * 它回答的是另一个问题:"这个间隔是故障,还是你确实双击了?"
 */
export const CLICK_DOUBLE_MIN_MS = 50;

/** 人手双击的判定区间上沿,取系统默认的双击判定时间。 */
export const CLICK_DOUBLE_MAX_MS = 500;

export type ClickGapKind = 'chatter' | 'double' | 'separate';

/**
 * 把一次点击间隔归类。
 *
 * 三分类而不是二分类,是因为"间隔很短"有两种截然不同的成因:触点抖动(故障)
 * 和用户双击(正常)。页面必须把这两者分开显示——否则用户每双击一次都会
 * 看到一次"故障",很快就不再相信页面上的任何结论。
 */
export function classifyClickGap(gapMs: number): ClickGapKind {
  if (!Number.isFinite(gapMs) || gapMs < 0) return 'separate';
  if (gapMs < CLICK_CHATTER_MS) return 'chatter';
  if (gapMs <= CLICK_DOUBLE_MAX_MS) return 'double';
  return 'separate';
}

export interface ClickGapStats {
  /** 计入统计的间隔总数 */
  total: number;
  /** 疑似触点抖动(连击)的次数 */
  chatter: number;
  /** 落在人手双击区间的次数 */
  double: number;
  /** 明显是两次独立点击的次数 */
  separate: number;
  /** 最短间隔(毫秒) */
  minMs: number | null;
  /** 中位间隔(毫秒) */
  medianMs: number | null;
  /** 最短的一次连击间隔——微动老化越严重,这个数越小 */
  worstChatterMs: number | null;
}

/** 汇总一串点击间隔。传入的应当是**同一个按键**上的相邻点击间隔。 */
export function summarizeClickGaps(gaps: readonly number[]): ClickGapStats {
  const valid: number[] = [];
  for (const gap of gaps) {
    if (Number.isFinite(gap) && gap >= 0) valid.push(gap);
  }

  const stats: ClickGapStats = {
    total: valid.length,
    chatter: 0,
    double: 0,
    separate: 0,
    minMs: null,
    medianMs: null,
    worstChatterMs: null,
  };
  if (valid.length === 0) return stats;

  const sorted = [...valid].sort((a, b) => a - b);
  stats.minMs = sorted[0];
  stats.medianMs = sorted[(sorted.length - 1) >> 1];

  for (const gap of valid) {
    const kind = classifyClickGap(gap);
    if (kind === 'chatter') {
      stats.chatter++;
      if (stats.worstChatterMs === null || gap < stats.worstChatterMs) {
        stats.worstChatterMs = gap;
      }
    } else if (kind === 'double') {
      stats.double++;
    } else {
      stats.separate++;
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// CPS:每秒点击次数
// ---------------------------------------------------------------------------

/**
 * 结算之后多久内,测试面上的点击**不算"想再来一轮"**。
 *
 * 这一条是实测逼出来的,不是拍脑袋加的:计时到点由 ticker 每 80ms 结算一次,
 * 而人手在 5 秒里连点完之后不会立刻停 —— 实测跑一轮 5 秒(约 20 CPS),
 * 到点时还在惯性地按,结果成绩刚摆上去,**50ms 后那一下就把它抹掉、直接开了
 * 第二轮**,成绩在屏幕上存在的时间比一次眨眼还短,等于白测。
 *
 * 900ms 够看清一个三位数、也够看清下面四块面板刷新;之后点击恢复成"再来一轮"。
 * 这个数是量出来的:用机器以 20 CPS 从结算那一刻起不停地按,成绩在**第 872ms**
 * 被抹掉 —— 人类要打破它,得在计时结束后仍以极限速度多按二十几下,而人真正的
 * 收手反射只多出 1–3 下(约 50–150ms),留了六倍余量。所以这条锁不是"够长",
 * 是"比人长得多"。
 *
 * **两个世界共用这一个值**:CPS 整页和首页那张 CPS 卡片的 5 秒模式。卡片那边
 * 遇到的问题一模一样 —— 窗口由计时器关闭,不是由"手停下来"关闭,所以结算那一刻
 * 手同样还在按。各写一份的话,调了一处,另一处会静默地留下一段"成绩立刻被抹掉"
 * 的窗口,而它只在连点很快时才现形。
 */
export const RESTART_LOCK_MS = 900;

export interface CpsStats {
  clicks: number;
  durationMs: number;
  /** 全程平均:总次数 ÷ 总时长 */
  average: number;
  /** 任意一个 `windowMs` 滑窗内的最高次数 */
  peak: number;
  /** 峰值窗口的起点(毫秒,相对测试开始) */
  peakAtMs: number;
}

export interface CpsOptions {
  /** 峰值窗口时长,默认 1 秒 */
  windowMs?: number;
  /**
   * 测试总时长(毫秒)。
   *
   * **不传的话,计时会在最后一次点击处截止**,于是"前 1 秒猛点 20 下、
   * 后面 4 秒没力气了"会被算成 20 CPS。结尾那段空档在时间戳里是不存在的
   * ——不点就没有事件——只有计时器知道它发生过。
   *
   * 所以 CPS 测试用的是固定时长的计时器,把时长显式传进来。
   */
  durationMs?: number;
}

/**
 * 由点击时间戳(毫秒,**相对测试开始**,升序)算 CPS。
 *
 * 峰值用**滑动**窗口而不是互不重叠的窗口——这一点和回报率的峰值刻意不同。
 * 回报率那边禁用滑窗,是因为那里的峰值是"对同一个稳定状态的估计",滑窗会让
 * 相邻窗口高度相关,等于对同一段数据反复取最大,把估计值系统性抬高。
 * 而 CPS 问的是另一个问题:"你在任意 1 秒里最多点了几下?"这是个定义在
 * 数据上的确定量,不是对真值的估计,滑窗正是它的定义。用户按压 CPS 的
 * 成绩也一向按这个口径记,换成不重叠窗口会给出一个人人都觉得偏低的数。
 *
 * 返回 `null` 表示没有点击。
 */
export function computeCps(
  timesMs: readonly number[],
  options: CpsOptions = {},
): CpsStats | null {
  const windowMs = options.windowMs ?? 1000;

  const times: number[] = [];
  for (const t of timesMs) if (Number.isFinite(t)) times.push(t);
  if (times.length === 0) return null;

  times.sort((a, b) => a - b);

  const first = times[0];
  const span = times[times.length - 1] - first;
  // 时长至少要覆盖到一个峰值窗口,否则"1 次 / 0.3 秒"会算出荒谬的 3.3 CPS。
  // 取 max 而不是直接用调用方给的值,是为了在它给错了的时候保守地偏大 ——
  // 宁可把成绩算低,也不要算出一个比物理上可能的还高的数。
  const durationMs = Math.max(options.durationMs ?? span, span, windowMs);

  let peak = 0;
  let peakAtMs = first;

  // 双指针:窗口左端每右移一格,右端最多也右移一格,整体是 O(n)
  let right = 0;
  for (let left = 0; left < times.length; left++) {
    if (right < left) right = left;
    while (right < times.length && times[right] - times[left] < windowMs) right++;
    const count = right - left;
    if (count > peak) {
      peak = count;
      peakAtMs = times[left];
    }
  }

  return {
    clicks: times.length,
    durationMs,
    average: (times.length / durationMs) * 1000,
    peak,
    peakAtMs: peakAtMs - first,
  };
}

// ---------------------------------------------------------------------------
// 滚轮
// ---------------------------------------------------------------------------

/**
 * 归一化用的换算系数,**是按常见浏览器的约定估的,不是标准**。
 *
 * `WheelEvent.deltaMode` 只说明单位是像素、行还是页,没说"一行多高""一格多少
 * 像素"。实测 Windows 上 Chrome 一格是 100 像素(deltaMode 0)、Firefox 一格是
 * 3 行(deltaMode 1),macOS 的触控板和"平滑滚动"则给出连续的小数值。
 *
 * 所以页面上显示的"格数"只能是估算。真正可信的是**方向**和**方向反转**——
 * 那两个不需要任何换算,直接从 deltaY 的符号就能读出来。
 */
export const WHEEL_PIXELS_PER_NOTCH = 100;
export const WHEEL_LINES_PER_NOTCH = 3;

/** 把一个 wheel 事件换算成"格"。正数向下,负数向上。 */
export function normalizeWheelDelta(deltaY: number, deltaMode: number): number {
  if (!Number.isFinite(deltaY)) return 0;
  if (deltaMode === 1) return deltaY / WHEEL_LINES_PER_NOTCH;
  if (deltaMode === 2) return deltaY;
  return deltaY / WHEEL_PIXELS_PER_NOTCH;
}

/** 一次滚动的方向。和 `deltaY` 同号:正数向下。 */
export type ScrollDir = 'up' | 'down';

export interface ScrollNotch {
  /** 归一化后的格数 */
  notches: number;
  /** 原始 deltaY */
  raw: number;
  /** 原始 deltaMode,0=像素 1=行 2=页 */
  deltaMode: number;
}

export interface ScrollStats {
  events: number;
  /** 归一化后的累计格数,正数向下 */
  netNotches: number;
  up: number;
  down: number;
  /**
   * 方向反转次数。用户每换一次滚动方向就会 +1,所以它本身**不是故障指标**——
   * 要结合用户自己的操作来读。真正指向编码器故障的是 {@link glitches}。
   */
  reversals: number;
  /**
   * 毛刺:一个孤立的反向事件,前后都是同一方向。
   *
   * 这是"编码器跳格"的典型波形。用户在持续朝一个方向滚的时候不会产生
   * 这种序列,所以它比单纯的反转次数有信息量得多。仍然不是铁证——
   * 手指打滑、触控板误触也会造成同样的波形。
   */
  glitches: number;
  /** 单次滚动的最大格数(绝对值) */
  maxNotch: number;
  /** 原始 deltaY 的众数绝对值,用来告诉用户"你这里一格是多少" */
  typicalDelta: number | null;
}

/**
 * 一串方向里,**哪几格是孤立的反向**(毛刺)。
 *
 * 判据和 `summarizeScroll` 的 `glitches` 是同一条 —— 自己反向、前后同向。
 * 单独成一个函数是因为首页合并卡要把最近若干次画成一条带,得知道**是哪一格**,
 * 光有总数画不出来。`summarizeScroll` 也改走这里,免得两处判据日后各漂各的。
 *
 * **首尾两格恒为 `false`**:没有两侧可比。所以最新那一格永远不是毛刺,要等下一次
 * 滚动到了才判得出来 —— 这不是缺陷,孤立与否本来就要看右邻。
 */
export function markScrollGlitches(dirs: readonly ScrollDir[]): boolean[] {
  const flags = dirs.map(() => false);
  for (let i = 1; i < dirs.length - 1; i++) {
    if (dirs[i] !== dirs[i - 1] && dirs[i + 1] === dirs[i - 1]) flags[i] = true;
  }
  return flags;
}

/**
 * 汇总滚轮事件。
 *
 * 只统计方向与计数,**不去解读 deltaY 的大小**——大小受系统滚动行数设置、
 * 平滑滚动、以及设备本身是否"无极滚轮"影响,同一只鼠标在不同电脑上可以
 * 差出十倍。方向则不受这些影响。
 */
export function summarizeScroll(events: readonly ScrollNotch[]): ScrollStats {
  const stats: ScrollStats = {
    events: 0,
    netNotches: 0,
    up: 0,
    down: 0,
    reversals: 0,
    glitches: 0,
    maxNotch: 0,
    typicalDelta: null,
  };

  const signs: number[] = [];
  const deltaCounts = new Map<number, number>();

  for (const event of events) {
    if (!Number.isFinite(event.notches) || event.notches === 0) continue;
    stats.events++;
    stats.netNotches += event.notches;

    const sign = event.notches > 0 ? 1 : -1;
    signs.push(sign);
    if (sign > 0) stats.down++;
    else stats.up++;

    const magnitude = Math.abs(event.notches);
    if (magnitude > stats.maxNotch) stats.maxNotch = magnitude;

    if (Number.isFinite(event.raw) && event.raw !== 0) {
      const key = Math.abs(event.raw);
      deltaCounts.set(key, (deltaCounts.get(key) ?? 0) + 1);
    }
  }

  for (let i = 1; i < signs.length; i++) {
    if (signs[i] !== signs[i - 1]) stats.reversals++;
  }
  // 孤立的反向:前后同向、自己反向。判据和首页那条方向带**共用同一个函数** ——
  // 否则"毛刺几次"和"哪几格标红"迟早会漂成两套说法。
  const dirs = signs.map((sign): ScrollDir => (sign > 0 ? 'down' : 'up'));
  stats.glitches = markScrollGlitches(dirs).filter(Boolean).length;

  let bestCount = 0;
  for (const [delta, count] of deltaCounts) {
    if (count > bestCount) {
      bestCount = count;
      stats.typicalDelta = delta;
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// 轨迹:丢帧与漂移
// ---------------------------------------------------------------------------

/** 相邻采样间距超过中位数的这个倍数,才算一次跳变。 */
export const TRAIL_JUMP_FACTOR = 5;

/**
 * 跳变的绝对下限(像素)。
 *
 * 光有倍数不够:慢慢移动时中位间距可能只有 0.3 像素,五倍也不过 1.5 像素,
 * 手一抖就会满屏都是"丢帧"。加一个绝对下限,把正常的人手抖动挡在外面。
 */
export const TRAIL_JUMP_FLOOR_PX = 20;

export interface TrailJumpStats {
  /** 参与统计的相邻采样对数 */
  steps: number;
  /** 相邻间距的中位数(像素)——在匀速移动时约等于"每个采样走多远" */
  medianStep: number;
  maxStep: number;
  /** 超过阈值的间隔总数。**含连续的大步长**,所以它本身不是故障指标 */
  jumps: number;
  /**
   * 孤立尖峰次数:自己超阈值,而左右**两个**邻居都没超。
   *
   * 这才是丢帧的形状。上面那个 `jumps` 把两种成因混在一起——匀速画圈时
   * 冒出的孤立尖峰,和甩得快时连着出现的一串大步长,都会被它计入。而这两者
   * 在形态上是分开的,所以这里把前者单独数出来,页面拿它当主指标。
   *
   * 首尾两步**不算**:它们只有一侧有邻居,没有依据判断是不是孤立,
   * 宁可漏报也不误报。
   */
  isolated: number;
  /** 判定阈值(像素) */
  threshold: number;
}

/**
 * 找出轨迹里的异常跳变。
 *
 * **它抓到的不是"确定的丢帧"。** 一次大的相邻间距有两个来源:传感器漏报了
 * 几个计数,或者用户的手真的甩快了。浏览器拿不到序列号,区分不了——
 * 这一点必须如实写在页面上。
 *
 * 但它仍然有用,因为两者的**统计形态**不同:丢帧是"在一串均匀的小间距里
 * 插进一个孤立的大间距",是尖峰;而手甩快了会让**连续一串**间距一起变大。
 * 所以判读方法是:匀速画圈时如果反复出现尖峰,就是丢帧;只在甩得快的时候
 * 出现,那是你手快。阈值取"中位数的 5 倍且不低于 20 像素"正是为了贴合
 * 这个形态——它只挑尖峰,不挑整体的加速。
 *
 * 返回 `null` 表示样本不足以给出结论。
 */
export function detectTrailJumps(
  x: Float32Array,
  y: Float32Array,
  segment: Segment,
  options: { factor?: number; floorPx?: number } = {},
): TrailJumpStats | null {
  const factor = options.factor ?? TRAIL_JUMP_FACTOR;
  const floorPx = options.floorPx ?? TRAIL_JUMP_FLOOR_PX;

  const count = segment.end - segment.start;
  if (count < 3) return null;

  const steps = new Float64Array(count - 1);
  for (let i = segment.start + 1; i < segment.end; i++) {
    const dx = x[i] - x[i - 1];
    const dy = y[i] - y[i - 1];
    steps[i - segment.start - 1] = Math.sqrt(dx * dx + dy * dy);
  }

  const sorted = Float64Array.from(steps).sort();
  const medianStep = percentile(sorted, 0.5);
  const threshold = Math.max(medianStep * factor, floorPx);

  const over = new Uint8Array(steps.length);
  let jumps = 0;
  let maxStep = 0;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step > maxStep) maxStep = step;
    if (step > threshold) {
      over[i] = 1;
      jumps++;
    }
  }

  // 孤立 = 自己超线、两侧都没超。首尾两步只有一侧有邻居,不参与判断。
  let isolated = 0;
  for (let i = 1; i < steps.length - 1; i++) {
    if (over[i] === 1 && over[i - 1] === 0 && over[i + 1] === 0) isolated++;
  }

  return { steps: steps.length, medianStep, maxStep, jumps, isolated, threshold };
}

// ---------------------------------------------------------------------------
// 轨迹:角度吸附
// ---------------------------------------------------------------------------

/**
 * 角度吸附(angle snapping,厂商也叫"预测")是固件把**接近水平或垂直**的手部
 * 动作拉成完全笔直的功能。判据的物理依据只有一句:
 *
 * > **人手画不出完美直线。** 一条一百像素以上的手绘笔画,总会在拟合线两侧
 * > 游走一两个像素;而被吸附过的笔画**严格落在轴上**。
 *
 * 所以量的是"整条笔画离它自己的拟合线有多远"。它只读 x/y 两个几何量,
 * 整段判据里**没有时间戳**——和 `detectTrailJumps` 同一类,因此浏览器里成立。
 *
 * **这套阈值不是照搬来的,是量出来的,而且量出来的结论对判据不利。**
 * 见 `tests/analysis.test.ts` 里那两组量化用例:造手抖 → 取整 → 量误判率。
 * 误判(把干净鼠标说成开了吸附)在 31 个采样 / 手抖 0.2px 时高达 **27%**,
 * 因为手抖是亚像素的,取整会把它整个吃掉。**这个模块只用来做试验性展示,
 * 不要拿它给用户下一个确定的结论。** 细节见 `trail-test.astro` 里那段说明。
 */

/** 笔画短于这个长度(像素)就不判——太短的笔画没有形状可言。 */
export const SNAP_MIN_LENGTH_PX = 100;

/** 采样少于这么多就不判——几个点连成"直线"是巧合。 */
export const SNAP_MIN_SAMPLES = 20;

/** 与最近坐标轴的夹角小于这个度数,才算"近轴笔画"。吸附只在这种笔画上动手。 */
export const SNAP_NEAR_AXIS_DEG = 15;

/** 近轴笔画还要同时满足下面两条,才算被吸附。 */
export const SNAP_AXIS_DEG = 1;
/**
 * 到拟合线的**最大**垂直距离。**这个才是判据的承重墙,而且它是量出来的。**
 *
 * 实测(造手抖 → 取整 → 量残差):
 *
 * | 笔画 | 最大残差 |
 * | --- | --- |
 * | 固件吸附(严格贴轴) | **恰好 0** |
 * | 手抖 0.05px/采样 | 0.69 – 0.95 |
 * | 手抖 0.1px/采样 | 约 0.69 |
 * | 手抖 0.25px/采样 | 约 1.09 |
 *
 * 中间那段**是空的** —— 从 0 直接跳到 0.69。因为"贴轴"是个整数量化事实:
 * `y` 要么全程只有一个值(残差恰好 0),要么总有一个点落到隔壁那一行上。
 * 阈值放这段空档的中点,取 0.35。
 *
 * **别改回均方根。** 最初照搬原生实现写的是"rms < 0.3 且 max < 1.5",实测
 * `step=1px` 时手抖 0.1px/采样就落进 0.300,被误判成吸附 —— 均方根把 200 个点
 * 平均掉,一个点跳出去就摊薄到 0.3 以下,而"有一个点跳出去了"正是要抓的那件事。
 * `rmsResidual` 仍然算出来,只作形状描述,不再参与判定。
 */
export const SNAP_MAX_RESIDUAL = 0.35;

/** 至少这么多条近轴笔画才给结论——一条都不能说明问题,只能说明运气。 */
export const SNAP_MIN_NEAR_AXIS_STROKES = 3;

/** 近轴笔画里被判为吸附的比例达到这个值,才说"检出吸附"。 */
export const SNAP_FRACTION = 0.5;

/** 一条笔画的几何形状。 */
export interface StrokeShape {
  /** 沿路径累加的长度(像素),不是首尾直线距离 */
  length: number;
  /** 净位移方向(度),-180..180。屏幕坐标,正 y 向下 */
  angleDeg: number;
  /** 到最近坐标轴的角度距离,0..45 */
  axisDeviationDeg: number;
  /** 路径到拟合线的垂直距离的**均方根**。只作形状描述,不参与判定 */
  rmsResidual: number;
  /** 路径到拟合线的**最大**垂直距离。判定就看它 */
  maxResidual: number;
  /** 参与拟合的点数 */
  samples: number;
}

/**
 * 把一段采样拟合成一条笔画,量出它的形状。
 *
 * 返回 `null` 表示这段太短(长度或采样数不够),给不出形状——UI 必须如实
 * 显示"这条不算",而不是拿几个点的巧合去凑一个"笔直"的结论。
 *
 * 拟合在**相对轨迹**上做:从起点把每一步的增量叠起来。绝对坐标里可能藏着
 * 一个很大的偏移,那个偏移对"直不直"没有任何信息。
 */
export function strokeShape(
  x: Float32Array,
  y: Float32Array,
  start: number,
  end: number,
): StrokeShape | null {
  const count = end - start;
  if (count < SNAP_MIN_SAMPLES) return null;

  const px = new Float64Array(count);
  const py = new Float64Array(count);
  let length = 0;
  for (let i = 1; i < count; i++) {
    const dx = x[start + i] - x[start + i - 1];
    const dy = y[start + i] - y[start + i - 1];
    px[i] = px[i - 1] + dx;
    py[i] = py[i - 1] + dy;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  if (length < SNAP_MIN_LENGTH_PX) return null;

  // 净位移定"往哪个方向去了"。轴偏离看它,不看拟合方向——拟合方向在小抖动下
  // 会自己往抖动那边偏,而"这条笔画是不是横的"应该由首尾说了算。
  const angleDeg = (Math.atan2(py[count - 1], px[count - 1]) * 180) / Math.PI;
  const mod = Math.abs(angleDeg) % 90;
  const axisDeviationDeg = Math.min(mod, 90 - mod);

  // 拟合线取点云的主方向(2×2 协方差的主特征向量),不是首尾连线:
  // 首尾连线会被两端各一个离群点整个带偏,主方向不会。
  let mx = 0;
  let my = 0;
  for (let i = 0; i < count; i++) {
    mx += px[i];
    my += py[i];
  }
  mx /= count;
  my /= count;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < count; i++) {
    const ex = px[i] - mx;
    const ey = py[i] - my;
    sxx += ex * ex;
    syy += ey * ey;
    sxy += ex * ey;
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const ux = Math.cos(theta);
  const uy = Math.sin(theta);

  let sumSq = 0;
  let maxResidual = 0;
  for (let i = 0; i < count; i++) {
    const ex = px[i] - mx;
    const ey = py[i] - my;
    const perp = Math.abs(ex * uy - ey * ux);
    sumSq += perp * perp;
    if (perp > maxResidual) maxResidual = perp;
  }

  return {
    length,
    angleDeg,
    axisDeviationDeg,
    rmsResidual: Math.sqrt(sumSq / count),
    maxResidual,
    samples: count,
  };
}

/** 这条笔画够不够"横平竖直",值得拿去判吸附。 */
export function isNearAxis(shape: StrokeShape): boolean {
  return shape.axisDeviationDeg < SNAP_NEAR_AXIS_DEG;
}

/**
 * 这条笔画是不是笔直到了人手做不到的程度。
 *
 * 两道闸缺一不可。角度那道闸**不是冗余**:实测一条 8° 的整数阶梯(每 7 步落
 * 一格)最大残差只有 0.435,只比阈值高一丁点——锯齿的主方向会自己往中间偏,
 * 把两侧摊平。所以"够不够贴轴"和"够不够直"必须分开问。
 */
export function isSnapped(shape: StrokeShape): boolean {
  return (
    shape.axisDeviationDeg < SNAP_AXIS_DEG &&
    shape.maxResidual < SNAP_MAX_RESIDUAL
  );
}

/** 这条笔画贴着的是哪个轴:0 = 水平,90 = 垂直。 */
export function snapAxis(angleDeg: number): number {
  const a = Math.abs(angleDeg) % 180;
  return a >= 45 && a <= 135 ? 90 : 0;
}

export interface AngleSnapStats {
  /**
   * 结论是否可信。近轴笔画不足 {@link SNAP_MIN_NEAR_AXIS_STROKES} 条时为 false,
   * 此时 `hasSnapping` 一律是 false —— "没检出"和"画得太少没法判"必须分开。
   */
  conclusive: boolean;
  hasSnapping: boolean;
  totalStrokes: number;
  nearAxisStrokes: number;
  snappedStrokes: number;
  /** 近轴笔画里被吸附的比例,0..1 */
  snapStrength: number;
  /** 检出吸附的轴(0 = 水平,90 = 垂直) */
  axes: number[];
}

/**
 * 由若干条笔画的形状判定有没有角度吸附。
 *
 * **结论只有"检出 / 没检出 / 画得不够"三档**,没有中间态。近轴笔画不够就给
 * `conclusive: false`,页面必须说"再画几条横的和竖的"而不是报"未检出吸附"——
 * 后者会让一个开着吸附的鼠标拿到清白。
 *
 * 但**"检出"这一档本身也不可信**:误判率取决于用户的手抖幅度和笔画长度,
 * 而这两样页面都量不到。见本节的模块注释。
 */
export function detectAngleSnap(shapes: readonly StrokeShape[]): AngleSnapStats {
  const nearAxis = shapes.filter(isNearAxis);
  const snapped = nearAxis.filter(isSnapped);

  const conclusive = nearAxis.length >= SNAP_MIN_NEAR_AXIS_STROKES;
  const snapStrength = nearAxis.length === 0 ? 0 : snapped.length / nearAxis.length;
  const hasSnapping = conclusive && snapStrength >= SNAP_FRACTION;

  const axes: number[] = [];
  if (hasSnapping) {
    for (const shape of snapped) {
      const axis = snapAxis(shape.angleDeg);
      if (!axes.includes(axis)) axes.push(axis);
    }
    axes.sort((a, b) => a - b);
  }

  return {
    conclusive,
    hasSnapping,
    totalStrokes: shapes.length,
    nearAxisStrokes: nearAxis.length,
    snappedStrokes: snapped.length,
    snapStrength,
    axes,
  };
}

export interface DriftStats {
  /** 静止期间收到的采样数 */
  samples: number;
  /** 采样点包围盒的对角线长度(像素)——抖动幅度 */
  spanPx: number;
  /** 采样点走过的总路程(像素) */
  pathPx: number;
}

/**
 * 静止漂移:用户把鼠标搁在桌上不动时,传感器本不该产生任何计数。
 *
 * 这个函数的输入是**静止期间**的采样。放到鼠标上是好鼠标的话,
 * 采样数应当是 0(鼠标不发报文,事件根本不会派发);真收到了采样,
 * 说明传感器在自激或受桌面/鼠标垫表面干扰。
 *
 * `samples` 才是主指标,`spanPx` 只是描述抖成什么样。
 */
export function measureDrift(
  x: Float32Array,
  y: Float32Array,
  segment: Segment,
): DriftStats | null {
  const count = segment.end - segment.start;
  if (count < 1) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = segment.start; i < segment.end; i++) {
    if (x[i] < minX) minX = x[i];
    if (x[i] > maxX) maxX = x[i];
    if (y[i] < minY) minY = y[i];
    if (y[i] > maxY) maxY = y[i];
  }

  return {
    samples: count,
    spanPx: Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2),
    pathPx: pathLength(x, y, segment),
  };
}

// ---------------------------------------------------------------------------
// 长按拖拽
// ---------------------------------------------------------------------------

/**
 * 判定"疑似瞬断"的时间窗。
 *
 * 松手后 30ms 内又在原地按下去——这个动作人手做不出来。人的双击最快也在
 * 60ms 以上,而且鼠标会因为反作用力挪动位置。所以"极短 + 位置几乎没变"
 * 这个组合,基本只可能是按键信号自己断了一下。
 */
export const REPRESS_WINDOW_MS = 30;

/** 判定"没动过位置"的半径(像素)。与上面的时间窗配合使用。 */
export const REPRESS_RADIUS_PX = 4;

export interface DragEvent {
  /** event.timeStamp(毫秒) */
  t: number;
  x: number;
  y: number;
  /**
   * 事件类型。**必须是边沿而不是状态**:用 `down: boolean` 表示"此刻按键是否
   * 按下"会把"按着不动的移动事件"和"刚刚按下"混成一种,于是每一次按住期间的
   * 移动都会被当成新的一次按下。
   *
   * `down` / `up` 来自 `pointerdown` / `pointerup`,`move` 来自按住期间的
   * `pointermove`。判断"是否还按着"用 `event.buttons !== 0`,不要用
   * `event.button`——后者在组合键下会漏掉中间的状态变化(见 CLAUDE.md)。
   */
  kind: 'down' | 'up' | 'move';
  /**
   * 本事件发生时指针上按着哪些键 —— 本站编号(0 左 / 1 中 / 2 右 / 3 侧键4 /
   * 4 侧键5)的**位掩码**,即第 `code` 位表示编号为 `code` 的键。
   * 直接来自 `maskFromButtons(event.buttons)`。
   *
   * 为什么是掩码而不是"这一次是哪个键的":"一次事件"和"一个键"根本不是一对一
   * 的。同时按住左键和右键拖动时,**那一次移动对两个键都算数**;用单个编号的话
   * 同一个事件就得在流里存好几份,`events[]` 也就不再是"实际发生了什么"的忠实
   * 记录 —— 而本站的整个立场是如实报告。掩码让一条真实事件 = 一条记录。
   *
   * 注意这是**状态,不是边沿**:`pointerup` 的 `event.buttons` 是 0,所以它的
   * 掩码也是 0 —— 它只说"所有键都松开了",**不说松开的是哪个**;而
   * `pointerdown` 只在从"无键"到"有键"那一次派发,第二个键的按下压根没有对应的
   * `pointerdown`(见 CLAUDE.md「组合按键」)。所以每个键自己的 down / up 只能靠
   * 前后两次事件的掩码比对推出来,这件事由 `analyzeDragEpisodesByButton` 负责。
   */
  buttonMask: number;
}

export interface DragEpisode {
  startMs: number;
  endMs: number;
  durationMs: number;
  /** 疑似瞬断次数:极短时间内原地重按 */
  drops: number;
  /** 本次拖拽走过的路程(像素) */
  distancePx: number;
  samples: number;
  /** 结束时按键仍未松开(用户还按着,或者页面收不到后续事件了) */
  open: boolean;
}

export interface DragOptions {
  repressWindowMs?: number;
  repressRadiusPx?: number;
}

/**
 * 把事件流切成一次次独立的"按住"。
 *
 * 这里必须说清楚一件事:**浏览器里没有"按键瞬断"这个信号。** 中途断一下,
 * 在事件流里就是一次 `pointerup` 加一次 `pointerdown`,和用户真的松手再按
 * 完全一样。区分只能靠**行为特征**——人做不到在 30ms 内原地重按。
 *
 * 所以本函数与页面都只能说"疑似"。判读方式是:如果你确定自己一直按着没松,
 * 而这里报出了瞬断,那就是鼠标的问题;如果你中间确实松了手,那是你自己干的。
 * 页面上要这么写,不能把疑似说成确诊。
 */
export function analyzeDragEpisodes(
  events: readonly DragEvent[],
  options: DragOptions = {},
): DragEpisode[] {
  const repressWindowMs = options.repressWindowMs ?? REPRESS_WINDOW_MS;
  const repressRadiusPx = options.repressRadiusPx ?? REPRESS_RADIUS_PX;

  /** 中间产物:一次按下到一次松开,不含合并 */
  interface Press {
    down: DragEvent;
    up: DragEvent | null;
    /** 本次按压期间经过的所有点,含 down 与 up */
    points: DragEvent[];
  }

  const presses: Press[] = [];
  let current: Press | null = null;

  for (const event of events) {
    if (!Number.isFinite(event.t)) continue;

    if (event.kind === 'down') {
      if (current !== null) {
        // 同一个指针不会连着来两次 down。真出现了,说明上一次按压的 up
        // 我们没收到(窗口失焦、页面切换)。把前一次如实收尾——它会被标成
        // open,页面据此提示"这一次没能跟踪完整"——再开新的一段。
        presses.push(current);
      }
      current = { down: event, up: null, points: [event] };
      continue;
    }

    // 还没按下就来的移动或松开:不属于任何一次按压,丢掉
    if (current === null) continue;

    current.points.push(event);
    if (event.kind === 'up') {
      current.up = event;
      presses.push(current);
      current = null;
    }
  }

  // 结尾仍未松开的那一次也算一段——用户还按着呢
  if (current !== null) {
    presses.push(current);
  }

  const episodes: DragEpisode[] = [];

  for (let i = 0; i < presses.length; i++) {
    const press = presses[i];
    const points = [...press.points];

    let drops = 0;
    const last = press.up;

    /*
     * 合并之后这一段到底算不算结束,**要看链条最末端那一次**的 up,
     * 不能看锚点那一次的。
     *
     * 锚点(`last`)只负责判据:每一次候选都拿它比对时间窗和半径(这是刻意的,
     * 见下面的注释)。但"还按着吗"是另一回事——"按住 → 断一下 → 接着按住
     * 不松"的时候锚点是有 up 的,而链条末端没有,那一段明明还在进行中。
     * 用锚点判断会把它报成已结束:统计面板会把它算进"拖拽次数",
     * 而实时秒数的显示条件正是 `current.open`,于是**恰好在用户等故障的那一刻
     * 停住不动**。
     */
    let chainOpen = press.up === null;

    // 往后看:紧接着的重按是不是"疑似瞬断"?是就并进来,当作同一次按住。
    if (last !== null) {
      let next = i + 1;
      while (next < presses.length) {
        const candidate = presses[next];
        const gapMs = candidate.down.t - last.t;
        if (gapMs > repressWindowMs) break;

        const dx = candidate.down.x - last.x;
        const dy = candidate.down.y - last.y;
        if (Math.sqrt(dx * dx + dy * dy) > repressRadiusPx) break;

        drops++;
        points.push(...candidate.points);
        chainOpen = candidate.up === null;
        i = next;
        next++;
      }
    }

    const startMs = points[0].t;
    const endMs = points[points.length - 1].t;

    let distancePx = 0;
    for (let k = 1; k < points.length; k++) {
      const dx = points[k].x - points[k - 1].x;
      const dy = points[k].y - points[k - 1].y;
      distancePx += Math.sqrt(dx * dx + dy * dy);
    }

    episodes.push({
      startMs,
      endMs,
      durationMs: Math.max(0, endMs - startMs),
      drops,
      distancePx,
      samples: points.length,
      open: chainOpen,
    });
  }

  return episodes;
}

/**
 * 把原始事件流按按键拆开,各自跑一遍 `analyzeDragEpisodes`。
 *
 * **判据一个字都没变**:每个按键拿到的是一条独立的事件流,时间窗还是 30ms、
 * 半径还是 4px。变的是"先拆开再判",不是"判得更松或更严"。
 *
 * 为什么必须拆:**混合的流直接喂给 `analyzeDragEpisodes` 会产出垃圾。**
 * 按住左键、再按右键、再松开左键,原始序列是
 * `down(左) move(左+右) move(右) up(无)`。那一遍只认 down/up 的先后、
 * 不认是谁的,于是第三条(其实只是**左键**松开)会被当成整段结束,切出两段
 * 毫无意义的段落。**所以全局合计只能把各按键的结果汇总**,不能从一条混合流算。
 *
 * **边沿是在这里推出来的,不是调用方给的。** 见 `DragEvent.buttonMask` 那段:
 * 原始 `pointerup` 的掩码是 0(不说是哪个键),而第二个键的按下根本没有
 * `pointerdown`。所以每个键自己的 down / up 只能靠**前后两次事件的掩码比对**
 * 得到。放在这个纯函数里而不是页面里,是因为页面测不到 —— 本模块有单测。
 *
 * 返回的 Map **只含这次输入里真正出现过事件的按键**。没有这个键 ≠ 这个键 0 次,
 * 而是"这个键一个事件都没收到"—— 可能压根没测它,也可能是鼠标或驱动根本没把它
 * 作为鼠标键上报(有些鼠标的侧键被驱动发成键盘事件)。页面遇到这种情况必须显示
 * "未测",**不能显示 0**:这两件事在数据上一样、结论相反,正是本站要防的那种错。
 */
export function analyzeDragEpisodesByButton(
  events: readonly DragEvent[],
  options: DragOptions = {},
): Map<number, DragEpisode[]> {
  const streams = new Map<number, DragEvent[]>();

  /** 取某个编号的事件流,没有就建一条空的 */
  function streamFor(code: number): DragEvent[] {
    let list = streams.get(code);
    if (!list) {
      list = [];
      streams.set(code, list);
    }
    return list;
  }

  let prevMask = 0;

  for (const event of events) {
    if (!Number.isFinite(event.t)) continue;

    const { t, x, y, kind } = event;
    const nextMask = event.buttonMask;

    /*
     * 只看**前后不同**的那些位 —— 没变的位没有边沿可推。
     * 逐位取出置位编号:刻意**不** import 按键表,本模块至今没有任何 import,
     * 是自包含的纯模块,引进来会平白多一条依赖。`rest & -rest` 取出最低的
     * 那个置位,`31 - clz32(...)` 就是它的位号,`rest &= rest - 1` 把它抹掉 ——
     * 循环次数等于**变化的键数**(≤5),而不是按键总数。
     * 认不出的位(比如滚轮左右倾)在原样比对下也能自洽,过滤交给上游的
     * `maskFromButtons` —— 那边才是知道"本站有哪几个键"的地方。
     */
    for (let rest = prevMask ^ nextMask; rest !== 0; rest &= rest - 1) {
      const bit = rest & -rest;
      const code = 31 - Math.clz32(bit);
      // 位置取本事件的位置:变的是键,指针没动
      const edge: DragEvent['kind'] = (nextMask & bit) !== 0 ? 'down' : 'up';
      streamFor(code).push({ t, x, y, kind: edge, buttonMask: bit });
    }

    /*
     * 状态没变的位:一次移动要记进**它当时按着的每一个键**里。
     * 这是有意的重复计量 —— 同时按住两个键拖动时,两边都会算上这段路程,
     * 因为每个键那一行问的都是"按住这个键期间走了多远"。页面必须说明这一点,
     * 不能让"累计路程"看起来能直接相加。
     *
     * 刚变成按下的那一位**不**补一条 move:它的 down 就落在本事件的位置上。
     */
    if (kind === 'move') {
      for (let rest = nextMask & prevMask; rest !== 0; rest &= rest - 1) {
        const bit = rest & -rest;
        streamFor(31 - Math.clz32(bit)).push({ t, x, y, kind: 'move', buttonMask: bit });
      }
    }

    prevMask = nextMask;
  }

  const result = new Map<number, DragEpisode[]>();
  for (const [code, list] of streams) {
    result.set(code, analyzeDragEpisodes(list, options));
  }

  // 按键升序,输出稳定 —— 页面按编号对齐表格,单测也好断言
  return new Map([...result].sort((a, b) => a[0] - b[0]));
}

// ---------------------------------------------------------------------------
// DPI 与指针加速度
// ---------------------------------------------------------------------------

export const CM_PER_INCH = 2.54;

/**
 * 常见的标称 DPI 档位。
 *
 * 和回报率档位不同,这张表**只是给人一个对照**,不是判定标准:同一只鼠标的
 * 实际 DPI 和标称值差个 5% 是常事,而且本页的测量方式(靠用户手动移动固定
 * 距离)本身就带误差。所以在页面上它只用来给一句"大约相当于"。
 */
export const STANDARD_DPI = [
  400, 800, 1200, 1600, 2000, 2400, 3200, 4000, 6400, 12800, 25600,
] as const;

export interface DpiInput {
  /** 鼠标移动期间光标在屏幕上走过的距离(CSS 像素) */
  pixels: number;
  /** 用户报告的实际移动距离(厘米) */
  distanceCm: number;
  /**
   * 显示缩放倍数,默认 1。
   *
   * 换算链是这样的:鼠标每移动一英寸产生 DPI 个计数,Windows 在指针速度
   * 居中且关闭加速时把 1 个计数映射成 1 个**物理**像素,而浏览器报的
   * `clientX` 是 **CSS** 像素。所以 CSS 像素要乘回缩放倍数才是计数。
   */
  scale?: number;
}

/**
 * 由屏幕位移反推 DPI(CPI)。
 *
 * **这个数字能准到什么程度,完全取决于用户有没有关掉指针加速。**
 * 开着"提高指针精确度"时,系统按移动速度额外放大位移,测出来的只是一个
 * 与速度有关的混合值。页面上必须把这件事说在最显眼的位置,否则给出的
 * 就是一个看起来精确的假数字。
 *
 * 返回 `null` 表示输入不足以计算。
 */
export function estimateDpi(input: DpiInput): number | null {
  const scale = input.scale ?? 1;
  if (!Number.isFinite(input.pixels) || !Number.isFinite(input.distanceCm)) return null;
  if (!Number.isFinite(scale) || scale <= 0) return null;
  if (input.distanceCm <= 0) return null;

  const inches = input.distanceCm / CM_PER_INCH;
  if (!(inches > 0)) return null;

  // 取绝对值:向左移动是负的,但 DPI 是个大小,没有方向
  const dpi = (Math.abs(input.pixels) * scale) / inches;
  if (!Number.isFinite(dpi) || dpi <= 0) return null;

  return dpi;
}

/**
 * 把估算出的 DPI 归到最近的常见档位。
 *
 * 容差比回报率的 8% 宽得多,给到 12%。原因是这里的误差主要来自"用户有没有
 * 准确地移动 10.00 厘米",而不是算法——手抖一两毫米就对应 1–2% 的偏差,
 * 再算上桌面摩擦和起始位置判断,12% 已经是乐观估计。
 */
export function classifyDpi(dpi: number, tolerance = 0.12): number | null {
  if (!Number.isFinite(dpi) || dpi <= 0) return null;

  let best: number | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const candidate of STANDARD_DPI) {
    const delta = Math.abs(dpi - candidate);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = candidate;
    }
  }
  if (best === null) return null;
  return bestDelta / best <= tolerance ? best : null;
}

export type AccelLevel = 'none' | 'mild' | 'strong' | 'unknown';

export interface AccelComparison {
  /** 慢速移动时估算的 DPI */
  slowDpi: number | null;
  /** 快速移动时估算的 DPI */
  fastDpi: number | null;
  /** 快速 ÷ 慢速。没有加速度时应当接近 1 */
  ratio: number | null;
  level: AccelLevel;
}

/**
 * 判定是否存在指针加速度。
 *
 * 原理:加速度是"移动越快,每个计数被放大得越多"。所以**同样移动 10 厘米**,
 * 快着走比慢着走会让光标多走一截。两次估算出的 DPI 之比就是放大倍数——
 * 关掉加速时这个比值应当接近 1。
 *
 * 阈值:
 * - 1.15 以下不算。这个量级的差异手速变化和测量误差就能造出来。
 * - 1.15–1.5 算轻微。Windows 的"提高指针精确度"在中等速度下大约是这个量级。
 * - 1.5 以上算明显。开了加速并且快速甩动时会到 2 倍甚至更多。
 *
 * 读数为 `unknown` 时页面必须显示"测不出来",不要默认判成"没有加速度"——
 * 那是把一个缺失的结论说成了否定的结论。
 */
export const ACCEL_MILD_RATIO = 1.15;
export const ACCEL_STRONG_RATIO = 1.5;

export function compareAcceleration(
  slowDpi: number | null,
  fastDpi: number | null,
): AccelComparison {
  if (
    slowDpi === null ||
    fastDpi === null ||
    !Number.isFinite(slowDpi) ||
    !Number.isFinite(fastDpi) ||
    slowDpi <= 0
  ) {
    return { slowDpi, fastDpi, ratio: null, level: 'unknown' };
  }

  const ratio = fastDpi / slowDpi;
  let level: AccelLevel = 'none';
  if (ratio >= ACCEL_STRONG_RATIO) level = 'strong';
  else if (ratio >= ACCEL_MILD_RATIO) level = 'mild';

  return { slowDpi, fastDpi, ratio, level };
}

// ---------------------------------------------------------------------------
// 键盘
// ---------------------------------------------------------------------------

export interface KeyEvent {
  /** event.timeStamp */
  t: number;
  /** `KeyboardEvent.code`,物理键位。用 code 而不是 key:后者随输入法变 */
  code: string;
  down: boolean;
}

export interface KeyboardStats {
  /** 按下次数(不含系统自动重复——调用方要先滤掉 event.repeat) */
  presses: number;
  /** 出现过的不同键数 */
  uniqueKeys: number;
  /** 同时按住的最大键数 */
  maxSimultaneous: number;
  /** 结束时仍被认为按住的键数 */
  stuck: number;
}

/**
 * 汇总按键流。
 *
 * `maxSimultaneous` 是这里唯一有点分量的指标:键盘的无冲(N-key rollover)
 * 能力不足时,同时按住多个键会有一个不亮。但**它不能单独下结论**——
 * 系统在把按键交给浏览器之前就已经把冲突的键吃掉了,所以"没亮"既可能是
 * 键盘的无冲能力不够,也可能是那个键本身坏了。页面上要说清楚区分方法:
 * 单独按一次,亮就是无冲问题,不亮才是键坏了。
 *
 * `stuck` 通常不是键盘故障,而是窗口失焦时收不到 `keyup`(用户按了
 * Alt+Tab、或者按了浏览器自己截走的快捷键)。
 */
export function summarizeKeyboard(events: readonly KeyEvent[]): KeyboardStats {
  const held = new Set<string>();
  const seen = new Set<string>();
  let presses = 0;
  let maxSimultaneous = 0;

  for (const event of events) {
    if (typeof event.code !== 'string' || event.code === '') continue;

    if (event.down) {
      presses++;
      seen.add(event.code);
      held.add(event.code);
      if (held.size > maxSimultaneous) maxSimultaneous = held.size;
    } else {
      held.delete(event.code);
    }
  }

  return {
    presses,
    uniqueKeys: seen.size,
    maxSimultaneous,
    stuck: held.size,
  };
}

/* ------------------------------------------------------------------ *
 * 反应速度测试(趣味工具,不是诊断)
 * ------------------------------------------------------------------ */

/**
 * 一次按下的生理下限(毫秒)。
 *
 * 简单视觉反应的生理下限约 120–150ms。**短于这个数的按下不可能是反应**——
 * 它是预判好的那一下正好落在刺激刷新之后,会记到一个真实、但不是反应的数。
 *
 * 判据是"生理上不可能",不是调参旋钮,所以可以照实写进正文。
 *
 * 副作用(已记录):CDP 的合成点击几乎必然落进这一档被标成"可疑"。
 * 那是**对的行为**,不要为了让它变绿去删这个下限。
 */
export const RT_IMPLAUSIBLE_MS = 100;

/**
 * 单次的等待上限(毫秒)。到点没等到按下,这一次作废。
 *
 * 必须有这条:**按住不放跨过刺激刷新时,永远不会有 `pointerdown`**
 * (`pointerdown` 只在"无键按下 → 有键按下"那一刻派发一次)。不设超时,
 * 这一次要么挂死,要么被记成一条几千毫秒的假成绩。
 */
export const RT_TIMEOUT_MS = 1500;

/** 刺激出现前随机等待的区间(毫秒)。 */
export const RT_WAIT_MIN_MS = 1500;
export const RT_WAIT_MAX_MS = 4000;

/** 一轮几次。少于这个数不给中位数。 */
export const TRIALS_PER_ROUND = 5;

/**
 * 中位数至少要这么多次有效成绩才出。
 *
 * 两次的"中位数"就是平均值,那个数说明不了任何事——宁可给破折号。
 */
export const MIN_VALID_TRIALS = TRIALS_PER_ROUND;

export type ReactionOutcome = 'timed' | 'foul' | 'timeout' | 'void';

/**
 * 一次尝试的记录。
 *
 * 判据在**页面**上(它才知道用户什么时候按的),但**分类在这层**:
 * 哪一条算有效、哪一条只是"可疑",由 {@link summarizeReaction} 用
 * {@link RT_IMPLAUSIBLE_MS} 定,这样这套判据能被单测钉住——放在页面里就只能靠手测。
 */
export type ReactionTrial =
  | { outcome: 'timed'; ms: number }
  | { outcome: 'foul' }
  | { outcome: 'timeout' }
  | { outcome: 'void' };

export interface ReactionSummary {
  /** 中位反应。有效次数不足 {@link MIN_VALID_TRIALS} 时为 `null`,页面出破折号 */
  medianMs: number | null;
  /** 观察到的最快一次。**不是极限**;没有有效成绩时为 `null` */
  fastestMs: number | null;
  /** 有效次数,即进入中位数的样本数 */
  valid: number;
  /** 抢跑:刺激还没出现就按了。是有效可测的事件,单独计数 */
  foul: number;
  /** 到点没按 */
  timeout: number;
  /** 中途作废(切走页面、时钟无效) */
  void: number;
  /** 快得不像反应,已排除在中位数之外 */
  suspect: number;
}

/**
 * 汇总一轮反应成绩。
 *
 * 四条排除规则,**每一条都单独计数、都在页面上可见**:
 *
 * 1. `foul` / `timeout` / `void` 直接不进中位数——它们根本没有反应时间可言。
 * 2. `ms <= 0` 归入 `void`。输入事件的 `timeStamp` 可以早于锚点帧,夹到 0 是造假。
 * 3. `ms < RT_IMPLAUSIBLE_MS` 归入 `suspect`,**排除但不丢弃**:条数照报。
 *
 * **报中位数而不是平均值。** 理由不是时钟量化,是走神:一次 600ms 的失神能把
 * 10 次的平均值推高 40ms,而中位数几乎不动。
 */
export function summarizeReaction(trials: readonly ReactionTrial[]): ReactionSummary {
  const valid: number[] = [];
  let foul = 0;
  let timeout = 0;
  let invalid = 0;
  let suspect = 0;

  for (const trial of trials) {
    if (trial.outcome === 'foul') {
      foul++;
      continue;
    }
    if (trial.outcome === 'timeout') {
      timeout++;
      continue;
    }
    if (trial.outcome === 'void') {
      invalid++;
      continue;
    }

    const ms = trial.ms;
    if (!Number.isFinite(ms) || ms <= 0) {
      invalid++;
    } else if (ms < RT_IMPLAUSIBLE_MS) {
      suspect++;
    } else {
      valid.push(ms);
    }
  }

  // 走既有的 percentile,不另写一份中位数 —— 分位数的插值口径全站只能有一套
  const sorted = Float64Array.from(valid).sort();

  return {
    medianMs: valid.length >= MIN_VALID_TRIALS ? percentile(sorted, 0.5) : null,
    fastestMs: valid.length > 0 ? sorted[0] : null,
    valid: valid.length,
    foul,
    timeout,
    void: invalid,
    suspect,
  };
}

/* ------------------------------------------------------------------ *
 * 瞄准测试(趣味工具,不是诊断)
 * ------------------------------------------------------------------ */

export type AimMode = 'multi' | 'single';
export type AimDifficulty = 'easy' | 'standard' | 'hard';

/**
 * 目标直径,CSS 像素。
 *
 * **这个数必须显示在页面上。** 命中率不受 DPI 和灵敏度影响,但受目标的
 * **角尺寸**影响——不印直径,那个百分比就不是自描述的,换一档就没法比。
 */
export const TARGET_DIAMETER_PX: Record<AimDifficulty, number> = {
  easy: 56,
  standard: 40,
  hard: 28,
};

/** 同时在场的目标数。 */
export const TARGET_COUNT: Record<AimMode, number> = { multi: 3, single: 1 };

/**
 * 一次射击。`offsetPx` 是落点到目标圆心的距离,**只在命中时有意义**。
 * 用可辨识联合而不是 `offsetPx: number | null`,是为了让"脱靶却带偏移"
 * 这种记录在类型上就写不出来。
 */
export type AimShot = { hit: true; offsetPx: number } | { hit: false };

export interface AimSummary {
  hits: number;
  /** 点击次数。**脱靶的也算**,否则命中率的分母就没有意义了 */
  clicks: number;
  /** 命中数 ÷ 点击数。一次没点时为 `null`,不是 0 */
  accuracy: number | null;
  /** 命中数 ÷ 时长。时长由**计时器**给,不从时间戳反推 */
  hitsPerSecond: number | null;
  /** 平均偏离,**只统计命中**。一次没中时为 `null` */
  meanOffsetPx: number | null;
}

/**
 * 汇总一轮瞄准成绩。
 *
 * 三处刻意的选择:
 *
 * 1. **`hitsPerSecond` 的分母是传进来的 `durationMs`,由页面上的计时器给。**
 *    同 `computeCps`:打完最后一下就停手的话,那一段空闲在时间戳里根本不存在,
 *    从时间戳推出来的时长会让"十秒里疯狂点了两秒"平均成一个虚高的数。
 * 2. **`meanOffsetPx` 只统计命中。** 一个 300px 的脱靶会把均值整个带走,
 *    那个数既答不了"命中得紧不紧",也答不了"脱得有多远"——分给两个数各答一句。
 * 3. **没有加权总分。** 一个权重公式本身就是编出来的数。
 *
 * 注意这里**不含"漏掉"**:事实上的做法是**靶子不自己消失** —— 你不点它,它就
 * 一直在那儿。于是这一页只有两种结果(点中 / 点空),"没反应过来"永远不会混进
 * `clicks`。要做"漏掉"就得先有超时消失的靶子,那时它必须单独计数、不进 `clicks`,
 * 否则"没反应过来"和"瞄歪了"会混成同一个百分比。
 */
export function summarizeAim(shots: readonly AimShot[], durationMs: number): AimSummary {
  let hits = 0;
  let offsetSum = 0;

  for (const shot of shots) {
    if (!shot.hit) continue;
    hits++;
    offsetSum += shot.offsetPx;
  }

  const clicks = shots.length;

  return {
    hits,
    clicks,
    accuracy: clicks > 0 ? hits / clicks : null,
    hitsPerSecond:
      Number.isFinite(durationMs) && durationMs > 0 ? hits / (durationMs / 1000) : null,
    // 命中的偏离按构造一定是有限数(两个坐标相减),所以这里**不做兜底过滤**:
    // 真混进坏值就该让均值变成 NaN,由 format() 出破折号 —— 那比悄悄按
    // "命中的条数"去平均(把坏值稀释掉)诚实
    meanOffsetPx: hits > 0 ? offsetSum / hits : null,
  };
}

/**
 * 最好成绩的存储键。
 *
 * **必须是函数。** 这个字符串横跨"写入存储"和"读出显示"两处,手抄的话
 * 打错一个字母不会报任何错,只会让所有人的纪录静默地变成孤儿——和
 * `mini-cards.ts` 那类键是同一类失败。三档设置各记各的:难度换了目标直径,
 * 成绩就不可比。
 */
export function aimBestKey(
  mode: AimMode,
  difficulty: AimDifficulty,
  durationMs: number,
): string {
  return `mouse-test:aim-best:${mode}:${difficulty}:${durationMs}`;
}

// ---------- 帧节奏 ----------

/**
 * 一次采样的间隔超过这个数(毫秒)就不算"一帧"。
 *
 * 页面切到后台、主线程被一段长任务占住、窗口被拖动 —— 这些都会造出几百毫秒
 * 的间隔,它们**不是刷新率**,当帧间隔算进去会把中位数整个带偏。
 */
export const FRAME_GAP_MAX_MS = 100;

/**
 * 少于这么多个样本就不出数。
 *
 * 两三次的"中位数"什么也说明不了(和 `MIN_VALID_TRIALS` 同一条理由),
 * 而且采样刚开始时头几个间隔往往是异常的。宁可给破折号。
 */
export const FRAME_CADENCE_MIN_SAMPLES = 10;

export interface FrameCadence {
  /** 由中位帧间隔换算的刷新率(Hz,取整)。样本不够时 `null`。 */
  hz: number | null;
  /** 中位帧间隔(毫秒)。样本不够时 `null`。 */
  medianMs: number | null;
  /** 真正参与计算的样本数(已剔掉超长间隔)。 */
  samples: number;
}

/**
 * 从一串 rAF 帧间隔里读出**实测刷新率**。
 *
 * ## 这个数是什么,不是什么
 *
 * 它量的是**浏览器 `requestAnimationFrame` 的节奏**,不是显示器的物理刷新率。
 * 两者在正常情况下一致,但合成器掉帧、省电模式降频、浏览器在后台把 rAF 掐到
 * 1Hz 都会让它变小 —— 所以它是"你这台机器此刻跑得有多顺",不是面板的规格。
 * **反应页和刷新率目视测试都印这个数,两页必须印同一个。**
 *
 * ## 为什么取中位数而不是平均
 *
 * 平均会被少数几个长间隔(掉帧、GC 停顿)整个拖下去,而那些恰恰是
 * "采样期间出了状况"而不是"这台机器平时就慢"。中位数说的是**典型的一帧有多长**,
 * 正是这里要问的问题。
 *
 * ## 偶数个样本时取的是**上中位**
 *
 * `sorted[Math.floor(n / 2)]`,不是中间两个的平均。这和 `summarizeReaction`
 * 取中位数的方式一致 —— 同一个站点里两个"中位数"用两种口径,横向对比就会
 * 对不上,而这种差异在页面上完全看不出来。
 *
 * ## 为什么这个函数在这里,而不是在页面里
 *
 * 原来它长在 `reaction-test.astro` 的 `<script>` 里。刷新率目视测试要的是
 * **同一个量**,而两页印的数会被用户直接对比 —— 两份实现迟早对不上,而
 * 对不上的那天没有任何一处会报错。所以它连同"什么算一帧"的判据一起搬到这里,
 * 由单测钉住。
 */
export function summarizeFrameCadence(intervals: readonly number[]): FrameCadence {
  const usable = intervals.filter((gap) => gap > 0 && gap < FRAME_GAP_MAX_MS);
  if (usable.length < FRAME_CADENCE_MIN_SAMPLES) {
    return { hz: null, medianMs: null, samples: usable.length };
  }

  const sorted = [...usable].sort((a, b) => a - b);
  const medianMs = sorted[Math.floor(sorted.length / 2)];

  return {
    hz: medianMs > 0 ? Math.round(1000 / medianMs) : null,
    medianMs,
    samples: usable.length,
  };
}
