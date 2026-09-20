import { describe, expect, it } from 'vitest';
import {
  aimBestKey,
  analyzeDragEpisodes,
  analyzeDragEpisodesByButton,
  analyzeSegments,
  assessQuality,
  buildHistogram,
  classifyClickGap,
  classifyDpi,
  classifyPollingRate,
  compareAcceleration,
  computeCps,
  computeIntervals,
  computeJitter,
  computePeakRate,
  computePollingRate,
  computeRateWindows,
  countAnomalies,
  detectAngleSnap,
  detectGaps,
  detectTrailJumps,
  estimateDpi,
  isNearAxis,
  isSnapped,
  longestSegment,
  markScrollGlitches,
  measureDrift,
  MIN_VALID_TRIALS,
  normalizeWheelDelta,
  pathLength,
  percentile,
  positiveIntervals,
  rateByCount,
  RT_IMPLAUSIBLE_MS,
  segmentTimestamps,
  summarizeAim,
  summarizeClickGaps,
  summarizeKeyboard,
  summarizeReaction,
  summarizeScroll,
  strokeShape,
} from '../src/lib/analysis';
import type { AimShot, ReactionTrial } from '../src/lib/analysis';

/** 生成 n 个恒定间隔的时间戳。 */
function constantInterval(count: number, intervalMs: number): Float64Array {
  const t = new Float64Array(count);
  for (let i = 0; i < count; i++) t[i] = i * intervalMs;
  return t;
}

/**
 * 生成 `runs` 段连续运动,段间插入 `pauseMs` 的停顿。
 *
 * 停顿对应现实中"用户松手换方向"的时刻——那段时间鼠标一个报文都不发,
 * 缓冲区里只留下一个巨大的空档。
 */
function runsWithPauses(
  runs: number,
  perRun: number,
  intervalMs: number,
  pauseMs: number,
): Float64Array {
  const t = new Float64Array(runs * perRun);
  let clock = 0;
  let k = 0;
  for (let r = 0; r < runs; r++) {
    if (r > 0) clock += pauseMs;
    for (let i = 0; i < perRun; i++) {
      t[k++] = clock;
      clock += intervalMs;
    }
  }
  return t;
}

describe('computeIntervals', () => {
  it('还原出相邻采样的间隔', () => {
    const t = new Float64Array([0, 1, 3, 6]);
    expect(Array.from(computeIntervals(t))).toEqual([1, 2, 3]);
  });

  it('只在 n 范围内计算', () => {
    const t = new Float64Array([0, 1, 3, 6]);
    expect(Array.from(computeIntervals(t, 3))).toEqual([1, 2]);
  });

  it('样本不足两个时返回空数组', () => {
    expect(computeIntervals(new Float64Array([5])).length).toBe(0);
    expect(computeIntervals(new Float64Array(0)).length).toBe(0);
  });
});

describe('positiveIntervals', () => {
  it('剔除零间隔与负间隔', () => {
    const input = new Float64Array([1, 0, 2, -1, 3, 0]);
    expect(Array.from(positiveIntervals(input))).toEqual([1, 2, 3]);
  });

  it('全部有效时原样返回,不做多余拷贝', () => {
    const input = new Float64Array([1, 2, 3]);
    expect(positiveIntervals(input)).toBe(input);
  });
});

describe('computePollingRate', () => {
  it('1000Hz 的合成数据算出 1000Hz', () => {
    const stats = computePollingRate(computeIntervals(constantInterval(500, 1)));
    expect(stats).not.toBeNull();
    expect(stats!.medianHz).toBeCloseTo(1000, 6);
    expect(stats!.hz).toBeCloseTo(1000, 6);
  });

  it('125Hz 的合成数据算出 125Hz', () => {
    const stats = computePollingRate(computeIntervals(constantInterval(200, 8)));
    expect(stats!.medianHz).toBeCloseTo(125, 6);
  });

  it('8000Hz 的合成数据算出 8000Hz', () => {
    const stats = computePollingRate(computeIntervals(constantInterval(2000, 0.125)));
    expect(stats!.medianHz).toBeCloseTo(8000, 6);
  });

  it('存在离群点时中位数比平均值可靠', () => {
    // 1000 个正常间隔 + 1 个 100ms 的卡顿
    const intervals = new Float64Array(1001);
    intervals.fill(1);
    intervals[1000] = 100;

    const stats = computePollingRate(intervals)!;
    // 平均值被离群点拖低到约 910Hz
    expect(stats.hz).toBeLessThan(950);
    // 中位数不受影响,仍准确指向 1000Hz
    expect(stats.medianHz).toBeCloseTo(1000, 6);
  });

  it('有效间隔不足时返回 null,而不是编造一个数字', () => {
    expect(computePollingRate(new Float64Array([]))).toBeNull();
    expect(computePollingRate(new Float64Array([1]))).toBeNull();
    expect(computePollingRate(new Float64Array([0, 0, 0]))).toBeNull();
  });
});

describe('computeJitter', () => {
  it('恒定间隔的抖动为零', () => {
    const jitter = computeJitter(new Float64Array([1, 1, 1, 1]))!;
    expect(jitter.stddevMs).toBeCloseTo(0, 9);
    expect(jitter.cv).toBeCloseTo(0, 9);
  });

  it('标准差与变异系数符合手算结果', () => {
    // [1,2,1,2,1]:均值 1.4,样本标准差 sqrt(1.2/4) ≈ 0.5477
    const jitter = computeJitter(new Float64Array([1, 2, 1, 2, 1]))!;
    expect(jitter.stddevMs).toBeCloseTo(Math.sqrt(0.3), 9);
    expect(jitter.cv).toBeCloseTo(Math.sqrt(0.3) / 1.4, 9);
  });

  it('同样的绝对抖动在高档位上更严重——这正是要看变异系数的原因', () => {
    // 两组的绝对标准差都是 0.2ms 量级,但基准间隔差 8 倍
    const fast = computeJitter(new Float64Array([1, 1.2, 1, 1.2]))!;
    const slow = computeJitter(new Float64Array([8, 8.2, 8, 8.2]))!;
    expect(fast.stddevMs).toBeCloseTo(slow.stddevMs, 6);
    expect(fast.cv).toBeGreaterThan(slow.cv * 5);
  });

  it('数据不足时返回 null', () => {
    expect(computeJitter(new Float64Array([1]))).toBeNull();
  });
});

describe('detectGaps', () => {
  it('抓出超过阈值的空档', () => {
    const intervals = new Float64Array([1, 1, 1, 10, 1, 1]);
    const gaps = detectGaps(intervals, 1, 2);
    expect(gaps.count).toBe(1);
    expect(gaps.maxGapMs).toBe(10);
    // 扣掉本应占用的那一个正常间隔
    expect(gaps.totalLostMs).toBeCloseTo(9, 9);
  });

  it('正常波动不会被误报成丢帧', () => {
    const intervals = new Float64Array([1.1, 0.9, 1.05, 0.95, 1.0]);
    expect(detectGaps(intervals, 1, 2).count).toBe(0);
  });

  it('期望间隔非法时返回零值而不是抛错或 NaN', () => {
    const gaps = detectGaps(new Float64Array([1, 2, 3]), 0);
    expect(gaps).toEqual({ count: 0, maxGapMs: 0, totalLostMs: 0 });
  });
});

describe('classifyPollingRate', () => {
  it('精确档位直接命中', () => {
    expect(classifyPollingRate(125)).toBe(125);
    expect(classifyPollingRate(1000)).toBe(1000);
    expect(classifyPollingRate(8000)).toBe(8000);
  });

  it('容差范围内的实测值归到标称档位', () => {
    expect(classifyPollingRate(950)).toBe(1000);
    expect(classifyPollingRate(1010)).toBe(1000);
    expect(classifyPollingRate(520)).toBe(500);
  });

  it('落在档位之间时返回 null,不硬凑', () => {
    // 730 距 500 有 230、距 1000 有 270,两边都远超容差
    expect(classifyPollingRate(730)).toBeNull();
  });

  it('明显偏离标称值的实测结果不会被硬塞进档位', () => {
    // 880 距 1000 有 12%,已经超出计数法 1% 量级的误差范围——
    // 那说明这只鼠标此刻确实不在 1000Hz 档上,不该替它圆场
    expect(classifyPollingRate(880)).toBeNull();
    expect(classifyPollingRate(850)).toBeNull();
    // 930 距 1000 只有 7%,在测量误差可以解释的范围内
    expect(classifyPollingRate(930)).toBe(1000);
  });

  it('容差可调,便于按需放宽或收紧', () => {
    expect(classifyPollingRate(880, 0.2)).toBe(1000);
  });

  it('非法输入返回 null', () => {
    expect(classifyPollingRate(0)).toBeNull();
    expect(classifyPollingRate(-100)).toBeNull();
    expect(classifyPollingRate(Number.NaN)).toBeNull();
  });
});

describe('buildHistogram', () => {
  it('所有样本都被计入某个区间', () => {
    const values = new Float64Array(1000);
    for (let i = 0; i < values.length; i++) values[i] = 1 + (i % 10) * 0.01;

    const hist = buildHistogram(values, 20)!;
    const total = hist.bins.reduce((a, b) => a + b, 0);
    expect(total).toBe(1000);
  });

  it('极端离群点不会让主分布挤在一个柱子里', () => {
    // 主分布在 0.95–1.05 之间铺开,外加一个 500ms 的离群点
    const values = new Float64Array(1001);
    for (let i = 0; i < 1000; i++) values[i] = 0.95 + (i % 20) * 0.005;
    values[1000] = 500;

    const hist = buildHistogram(values, 20)!;
    // 正常值应该铺开在多个柱子中,而不是因为范围被拉到 500 而全挤进第一个
    const nonEmpty = Array.from(hist.bins).filter((c) => c > 0).length;
    expect(nonEmpty).toBeGreaterThan(5);
    // 范围由 1%–99% 分位决定,所以不会被离群点拉到 500
    expect(hist.max).toBeLessThan(10);
  });

  it('主分布完全重合但存在离群点时不掩盖离群点', () => {
    // 这个场景 1%–99% 分位区间退化成单点,若不回退到真实 min/max,
    // 500 会和其余 1000 个样本挤进同一个柱子,彻底看不见。
    const values = new Float64Array(1001);
    values.fill(1);
    values[1000] = 500;

    const hist = buildHistogram(values, 20)!;
    expect(hist.bins.length).toBe(20);
    // 1000 个正常样本落在第一个柱子,离群点单独落在最后一个柱子
    expect(hist.bins[0]).toBe(1000);
    expect(hist.bins[19]).toBe(1);
  });

  it('所有值相同时返回退化的单柱直方图', () => {
    const hist = buildHistogram(new Float64Array([2, 2, 2, 2]), 10)!;
    expect(hist.bins.length).toBe(1);
    expect(hist.bins[0]).toBe(4);
  });

  it('无有效数据时返回 null', () => {
    expect(buildHistogram(new Float64Array([]), 10)).toBeNull();
    expect(buildHistogram(new Float64Array([0, 0]), 10)).toBeNull();
  });
});

describe('segmentTimestamps', () => {
  it('连续运动归为一段', () => {
    const t = constantInterval(300, 1);
    expect(segmentTimestamps(t, t.length)).toEqual([{ start: 0, end: 300 }]);
  });

  it('在停顿处切开', () => {
    const t = runsWithPauses(3, 300, 1, 500);
    const segments = segmentTimestamps(t, t.length);

    expect(segments.length).toBe(3);
    for (const seg of segments) expect(seg.end - seg.start).toBe(300);
  });

  it('比最短段还短的碎段被丢弃', () => {
    // 300 条连续,停顿,然后只有 20 条——20 个样本估不出分位数,不该参与统计
    const head = runsWithPauses(1, 300, 1, 0);
    const t = new Float64Array(320);
    t.set(head);

    let clock = head[head.length - 1] + 500;
    for (let i = 300; i < 320; i++) {
      t[i] = clock;
      clock += 1;
    }

    const segments = segmentTimestamps(t, t.length);
    expect(segments.length).toBe(1);
    expect(segments[0].end - segments[0].start).toBe(300);
  });

  it('时间戳出现 NaN 时保守切开,而不是把它当成正常间隔混过去', () => {
    // 两半各 299ms,都在最短时长之上,所以切开后都该被留下
    const t = constantInterval(600, 1);
    t[300] = Number.NaN;

    const segments = segmentTimestamps(t, t.length);
    expect(segments.length).toBe(2);
    expect(segments[0]).toEqual({ start: 0, end: 300 });
    expect(segments[1]).toEqual({ start: 301, end: 600 });
  });

  it('样本数够了但时间跨度太短的段不要', () => {
    // 8000Hz 下 200 个采样只有 25ms,样本数过关、跨度不过关。
    // 这么短的跨度配上计时量化会给出一个抖动极大却同样确定的读数。
    const t = constantInterval(200, 0.125);
    expect(segmentTimestamps(t, t.length)).toEqual([]);
  });

  it('时长下限可以放宽,让短促但合法的测量也能出数', () => {
    const t = constantInterval(200, 0.125);
    const segments = segmentTimestamps(t, t.length, { minDurationMs: 20 });
    expect(segments.length).toBe(1);
  });

  it('样本总量不足时一段都不给', () => {
    expect(segmentTimestamps(constantInterval(50, 1), 50)).toEqual([]);
  });
});

describe('longestSegment', () => {
  it('挑出样本数最多的那一段', () => {
    const segments = [
      { start: 0, end: 100 },
      { start: 200, end: 700 },
      { start: 800, end: 1000 },
    ];
    expect(longestSegment(segments)).toEqual({ start: 200, end: 700 });
  });

  it('空列表返回 null', () => {
    expect(longestSegment([])).toBeNull();
  });
});

describe('rateByCount', () => {
  it('恒定间隔的速率精确无误', () => {
    const t = constantInterval(501, 1);
    const rate = rateByCount(t, { start: 0, end: 501 })!;

    // 501 个样本跨越 500ms,即每毫秒一个
    expect(rate.durationMs).toBeCloseTo(500, 9);
    expect(rate.hz).toBeCloseTo(1000, 6);
    expect(rate.samples).toBe(501);
  });

  it('只在给定区间内计算', () => {
    const t = constantInterval(100, 2);
    const rate = rateByCount(t, { start: 10, end: 20 })!;
    expect(rate.samples).toBe(10);
    expect(rate.hz).toBeCloseTo(500, 6);
  });

  it('样本不足或时长为零时返回 null', () => {
    expect(rateByCount(constantInterval(10, 1), { start: 0, end: 1 })).toBeNull();
    expect(rateByCount(constantInterval(10, 0), { start: 0, end: 10 })).toBeNull();
  });
});

describe('analyzeSegments', () => {
  it('中途停顿不会被算成"上报变慢"', () => {
    // 三段各 300 条、间隔 1ms 的连续运动,中间各停 500ms。
    const t = runsWithPauses(3, 300, 1, 500);

    const analysis = analyzeSegments(t, t.length)!;
    expect(analysis.segmentCount).toBe(3);
    // 只统计最长的那一段:299 个间隔跨越 299ms
    expect(analysis.hz).toBeCloseTo(1000, 6);

    // 对照组:同一份数据不切段直接平均。两个 500ms 的空档混进 897 个 1ms 的
    // 间隔里,均值被拖到 2.1ms、读数掉到 470Hz 上下——而它跌多少完全取决于
    // 用户什么时候松手。这正是"每次测都不一样"的成因。
    const naive = computePollingRate(computeIntervals(t))!;
    expect(naive.hz).toBeLessThan(600);
  });

  it('没有任何一段连续运动够长时返回 null,而不是编一个数字', () => {
    // 每次都只动 10 个采样就停,一段都凑不满
    const t = runsWithPauses(20, 10, 1, 200);
    expect(analyzeSegments(t, t.length)).toBeNull();
  });

  it('报告被切掉了几段,让界面能提示用户中途停顿过', () => {
    const t = runsWithPauses(4, 200, 1, 300);
    expect(analyzeSegments(t, t.length)!.segmentCount).toBe(4);
  });

  it('把选中的那一段一并交出来,调用方不必再切一次段', () => {
    // 两段:前 200 个采样、中间停 300ms、后 400 个。选中的应是后一段,
    // 而且它的下标是相对整个输入数组的——调用方要拿它去索引 x/y 和 flags。
    const t = new Float64Array(600);
    for (let i = 0; i < 200; i++) t[i] = i;
    for (let i = 0; i < 400; i++) t[200 + i] = 200 + 300 + i;

    const analysis = analyzeSegments(t, t.length)!;

    expect(analysis.segmentCount).toBe(2);
    expect(analysis.segment.start).toBe(200);
    expect(analysis.segment.end).toBe(600);
    expect(analysis.samples).toBe(400);
  });
});

describe('percentile', () => {
  const sorted = new Float64Array([1, 2, 3, 4, 5]);

  it('中位数与边界值', () => {
    expect(percentile(sorted, 0.5)).toBe(3);
    expect(percentile(sorted, 0)).toBe(1);
    expect(percentile(sorted, 1)).toBe(5);
  });

  it('两个样本之间做线性插值', () => {
    expect(percentile(sorted, 0.25)).toBe(2);
    expect(percentile(sorted, 0.125)).toBeCloseTo(1.5, 9);
  });

  it('空数组返回 NaN', () => {
    expect(percentile(new Float64Array(0), 0.5)).toBeNaN();
  });
});

describe('countAnomalies', () => {
  it('分别统计重复时间戳与倒序时间戳', () => {
    // 位标记:1 = 重复,2 = 倒序,3 = 两者都有过
    const flags = new Uint8Array([0, 1, 0, 2, 3, 1, 0]);
    const result = countAnomalies(flags);
    expect(result.duplicate).toBe(3); // 索引 1、4、5
    expect(result.outOfOrder).toBe(2); // 索引 3、4
  });

  it('只统计窗口内的部分', () => {
    const flags = new Uint8Array([1, 1, 0, 1, 1]);
    const result = countAnomalies(flags, 2, 4);
    expect(result.duplicate).toBe(1);
    expect(result.outOfOrder).toBe(0);
  });

  it('越界窗口被夹回有效范围,不会读越界内存', () => {
    const flags = new Uint8Array([1, 1, 1]);
    const result = countAnomalies(flags, -5, 99);
    expect(result.duplicate).toBe(3);
  });

  it('空窗口得到全零', () => {
    const result = countAnomalies(new Uint8Array([1, 1]), 1, 1);
    expect(result.duplicate).toBe(0);
    expect(result.outOfOrder).toBe(0);
  });
});

describe('assessQuality', () => {
  const clean = {
    durationMs: 3000,
    acceptedSamples: 3000,
    anomalies: { duplicate: 0, outOfOrder: 0 },
  };

  it('干净数据判为良好,并且不列任何原因', () => {
    const quality = assessQuality(clean);
    expect(quality.level).toBe('good');
    expect(quality.issues).toHaveLength(0);
  });

  it('计时精度分辨不出周期时判为不可信——这是浏览器端的头号误差源', () => {
    // 8000Hz(周期 125µs)遇上 100µs 量化:报文成片地撞进同一个台阶
    const quality = assessQuality({
      ...clean,
      acceptedSamples: 2000,
      anomalies: { duplicate: 6000, outOfOrder: 0 },
    });
    expect(quality.level).toBe('poor');
    expect(quality.duplicateRatio).toBeCloseTo(0.75, 9);
    expect(quality.issues[0].message).toContain('计时精度');
  });

  it('重复比例中等时只降到"一般",不夸大成不可信', () => {
    const quality = assessQuality({
      ...clean,
      acceptedSamples: 4000,
      anomalies: { duplicate: 1000, outOfOrder: 0 },
    });
    expect(quality.level).toBe('fair');
  });

  it('分母含被丢弃的报文,否则比例会被低估', () => {
    const quality = assessQuality({
      ...clean,
      acceptedSamples: 1000,
      anomalies: { duplicate: 1000, outOfOrder: 0 },
    });
    // 2000 个报文中 1000 个重复 = 50%
    expect(quality.duplicateRatio).toBeCloseTo(0.5, 9);
  });

  it('测量时长不足时降级', () => {
    expect(assessQuality({ ...clean, durationMs: 300 }).level).toBe('poor');
    expect(assessQuality({ ...clean, durationMs: 800 }).level).toBe('fair');
  });

  it('倒序时间戳只要出现就降级——正常硬件不该有', () => {
    const quality = assessQuality({
      ...clean,
      anomalies: { duplicate: 0, outOfOrder: 1 },
    });
    expect(quality.level).toBe('fair');
  });

  it('多项问题并存时取最严重的那一档', () => {
    const quality = assessQuality({
      ...clean,
      durationMs: 200,
      anomalies: { duplicate: 900, outOfOrder: 100 },
    });
    expect(quality.level).toBe('poor');
    expect(quality.issues.length).toBe(3);
  });
});

describe('computeRateWindows', () => {
  it('按 windowMs 切出互不重叠的窗口,每个窗口独立算计数法速率', () => {
    // 2 秒的 1000Hz:每毫秒一个采样
    const t = constantInterval(2001, 1);
    const windows = computeRateWindows(t, { start: 0, end: t.length }, { windowMs: 200 });

    expect(windows.length).toBe(10);
    for (const w of windows) {
      expect(w.hz).toBeCloseTo(1000, 6);
      expect(w.full).toBe(true);
    }
    // 横轴偏移应当是一串 0 / 200 / 400 …
    expect(windows.map((w) => w.offsetMs)).toEqual([0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800]);
  });

  it('末尾的零头被标成不完整窗口', () => {
    // 2.1 秒 → 10 个整窗 + 一个只剩 100ms 的零头
    const t = constantInterval(2101, 1);
    const windows = computeRateWindows(t, { start: 0, end: t.length }, { windowMs: 200 });

    expect(windows.length).toBe(11);
    expect(windows[10].full).toBe(false);
    // 零头少了一半样本,但计数法本身仍然无偏
    expect(windows[10].hz).toBeCloseTo(1000, 0);
  });

  it('样本数不够的窗口被丢掉,而不是给出一个离谱的数字', () => {
    // 125Hz 下 200ms 只有 25 个采样,把门槛提到 30 就应当一个窗口都不剩
    const t = constantInterval(500, 8);
    expect(
      computeRateWindows(t, { start: 0, end: t.length }, { windowMs: 200, minSamples: 30 }),
    ).toEqual([]);
  });

  it('只统计给定段落,段外的采样不参与', () => {
    const t = constantInterval(1000, 1);
    const windows = computeRateWindows(t, { start: 100, end: 500 }, { windowMs: 200 });

    expect(windows.length).toBe(2);
    expect(windows[0].samples).toBeGreaterThanOrEqual(199);
    expect(windows[0].samples).toBeLessThanOrEqual(200);
  });

  it('段太短时返回空数组而不是抛错', () => {
    const t = constantInterval(10, 1);
    expect(computeRateWindows(t, { start: 0, end: 0 })).toEqual([]);
  });
});

describe('computePeakRate', () => {
  it('取最高的那个窗口,并报告参与比较的窗口数', () => {
    const windows = [
      { hz: 990, samples: 200, offsetMs: 0, full: true },
      { hz: 1030, samples: 200, offsetMs: 200, full: true },
      { hz: 1005, samples: 200, offsetMs: 400, full: true },
    ];
    expect(computePeakRate(windows)).toEqual({ hz: 1030, samples: 200, windows: 3 });
  });

  it('没有窗口时返回 null,不编造一个峰值', () => {
    expect(computePeakRate([])).toBeNull();
  });
});

describe('pathLength', () => {
  it('累加相邻落点的直线距离', () => {
    // (0,0) → (3,4) → (6,8):两段 3-4-5 直角三角形,共 10 像素。
    // 注意不能拿"起点到终点的直线距离"当路程——那会少算掉折返。
    const x = new Float32Array([0, 3, 6]);
    const y = new Float32Array([0, 4, 8]);
    expect(pathLength(x, y, { start: 0, end: 3 })).toBeCloseTo(10, 6);
  });

  it('只累计给定段落内的路程', () => {
    const x = new Float32Array([0, 100, 100, 101]);
    const y = new Float32Array([0, 0, 0, 0]);
    expect(pathLength(x, y, { start: 1, end: 4 })).toBeCloseTo(1, 6);
  });

  it('单点段的长度为 0,而不是把起点算进去', () => {
    expect(pathLength(new Float32Array([5]), new Float32Array([5]), { start: 0, end: 1 })).toBe(0);
  });
});

describe('classifyClickGap / summarizeClickGaps', () => {
  it('50ms 是触点抖动与"你确实双击了"的分界', () => {
    expect(classifyClickGap(49.9)).toBe('chatter');
    expect(classifyClickGap(50)).toBe('double');
    expect(classifyClickGap(500)).toBe('double');
    expect(classifyClickGap(500.1)).toBe('separate');
  });

  it('负值和 NaN 归到"独立点击",不参与故障判定', () => {
    expect(classifyClickGap(-1)).toBe('separate');
    expect(classifyClickGap(Number.NaN)).toBe('separate');
  });

  it('把用户的正常双击和微动连击分开统计', () => {
    // 12ms 一次连击(故障)、200ms 一次双击(正常)、3 秒一次独立点击(正常)
    const stats = summarizeClickGaps([12, 200, 3000, 8]);

    expect(stats.total).toBe(4);
    expect(stats.chatter).toBe(2);
    expect(stats.double).toBe(1);
    expect(stats.separate).toBe(1);
    expect(stats.minMs).toBe(8);
    // 最严重的一次连击间隔,微动老化越厉害这个数越小
    expect(stats.worstChatterMs).toBe(8);
  });

  it('没有间隔时全部给 null,不编造数字', () => {
    const stats = summarizeClickGaps([]);
    expect(stats.total).toBe(0);
    expect(stats.minMs).toBeNull();
    expect(stats.medianMs).toBeNull();
    expect(stats.worstChatterMs).toBeNull();
  });

  it('全部正常时连击数为 0', () => {
    expect(summarizeClickGaps([300, 400, 250]).chatter).toBe(0);
  });
});

describe('computeCps', () => {
  it('均匀每秒 10 次:平均与峰值都是 10', () => {
    const times = Array.from({ length: 10 }, (_, i) => i * 100);
    const stats = computeCps(times);

    expect(stats?.clicks).toBe(10);
    expect(stats?.average).toBeCloseTo(10, 6);
    expect(stats?.peak).toBe(10);
  });

  it('峰值用滑窗:"任意 1 秒内最多点了几下"', () => {
    // 100 次均匀分布在 9.9 秒里,任意 1 秒窗口最多装得下 10 次。
    // 第 11 次与第 1 次相隔正好 1000ms,而窗口是左闭右开的,装不进去。
    const times = Array.from({ length: 100 }, (_, i) => i * 100);
    expect(computeCps(times)?.peak).toBe(10);
  });

  it('前半秒爆发 20 次、后面不动:峰值必须是 20,不能被平均掉', () => {
    const times = Array.from({ length: 20 }, (_, i) => i * 25);
    // 5 秒的测试里前 0.5 秒就打完了。**时长必须显式传进来**:不点就没有事件,
    // 后面那 4.5 秒在时间戳里根本不存在,只靠数据是"看"不出来的。
    const stats = computeCps(times, { durationMs: 5000 });

    expect(stats?.peak).toBe(20);
    // 平均被后面的空档拉到 4,和峰值差五倍 —— 页面必须同时显示这两个数
    expect(stats?.average).toBeCloseTo(4, 6);
  });

  it('不传时长时按最后一次点击截断,不会凭空拉低成绩', () => {
    const times = Array.from({ length: 20 }, (_, i) => i * 25);
    expect(computeCps(times)?.average).toBeCloseTo(20, 6);
  });

  it('单次点击也算数,不会被除以 0 时长算成无穷大', () => {
    const stats = computeCps([0]);
    expect(stats?.peak).toBe(1);
    expect(stats?.average).toBeCloseTo(1, 6);
  });

  it('乱序输入会被排序,不影响结果', () => {
    expect(computeCps([300, 100, 200])?.peak).toBe(3);
  });

  it('一次点击都没有时返回 null,页面显示"还没开始"', () => {
    expect(computeCps([])).toBeNull();
  });
});

describe('normalizeWheelDelta', () => {
  it('像素模式按 100 像素一格换算', () => {
    expect(normalizeWheelDelta(100, 0)).toBe(1);
    expect(normalizeWheelDelta(-100, 0)).toBe(-1);
  });

  it('行模式按 3 行一格换算(Firefox 的常见取值)', () => {
    expect(normalizeWheelDelta(3, 1)).toBe(1);
  });

  it('页模式一格就是一页', () => {
    expect(normalizeWheelDelta(1, 2)).toBe(1);
  });
});

describe('summarizeScroll', () => {
  const notch = (notches: number) => ({ notches, raw: notches * 100, deltaMode: 0 });

  it('一直朝一个方向滚:没有反转也没有毛刺', () => {
    const stats = summarizeScroll([1, 1, 1, 1, 1].map(notch));

    expect(stats.down).toBe(5);
    expect(stats.up).toBe(0);
    expect(stats.netNotches).toBe(5);
    expect(stats.reversals).toBe(0);
    expect(stats.glitches).toBe(0);
  });

  it('持续下滚时插进一个反向事件 —— 这是编码器跳格的典型波形', () => {
    const stats = summarizeScroll([1, 1, 1, -1, 1, 1, 1].map(notch));

    expect(stats.glitches).toBe(1);
    // 反转本身记了两次(进和出),但它不是故障指标,页面要用毛刺那一项
    expect(stats.reversals).toBe(2);
  });

  it('用户自己换方向不算毛刺', () => {
    const stats = summarizeScroll([1, 1, 1, -1, -1, -1].map(notch));

    expect(stats.glitches).toBe(0);
    expect(stats.reversals).toBe(1);
  });

  it('零位移事件被忽略,不制造假反转', () => {
    const stats = summarizeScroll([1, 0, 1].map(notch));
    expect(stats.events).toBe(2);
    expect(stats.reversals).toBe(0);
  });

  it('报出最常见的那一格原始 deltaY,好让用户对上自己系统的设置', () => {
    const stats = summarizeScroll([
      { notches: 1, raw: 100, deltaMode: 0 },
      { notches: 1, raw: 100, deltaMode: 0 },
      { notches: 1, raw: 120, deltaMode: 0 },
    ]);
    expect(stats.typicalDelta).toBe(100);
  });
});

describe('markScrollGlitches', () => {
  /*
   * 首页合并卡那条方向带靠它决定**哪一格标红**。它和 `summarizeScroll` 的
   * `glitches` 是同一条判据的两个出口,所以这两个 describe 的用例形状故意
   * 对得上 —— 哪天一边改了另一边没改,这两组就会互相咬住。
   */
  it('一直朝一个方向滚:一格都不标', () => {
    expect(markScrollGlitches(['down', 'down', 'down', 'down'])).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it('持续下滚时插进一个反向 —— 只有那一格标红', () => {
    expect(markScrollGlitches(['down', 'down', 'up', 'down', 'down'])).toEqual([
      false,
      false,
      true,
      false,
      false,
    ]);
  });

  it('用户自己换方向不算毛刺 —— 换过去就不再回来', () => {
    expect(markScrollGlitches(['down', 'down', 'up', 'up', 'up'])).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('首尾两格不参与判断 —— 最新那一格要等下一次滚动才判得出来', () => {
    // 末尾那个 up 单看像毛刺,但它右边还没有事件可比,所以先不标
    expect(markScrollGlitches(['down', 'down', 'up'])).toEqual([false, false, false]);
  });

  it('长度 0 和 1 都安全', () => {
    expect(markScrollGlitches([])).toEqual([]);
    expect(markScrollGlitches(['up'])).toEqual([false]);
  });
});

describe('detectTrailJumps', () => {
  it('匀速小步里的一个孤立尖峰被认出来', () => {
    const x = new Float32Array([0, 1, 2, 3, 50]);
    const y = new Float32Array(5);
    const stats = detectTrailJumps(x, y, { start: 0, end: 5 });

    expect(stats?.steps).toBe(4);
    expect(stats?.jumps).toBe(1);
    expect(stats?.maxStep).toBeCloseTo(47, 6);
  });

  it('整体均匀移动时一次都不报 —— 手甩快了不该被当成丢帧', () => {
    const x = new Float32Array(Array.from({ length: 11 }, (_, i) => i * 10));
    const y = new Float32Array(11);
    expect(detectTrailJumps(x, y, { start: 0, end: 11 })?.jumps).toBe(0);
  });

  it('有绝对下限兜底:慢慢移动时的手抖不会被算成丢帧', () => {
    // 中位间距 0.5 像素,五倍也才 2.5 像素,全部低于 20 像素的下限
    const x = new Float32Array([0, 0.5, 1, 1.5, 2, 4]);
    const y = new Float32Array(6);
    expect(detectTrailJumps(x, y, { start: 0, end: 6 })?.jumps).toBe(0);
  });

  it('样本太少时返回 null,不给一个没有依据的结论', () => {
    const two = new Float32Array(2);
    expect(detectTrailJumps(two, two, { start: 0, end: 2 })).toBeNull();
  });

  describe('孤立尖峰 —— 把"丢帧"和"手甩快了"分开', () => {
    it('均匀小步中间插一个大间距,算一个孤立尖峰', () => {
      // 步长 [1, 1, 47, 1, 1]。中位数 1,门槛 20,只有那一下超线
      const x = new Float32Array([0, 1, 2, 49, 50, 51]);
      const y = new Float32Array(6);
      const stats = detectTrailJumps(x, y, { start: 0, end: 6 });

      expect(stats?.jumps).toBe(1);
      expect(stats?.isolated).toBe(1);
    });

    it('连着几步一起变大是手甩快了,不算孤立尖峰', () => {
      // 步长 [1, 1, 50, 50, 50, 1, 1]:三下超线,但它们是连着的
      const x = new Float32Array([0, 1, 2, 52, 102, 152, 153, 154]);
      const y = new Float32Array(8);
      const stats = detectTrailJumps(x, y, { start: 0, end: 8 });

      expect(stats?.jumps).toBe(3);
      expect(stats?.isolated).toBe(0);
    });

    it('两下超线但中间夹着一下正常步长,两下各算各的', () => {
      // 步长 [1, 50, 1, 50, 1]
      const x = new Float32Array([0, 1, 51, 52, 102, 103]);
      const y = new Float32Array(6);
      const stats = detectTrailJumps(x, y, { start: 0, end: 6 });

      expect(stats?.jumps).toBe(2);
      expect(stats?.isolated).toBe(2);
    });

    it('首尾两步不算孤立 —— 只有一侧有邻居,没有判断依据', () => {
      // 步长 [1, 1, 1, 47]:那一下在末尾,右边没有邻居可比
      const x = new Float32Array([0, 1, 2, 3, 50]);
      const y = new Float32Array(5);
      const stats = detectTrailJumps(x, y, { start: 0, end: 5 });

      expect(stats?.jumps).toBe(1);
      expect(stats?.isolated).toBe(0);
    });
  });
});

describe('measureDrift', () => {
  it('完全静止:没有任何采样位移', () => {
    const x = new Float32Array([100, 100, 100]);
    const y = new Float32Array([50, 50, 50]);
    const stats = measureDrift(x, y, { start: 0, end: 3 });

    expect(stats?.samples).toBe(3);
    expect(stats?.spanPx).toBe(0);
    expect(stats?.pathPx).toBe(0);
  });

  it('抖动幅度用包围盒对角线量,往返抖动不会互相抵消', () => {
    const x = new Float32Array([0, 3, 0, 3]);
    const y = new Float32Array([0, 4, 0, 4]);
    const stats = measureDrift(x, y, { start: 0, end: 4 });

    // 包围盒是 3×4,对角线 5
    expect(stats?.spanPx).toBeCloseTo(5, 6);
    // 路程是逐段累加:(0,0)→(3,4)→(0,0)→(3,4),三段 3-4-5,共 15。
    // 这正是它和 spanPx 的区别:来回摆动不会让包围盒变大,却会让路程累加,
    // 所以判断"有没有漂移"要用路程,判断"抖得厉害不厉害"才看包围盒。
    expect(stats?.pathPx).toBeCloseTo(15, 6);
  });
});

describe('analyzeDragEpisodes', () => {
  // buttonMask 默认第 0 位(左键):这些用例都不关心是哪个键
  const down = (t: number, x = 0, y = 0, buttonMask = 1) => ({ t, x, y, kind: 'down' as const, buttonMask });
  const up = (t: number, x = 0, y = 0, buttonMask = 1) => ({ t, x, y, kind: 'up' as const, buttonMask });
  const move = (t: number, x = 0, y = 0, buttonMask = 1) => ({ t, x, y, kind: 'move' as const, buttonMask });

  it('一次干净的按住:一段,零瞬断', () => {
    const episodes = analyzeDragEpisodes([down(0, 0, 0), move(10, 5, 0), up(20, 10, 0)]);

    expect(episodes).toHaveLength(1);
    expect(episodes[0].drops).toBe(0);
    expect(episodes[0].durationMs).toBe(20);
    expect(episodes[0].distancePx).toBeCloseTo(10, 6);
    expect(episodes[0].open).toBe(false);
  });

  it('按住期间的移动不被当成新的一次按下', () => {
    // 这条是本函数最容易写错的地方:把"还按着"当成"刚按下",一次拖拽会被
    // 切成几十段,每一段都只有一两个点
    const episodes = analyzeDragEpisodes([
      down(0),
      move(5),
      move(10),
      move(15),
      move(20),
      move(25),
      up(30),
    ]);

    expect(episodes).toHaveLength(1);
    expect(episodes[0].samples).toBe(7);
    expect(episodes[0].durationMs).toBe(30);
  });

  it('10ms 后原地重按:算同一次按住的瞬断,而不是两次拖拽', () => {
    const episodes = analyzeDragEpisodes([
      down(0, 0, 0),
      move(5, 1, 0),
      up(10, 2, 0),
      down(20, 2.5, 0),
      move(25, 3, 0),
      up(30, 4, 0),
    ]);

    expect(episodes).toHaveLength(1);
    expect(episodes[0].drops).toBe(1);
    // 合并之后时长是从最开始按下列最后松开,中间那 10ms 不该被吃掉
    expect(episodes[0].durationMs).toBe(30);
    expect(episodes[0].distancePx).toBeCloseTo(4, 6);
  });

  it('隔了 100ms 才重按:那是用户自己松手了,算两段', () => {
    const episodes = analyzeDragEpisodes([down(0), up(10), down(110), up(120)]);
    expect(episodes).toHaveLength(2);
    expect(episodes[0].drops).toBe(0);
    expect(episodes[1].drops).toBe(0);
  });

  it('原地重按但位置挪开了一大截:不算瞬断,鼠标被手带走了', () => {
    const episodes = analyzeDragEpisodes([
      down(0, 0, 0),
      up(10, 0, 0),
      down(15, 50, 0),
      up(25, 50, 0),
    ]);

    expect(episodes).toHaveLength(2);
    expect(episodes[0].drops).toBe(0);
  });

  it('到头来还按着:标成 open,时长算到最后一个已知点', () => {
    const episodes = analyzeDragEpisodes([down(0, 0, 0), move(40, 4, 0)]);

    expect(episodes).toHaveLength(1);
    expect(episodes[0].open).toBe(true);
    expect(episodes[0].durationMs).toBe(40);
  });

  it('没收到 up 就又来了 down:前一段如实收尾,不把两段缝在一起', () => {
    // 窗口失焦时收不到 pointerup,回来再按下就会长这样。缝在一起会把
    // 中间那段空档算进按住时长,凭空造出一个"你按了 5 秒"的结论。
    const episodes = analyzeDragEpisodes([down(0), move(10, 1, 0), down(5000, 9, 9), up(5010, 9, 9)]);

    expect(episodes).toHaveLength(2);
    expect(episodes[0].open).toBe(true);
    expect(episodes[0].durationMs).toBe(10);
    expect(episodes[1].open).toBe(false);
  });

  it('按下之前来的移动事件不属于任何一次拖拽', () => {
    const episodes = analyzeDragEpisodes([move(0, 9, 9), down(10), up(20)]);

    expect(episodes).toHaveLength(1);
    expect(episodes[0].startMs).toBe(10);
  });

  it('瞬断之后还按着不松:那一段仍然是 open,不能算成已结束', () => {
    // 这是本页最主要的用法:按住不动等故障。合并之后链条末端没有 up,
    // 说明用户还按着。按锚点判断会报成 false,于是统计面板把它算进
    // "拖拽次数",而实时秒数的显示条件正是 open —— 恰好在用户等故障的
    // 那一刻停住不动。
    const episodes = analyzeDragEpisodes([down(0), up(10), down(20), move(30)]);

    expect(episodes).toHaveLength(1);
    expect(episodes[0].drops).toBe(1);
    expect(episodes[0].open).toBe(true);
    expect(episodes[0].durationMs).toBe(30);
  });

  it('瞬断之后最后松开了:这一段才算真的结束', () => {
    const episodes = analyzeDragEpisodes([down(0), up(10), down(20), move(25), up(30)]);

    expect(episodes).toHaveLength(1);
    expect(episodes[0].drops).toBe(1);
    expect(episodes[0].open).toBe(false);
    expect(episodes[0].durationMs).toBe(30);
  });

  it('连着瞬断好几次:每一跳都算一次,末段没松开就还是 open', () => {
    // 顺带钉住锚点语义:每一次候选都跟**锚点那次**的 up 比,不是跟上一次合并的比。
    // 这是刻意的(drops 数的是"这一次按住里断了几下"),别改成链式比较。
    const episodes = analyzeDragEpisodes([down(0), up(5), down(10), up(15), down(20), move(30)]);

    expect(episodes).toHaveLength(1);
    expect(episodes[0].drops).toBe(2);
    expect(episodes[0].open).toBe(true);
  });
});

describe('analyzeDragEpisodesByButton', () => {
  const LEFT = 0b00001;
  const RIGHT = 0b00100;

  /*
   * 掩码是**状态**不是边沿,所以 `up` 那一刻手上什么键都不剩 —— 默认给 0。
   * (上面那个 describe 里三个助手默认给 1,那是因为 `analyzeDragEpisodes`
   * 根本不看掩码;这里必须写对,否则状态比对什么都推不出来。)
   */
  const down = (t: number, x = 0, y = 0, buttonMask = LEFT) => ({ t, x, y, kind: 'down' as const, buttonMask });
  const up = (t: number, x = 0, y = 0, buttonMask = 0) => ({ t, x, y, kind: 'up' as const, buttonMask });
  const move = (t: number, x = 0, y = 0, buttonMask = LEFT) => ({ t, x, y, kind: 'move' as const, buttonMask });

  it('两个按键各自成段,互不干扰', () => {
    const byButton = analyzeDragEpisodesByButton([
      down(0, 0, 0, LEFT),
      up(10, 0, 0, 0),
      down(100, 0, 0, RIGHT),
      up(110, 0, 0, 0),
    ]);

    expect([...byButton.keys()]).toEqual([0, 2]);
    expect(byButton.get(0)).toHaveLength(1);
    expect(byButton.get(2)).toHaveLength(1);
    expect(byButton.get(2)?.[0].durationMs).toBe(10);
  });

  it('按住左键再按右键:第二次按下从位掩码里补出来,右键也算一段', () => {
    // 组合键的真实序列:按下左键之后**不会**再来一个 pointerdown,
    // 右键的按下是从某次 pointermove 的 buttons 掩码里比对出来的。
    const byButton = analyzeDragEpisodesByButton([
      down(0, 0, 0, LEFT),
      move(50, 10, 0, LEFT | RIGHT),
      move(80, 20, 0, RIGHT),
      up(120, 20, 0, 0),
    ]);

    expect([...byButton.keys()]).toEqual([0, 2]);
    // 左键:按下之后一直在掩码里,到 80ms 那次移动才消失
    expect(byButton.get(0)).toHaveLength(1);
    expect(byButton.get(0)?.[0].samples).toBe(3);
    expect(byButton.get(0)?.[0].durationMs).toBe(80);
    // 右键:50ms 那次移动把它带出来,120ms 松开
    expect(byButton.get(2)).toHaveLength(1);
    expect(byButton.get(2)?.[0].samples).toBe(3);
    expect(byButton.get(2)?.[0].durationMs).toBe(70);
  });

  it('松开左键时右键还按着:左键那段收尾,右键那段照旧开着', () => {
    // 这一条钉的是"没有 pointerup 也要能收尾"。松开左键时右键还按着,
    // 浏览器**不会**派发 pointerup —— 左键的松开只体现在掩码少了一位。
    // 若把取键方式退回 event.button,这一段会永远挂着不结束。
    const byButton = analyzeDragEpisodesByButton([
      down(0, 0, 0, LEFT),
      move(50, 10, 0, LEFT | RIGHT),
      move(80, 20, 0, RIGHT),
    ]);

    expect(byButton.get(0)?.[0].open).toBe(false);
    expect(byButton.get(0)?.[0].durationMs).toBe(80);
    expect(byButton.get(2)?.[0].open).toBe(true);
    expect(byButton.get(2)?.[0].durationMs).toBe(30);
  });

  it('同时按住两个键拖动:路程各自记一份', () => {
    // 这是**有意**的重复计量:每一个键的那一行问的都是"按住这个键期间走了多远"。
    // 指针实际只走了 100px,两个键加起来是 150px —— 所以页面上"累计路程"
    // 那一格必须说明它不能这样相加,否则就是个看着精确的假数字。
    const byButton = analyzeDragEpisodesByButton([
      down(0, 0, 0, LEFT),
      move(50, 30, 40, LEFT | RIGHT),
      move(100, 60, 80, LEFT | RIGHT),
      up(150, 60, 80, 0),
    ]);

    // 左键从头按住,两段路都算
    expect(byButton.get(0)?.[0].distancePx).toBeCloseTo(100, 6);
    // 右键是中途(30,40)才按下的,只算后面那一段
    expect(byButton.get(2)?.[0].distancePx).toBeCloseTo(50, 6);
  });

  it('第一条就是移动、没见到按下:补一条按下,并如实标成没结束', () => {
    // 页面漏掉了那次 pointerdown 时会出现这种流(比如按下发生在监听挂上之前)。
    // 键确实还按着,所以不能丢;但这一段跟踪得不完整,open 会如实说出来。
    const byButton = analyzeDragEpisodesByButton([move(0, 5, 5, LEFT)]);

    expect([...byButton.keys()]).toEqual([0]);
    expect(byButton.get(0)).toHaveLength(1);
    expect(byButton.get(0)?.[0].open).toBe(true);
    expect(byButton.get(0)?.[0].samples).toBe(1);
  });

  it('没收到任何事件:一个按键都不出现', () => {
    // 不是"五个键各 0 次",而是"什么都没测到"。页面据此显示"未测"。
    expect(analyzeDragEpisodesByButton([]).size).toBe(0);
  });

  it('只见到移动、没有按键按下:那个键不会出现', () => {
    // 指针在空手移动。它不属于任何一个键。
    expect(analyzeDragEpisodesByButton([move(0, 5, 5, 0)]).size).toBe(0);
  });

  it('阈值选项透传得下去', () => {
    // 漏传 options 是最容易犯的错,而它不会让任何别的用例变红
    const events = [down(0), up(10, 0, 0, 0), down(20), move(30)];
    expect(analyzeDragEpisodesByButton(events).get(0)?.[0].drops).toBe(1);
    expect(
      analyzeDragEpisodesByButton(events, { repressWindowMs: 0 }).get(0)?.[0].drops,
    ).toBe(0);
  });
});

describe('estimateDpi', () => {
  it('10 厘米走了 1000 像素:254 DPI', () => {
    // 10cm = 3.937 英寸,1000 / 3.937 = 254.0
    expect(estimateDpi({ pixels: 1000, distanceCm: 10 })).toBeCloseTo(254, 3);
  });

  it('显示缩放要乘回去:CSS 像素不是鼠标计数', () => {
    // 150% 缩放下,1 个计数 = 1/1.5 个 CSS 像素,所以同一段物理距离
    // 屏幕上量到的 CSS 像素更少,必须乘回 1.5 才是计数
    expect(estimateDpi({ pixels: 1000, distanceCm: 10, scale: 1.5 })).toBeCloseTo(381, 3);
  });

  it('向左移动也算得出 DPI —— 它是个大小,没有方向', () => {
    expect(estimateDpi({ pixels: -1000, distanceCm: 10 })).toBeCloseTo(254, 3);
  });

  it('距离为 0 或负数时返回 null', () => {
    expect(estimateDpi({ pixels: 1000, distanceCm: 0 })).toBeNull();
    expect(estimateDpi({ pixels: 1000, distanceCm: -5 })).toBeNull();
  });
});

describe('classifyDpi', () => {
  it('落在档位 12% 以内才认', () => {
    expect(classifyDpi(800)).toBe(800);
    expect(classifyDpi(840)).toBe(800);
    expect(classifyDpi(1600)).toBe(1600);
  });

  it('够不着任何档位就说未识别,不硬凑', () => {
    // 960 距离 800 和 1200 都超过 12%
    expect(classifyDpi(960)).toBeNull();
    expect(classifyDpi(254)).toBeNull();
  });
});

describe('compareAcceleration', () => {
  it('快慢两次测出的 DPI 一样:没有加速度', () => {
    const result = compareAcceleration(800, 800);
    expect(result.level).toBe('none');
    expect(result.ratio).toBeCloseTo(1, 6);
  });

  it('快着走多出一截:轻微加速', () => {
    const result = compareAcceleration(800, 1000);
    expect(result.level).toBe('mild');
    expect(result.ratio).toBeCloseTo(1.25, 6);
  });

  it('快着走翻倍:明显加速', () => {
    expect(compareAcceleration(800, 1600).level).toBe('strong');
  });

  it('少一次测量就判不出来,必须给 unknown 而不是 none', () => {
    // 把"没测"说成"没检测到加速度"是把缺失的结论说成否定的结论
    expect(compareAcceleration(800, null).level).toBe('unknown');
    expect(compareAcceleration(null, 800).level).toBe('unknown');
    expect(compareAcceleration(null, null).ratio).toBeNull();
  });
});

describe('summarizeKeyboard', () => {
  const key = (t: number, code: string, isDown: boolean) => ({ t, code, down: isDown });

  it('统计按下次数、不同键数与同时按住的峰值', () => {
    const stats = summarizeKeyboard([
      key(0, 'KeyA', true),
      key(5, 'KeyB', true),
      key(10, 'KeyA', false),
      key(15, 'KeyC', true),
      key(20, 'KeyB', false),
      key(25, 'KeyC', false),
    ]);

    expect(stats.presses).toBe(3);
    expect(stats.uniqueKeys).toBe(3);
    expect(stats.maxSimultaneous).toBe(2);
    expect(stats.stuck).toBe(0);
  });

  it('同一个键反复按只算一个"不同键",但次数照记', () => {
    const stats = summarizeKeyboard([
      key(0, 'KeyA', true),
      key(10, 'KeyA', false),
      key(20, 'KeyA', true),
      key(30, 'KeyA', false),
    ]);

    expect(stats.presses).toBe(2);
    expect(stats.uniqueKeys).toBe(1);
    expect(stats.maxSimultaneous).toBe(1);
  });

  it('窗口失焦导致收不到松开:如实报告还有键被按着', () => {
    // 这不是键盘故障,页面要提示"按了 Alt+Tab 或浏览器快捷键会这样"
    const stats = summarizeKeyboard([key(0, 'KeyA', true), key(5, 'KeyB', true), key(10, 'KeyB', false)]);
    expect(stats.stuck).toBe(1);
  });

  it('空输入全部归零', () => {
    const stats = summarizeKeyboard([]);
    expect(stats.presses).toBe(0);
    expect(stats.maxSimultaneous).toBe(0);
    expect(stats.stuck).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 角度吸附
// ---------------------------------------------------------------------------

/** 确定性伪随机(LCG),用来造可复现的"人手抖动"。 */
function prng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

/**
 * 造一条笔画。
 *
 * `wobble` 是每一步在 y(或竖直笔画的 x)上的**物理**抖动幅度,单位像素、
 * 可以是小数 —— 手在鼠标垫上走出来的路径本来就是亚像素的。**输出一律取整**,
 * 因为浏览器给我们的就是取整后的 CSS 像素增量,这一层量化必须如实模拟,
 * 不能拿浮点数去测一个跑在整数上的判据。
 *
 * `wobble = 0` 就是理想吸附:严格贴轴,每一个点的 y 完全相同。
 */
function strokeOf(
  reports: number,
  step: number,
  wobble = 0,
  seed = 1,
  vertical = false,
) {
  const rnd = prng(seed);
  const x = new Float32Array(reports + 1);
  const y = new Float32Array(reports + 1);
  let phys = 0;
  for (let i = 1; i <= reports; i++) {
    phys += (rnd() * 2 - 1) * wobble;
    if (vertical) {
      y[i] = i * step;
      x[i] = Math.round(phys);
    } else {
      x[i] = i * step;
      y[i] = Math.round(phys);
    }
  }
  return { x, y };
}

/** 同上,但直接要形状。样本没造够会当场抛,免得用例悄悄测了个 null。 */
function shapeOf(
  reports: number,
  step: number,
  wobble = 0,
  seed = 1,
  vertical = false,
) {
  const { x, y } = strokeOf(reports, step, wobble, seed, vertical);
  const shape = strokeShape(x, y, 0, x.length);
  if (!shape) throw new Error('样本没造够,用例本身写错了');
  return shape;
}

/**
 * 在多种子下数一遍"人手笔画被判成吸附"的个数。
 *
 * 被判成吸附 = 误判,因为造出来的这些笔画**是我们自己一格一格抖出来的**,
 * 任何固件都没碰过它们。
 */
function snapFalsePositiveRate(samples: number, wobble: number, seeds = 2000): number {
  let hits = 0;
  for (let s = 1; s <= seeds; s++) {
    const { x, y } = strokeOf(samples - 1, 4, wobble, s * 2654435761);
    const shape = strokeShape(x, y, 0, x.length);
    if (shape && isSnapped(shape)) hits++;
  }
  return hits;
}

/**
 * 45 度对角线:两个轴各自是一条累积随机游走,各自取整。
 * 被吸附过的对角线满足 `x - x0` 与 `y - y0` **逐点严格相等**。
 */
function diagonalOf(reports: number, step: number, wobble = 0, seed = 1) {
  const rnd = prng(seed);
  const x = new Float32Array(reports + 1);
  const y = new Float32Array(reports + 1);
  let px = 0;
  let py = 0;
  for (let i = 1; i <= reports; i++) {
    px += step + (rnd() * 2 - 1) * wobble;
    py += step + (rnd() * 2 - 1) * wobble;
    x[i] = Math.round(px);
    y[i] = Math.round(py);
  }
  return { x, y };
}

/** 到"过起点、斜率 +1"那条直线的最大偏离(像素)。吸附的对角线是 0。 */
function diagonalDeviation(x: Float32Array, y: Float32Array): number {
  let max = 0;
  for (let i = 0; i < x.length; i++) {
    const d = Math.abs(x[i] - x[0] - (y[i] - y[0]));
    if (d > max) max = d;
  }
  return max;
}

describe('角度吸附', () => {
  it('严格贴轴的笔画残差是 0', () => {
    const shape = shapeOf(200, 2);
    expect(shape.length).toBe(400);
    expect(shape.samples).toBe(201);
    expect(shape.axisDeviationDeg).toBe(0);
    expect(shape.rmsResidual).toBe(0);
    expect(shape.maxResidual).toBe(0);
    expect(isNearAxis(shape)).toBe(true);
    expect(isSnapped(shape)).toBe(true);
  });

  it('竖直方向的吸附笔画同样认得出', () => {
    const shape = shapeOf(200, 2, 0, 1, true);
    expect(shape.axisDeviationDeg).toBe(0);
    expect(isSnapped(shape)).toBe(true);
  });

  it('45 度对角线离两条轴一样远,不参与判定', () => {
    const n = 201;
    const x = new Float32Array(n);
    const y = new Float32Array(n);
    for (let i = 1; i < n; i++) {
      x[i] = x[i - 1] + 2;
      y[i] = y[i - 1] + 2;
    }
    const shape = strokeShape(x, y, 0, n)!;
    expect(shape.axisDeviationDeg).toBe(45);
    expect(isNearAxis(shape)).toBe(false);
    expect(isSnapped(shape)).toBe(false);
  });

  it('太短或采样太少的笔画返回 null,而不是硬凑一个形状', () => {
    expect(strokeShape(new Float32Array(11), new Float32Array(11), 0, 11)).toBeNull();
    const { x, y } = strokeOf(30, 2); // 60px,不够长
    expect(strokeShape(x, y, 0, x.length)).toBeNull();
  });

  it('压线:刚好够 100px / 刚好 20 个采样算数', () => {
    const short = strokeOf(49, 2); // 98px,差一点
    expect(strokeShape(short.x, short.y, 0, short.x.length)).toBeNull();
    const ok = strokeOf(50, 2); // 100px,达标
    expect(strokeShape(ok.x, ok.y, 0, ok.x.length)).not.toBeNull();
  });

  it('近轴笔画不够 3 条时给"无法判定",不报"未检出"', () => {
    const two = detectAngleSnap([shapeOf(200, 2), shapeOf(200, 2, 0, 7)]);
    expect(two.conclusive).toBe(false);
    expect(two.hasSnapping).toBe(false);
    // 这两条其实都是吸附的 —— 正因为如此,更不能说"未检出吸附"
    expect(two.snappedStrokes).toBe(2);

    const three = detectAngleSnap([
      shapeOf(200, 2),
      shapeOf(200, 2, 0, 7),
      shapeOf(200, 2, 0, 13),
    ]);
    expect(three.conclusive).toBe(true);
    expect(three.hasSnapping).toBe(true);
    expect(three.snapStrength).toBe(1);
    expect(three.axes).toEqual([0]);
  });

  it('两条轴都检出时都报出来', () => {
    const stats = detectAngleSnap([
      shapeOf(200, 2),
      shapeOf(200, 2, 0, 7),
      shapeOf(200, 2, 0, 11, true),
      shapeOf(200, 2, 0, 13, true),
    ]);
    expect(stats.conclusive).toBe(true);
    expect(stats.axes).toEqual([0, 90]);
    expect(stats.nearAxisStrokes).toBe(4);
  });

  it('真人手绘的一组里一条都不算吸附', () => {
    const shapes = [1, 2, 3, 4, 5, 6].map((s) => shapeOf(200, 2, 1, s * 7919));
    const stats = detectAngleSnap(shapes);
    expect(stats.conclusive).toBe(true);
    expect(stats.hasSnapping).toBe(false);
    expect(stats.snappedStrokes).toBe(0);
    expect(stats.snapStrength).toBe(0);
    expect(stats.axes).toEqual([]);
  });

  it('斜着画的近轴笔画混进来也不会被算成吸附', () => {
    /*
     * 约 8° 的整数阶梯:每走 7 步 x 落 1 步 y。这是**取整世界里**一条人手斜线
     * 的真实样子 —— 阶梯本身就说明它不直。
     *
     * **拒掉它的其实是角度那道闸,不是残差那道。** 实测这条阶梯的最大残差只有
     * 0.435,只比 0.35 的阈值高一丁点 —— "每个周期落一格"的锯齿,它的主方向
     * 自己会往中间偏,把两侧的锯齿摊平。所以两道闸缺一不可,别把角度那道当冗余。
     */
    const reports = 300;
    const x = new Float32Array(reports + 1);
    const y = new Float32Array(reports + 1);
    for (let i = 1; i <= reports; i++) {
      x[i] = i;
      y[i] = Math.floor(i / 7);
    }
    const shape = strokeShape(x, y, 0, reports + 1)!;
    expect(shape.angleDeg).toBeGreaterThan(7);
    expect(shape.angleDeg).toBeLessThan(9);
    expect(isNearAxis(shape)).toBe(true);
    expect(isSnapped(shape)).toBe(false);
    expect(shape.maxResidual).toBeGreaterThan(0);
  });
});

/*
 * 这一组不是功能用例,是**验证用例** —— 回答的是"这套判据搬到浏览器里还成不成立"。
 *
 * 原实现跑在原生驱动层,拿到的是硬件计数(子像素分辨率、无系统加速);
 * 浏览器给的是**取整后的 CSS 像素增量**。取整会抹掉亚像素的抖动,
 * 而"抖不抖"正是判据唯一的输入 —— 所以真正要量的是:
 * **手抖幅度小到什么程度,量化之后就会被误判成吸附?**
 *
 * 结论是负面的,**这些数字就是不做这个功能的依据**,别删。
 */
describe('角度吸附:浏览器像素量化下的余量', () => {
  const report = (rows: string[]) => {
    // 仓库里没有 lint,console.log 是用例唯一的输出口
    console.log('\n' + rows.join('\n'));
  };

  it('扫一遍手抖幅度 × 步长,量出误判的边界', () => {
    const rows: string[] = [];
    for (const step of [1, 2, 4]) {
      for (const wobble of [0, 0.1, 0.25, 1]) {
        const shape = shapeOf(200, step, wobble, 4242);
        rows.push(
          `step=${step}px wobble=${wobble}px | rms=${shape.rmsResidual.toFixed(3)}` +
            ` max=${shape.maxResidual.toFixed(3)} | nearAxis=${isNearAxis(shape)} snapped=${isSnapped(shape)}`,
        );
      }
    }
    report(rows);
    expect(rows).toHaveLength(12);
  });

  it('量出"人手笔画被误判成吸附"的比例', () => {
    /*
     * 吸附笔画的残差**恰好是 0**,因为固件输出的是一整串相同的整数。所以我方
     * 唯一怕的是反过来:手抖小到被取整整个吃掉,人手画的线也 quantize 成一条
     * 严格贴轴的常量 —— 那就是**误判**,会把一只干净鼠标说成开了吸附。
     *
     * 每种情形跑 2000 个种子直接数。`samples` 那一维不能省:采样越少,
     * 随机游走越没机会飘出 ±0.5 的取整带,越容易被抹平。
     */
    const seeds = 2000;
    const rows: string[] = [];
    for (const samples of [31, 61, 201]) {
      for (const wobble of [0, 0.05, 0.1, 0.2, 0.5]) {
        const fp = snapFalsePositiveRate(samples, wobble, seeds);
        rows.push(
          `samples=${samples} wobble=${wobble}px -> 误判 ${fp}/${seeds}` +
            ` (${((fp / seeds) * 100).toFixed(2)}%)`,
        );
      }
    }
    report(rows);
    expect(rows).toHaveLength(15);

    /*
     * 钉住两端,别让阈值以后被人调松:
     *
     * - **长笔画 + 手抖明显(201 采样 / 0.2px):一次误判都不该有。**
     * - **短笔画 + 手抖轻微(31 采样 / 0.2px):必然大量误判。**
     *
     * 后一条是这次验证真正的结论 —— 它不是"阈值没调好",是判据在浏览器给的
     * 量化数据上**天生分不开**这两种笔画。谁要把它调回去,先看这两个数。
     */
    expect(snapFalsePositiveRate(201, 0.2)).toBe(0);
    expect(snapFalsePositiveRate(201, 0.5)).toBe(0);
    expect(snapFalsePositiveRate(31, 0.2)).toBeGreaterThan(400);
    expect(snapFalsePositiveRate(31, 0.1)).toBeGreaterThan(1500);
  });

  it('45 度对角线救不了:亚像素手抖同样会被取整抹平', () => {
    /*
     * 想过的一条退路:很多固件的吸附**也管 45 度**,而对角线要求
     * `dx == dy` **逐点严格相等** —— 两个独立的量化量,听起来手做不到。
     *
     * 事实证明这是错觉:手抖是**亚像素**的,取整之后两个轴都落在同一个整数上,
     * 对角的"严格相等"照样成立。所以这条路和水平那条一样窄。
     */
    const seeds = 2000;
    const rows: string[] = [];
    for (const samples of [31, 61, 201]) {
      for (const wobble of [0, 0.05, 0.2]) {
        let fp = 0;
        for (let s = 1; s <= seeds; s++) {
          const { x, y } = diagonalOf(samples - 1, 4, wobble, s * 2654435761);
          if (diagonalDeviation(x, y) < 0.5) fp++;
        }
        rows.push(`45° samples=${samples} wobble=${wobble}px -> 误判 ${fp}/${seeds}`);
      }
    }
    report(rows);

    // 吸附的对角线偏离恰好是 0 —— 这一端钉死
    const ideal = diagonalOf(200, 4);
    expect(diagonalDeviation(ideal.x, ideal.y)).toBe(0);

    // 但手画的 45 度在短笔画上同样会落进 0.5 以内(实测 31 采样 / 0.2px 是 7.45%)
    let shortFp = 0;
    for (let s = 1; s <= seeds; s++) {
      const { x, y } = diagonalOf(30, 4, 0.2, s * 2654435761);
      if (diagonalDeviation(x, y) < 0.5) shortFp++;
    }
    expect(shortFp).toBeGreaterThan(100);
    expect(shortFp).toBeLessThan(300);
  });
});

describe('summarizeReaction', () => {
  const timed = (ms: number): ReactionTrial => ({ outcome: 'timed', ms });

  it('一次都没有时全部为 null,而不是 0', () => {
    const s = summarizeReaction([]);
    expect(s.medianMs).toBeNull();
    expect(s.fastestMs).toBeNull();
    expect(s.valid).toBe(0);
    expect(s.foul).toBe(0);
    expect(s.timeout).toBe(0);
    expect(s.void).toBe(0);
    expect(s.suspect).toBe(0);
  });

  it('有效次数不足 MIN_VALID_TRIALS 时不给中位数', () => {
    const trials = [timed(220), timed(240)];
    const s = summarizeReaction(trials);
    expect(s.valid).toBe(2);
    expect(s.medianMs).toBeNull();
    // 但"最快一次"对 n>=1 是有定义的 —— 它只是观察到的最小值
    expect(s.fastestMs).toBe(220);
  });

  it('刚好够 MIN_VALID_TRIALS 次就出中位数', () => {
    const trials = [timed(200), timed(250), timed(220), timed(300), timed(210)];
    const s = summarizeReaction(trials);
    expect(s.valid).toBe(MIN_VALID_TRIALS);
    expect(s.medianMs).toBe(220);
  });

  it('报的是中位数,不是平均值', () => {
    // 一次 600ms 的失神:平均值被推高到 388,中位数几乎不动
    const trials = [timed(200), timed(210), timed(215), timed(225), timed(600)];
    const s = summarizeReaction(trials);
    const mean = (200 + 210 + 215 + 225 + 600) / 5;
    expect(s.medianMs).toBe(215);
    expect(s.medianMs).not.toBeCloseTo(mean, 0);
  });

  it('快得不可能的按下算"可疑":排除出中位数,但照样计数', () => {
    const trials = [timed(30), timed(200), timed(210), timed(220), timed(230), timed(240)];
    const s = summarizeReaction(trials);
    expect(s.suspect).toBe(1);
    expect(s.valid).toBe(5);
    // 那 30ms 没有进来
    expect(s.medianMs).toBe(220);
    expect(s.medianMs).not.toBe(30);
    // 而且它不是"没测到" —— 条数报得出来
    expect(s.fastestMs).toBe(200);
  });

  it('门槛数的是**有效**次数,不是尝试次数', () => {
    // 6 次尝试,但一条被排除、一条抢跑 → 只剩 4 次有效,仍然不给中位数。
    // 这正是不把"做了 6 次"当分子的理由。
    const trials: ReactionTrial[] = [
      timed(30),
      { outcome: 'foul' },
      timed(200),
      timed(210),
      timed(220),
      timed(230),
    ];
    const s = summarizeReaction(trials);
    expect(s.valid).toBe(4);
    expect(s.suspect).toBe(1);
    expect(s.foul).toBe(1);
    expect(s.medianMs).toBeNull();
  });

  it('恰好落在 RT_IMPLAUSIBLE_MS 上的算有效(判据是严格小于)', () => {
    const s = summarizeReaction([
      timed(RT_IMPLAUSIBLE_MS),
      timed(200),
      timed(210),
      timed(220),
      timed(230),
    ]);
    expect(s.suspect).toBe(0);
    expect(s.valid).toBe(5);
  });

  it('时钟无效(ms <= 0)归入作废,不夹到 0', () => {
    const s = summarizeReaction([timed(0), timed(-5), timed(200), timed(210)]);
    expect(s.void).toBe(2);
    expect(s.valid).toBe(2);
    expect(s.medianMs).toBeNull();
  });

  it('非有限值也算作废,不会把中位数污染成 NaN', () => {
    const s = summarizeReaction([
      timed(Number.NaN),
      timed(200),
      timed(210),
      timed(220),
      timed(230),
      timed(240),
    ]);
    expect(s.void).toBe(1);
    expect(s.valid).toBe(5);
    expect(s.medianMs).toBe(220);
  });

  it('抢跑 / 超时 / 作废三类各自计数,一律不进中位数', () => {
    const trials: ReactionTrial[] = [
      { outcome: 'foul' },
      { outcome: 'foul' },
      { outcome: 'timeout' },
      { outcome: 'void' },
      timed(200),
      timed(220),
      timed(240),
      timed(260),
      timed(280),
    ];
    const s = summarizeReaction(trials);
    expect(s.foul).toBe(2);
    expect(s.timeout).toBe(1);
    expect(s.void).toBe(1);
    expect(s.valid).toBe(5);
    expect(s.medianMs).toBe(240);
    expect(s.fastestMs).toBe(200);
  });

  it('全是作废时,一个数都不给', () => {
    const s = summarizeReaction([
      { outcome: 'foul' },
      { outcome: 'timeout' },
      { outcome: 'void' },
    ]);
    expect(s.valid).toBe(0);
    expect(s.medianMs).toBeNull();
    expect(s.fastestMs).toBeNull();
    expect(s.foul + s.timeout + s.void).toBe(3);
  });
});

describe('summarizeAim', () => {
  const hit = (offsetPx: number): AimShot => ({ hit: true, offsetPx });
  const miss: AimShot = { hit: false };

  it('一次没点:命中率是 null 而不是 0', () => {
    const s = summarizeAim([], 10_000);
    expect(s.clicks).toBe(0);
    expect(s.hits).toBe(0);
    expect(s.accuracy).toBeNull();
    expect(s.meanOffsetPx).toBeNull();
    // 时长是有的,所以"每秒命中"算出 0 是诚实的
    expect(s.hitsPerSecond).toBe(0);
  });

  it('脱靶算进点击数,但算不进平均偏离', () => {
    // 一次 300px 的脱靶:如果算进平均值,均值会从 10 变成 155
    const shots: AimShot[] = [hit(10), hit(10), miss];
    const s = summarizeAim(shots, 10_000);
    expect(s.hits).toBe(2);
    expect(s.clicks).toBe(3);
    expect(s.meanOffsetPx).toBe(10);
    expect(s.accuracy).toBeCloseTo(2 / 3, 10);
  });

  it('全脱靶:平均偏离是 null,命中率是 0', () => {
    const s = summarizeAim([miss, miss], 10_000);
    expect(s.hits).toBe(0);
    expect(s.accuracy).toBe(0);
    expect(s.meanOffsetPx).toBeNull();
  });

  it('每秒命中用传入的时长 —— 爆发后空闲不能被时间戳"洗掉"', () => {
    // 10 秒里只有前 1 秒在点,打了 20 次。分母必须是计时器给的 10 秒。
    const burst: AimShot[] = [];
    for (let i = 0; i < 20; i++) burst.push(hit(5));

    const s = summarizeAim(burst, 10_000);
    expect(s.hits).toBe(20);
    expect(s.hitsPerSecond).toBe(2); // 20 / 10s,不是 20 / 1s
    expect(s.hitsPerSecond).not.toBe(20);
  });

  it('时长无效时不给每秒命中,而不是给 Infinity', () => {
    const s = summarizeAim([hit(5)], 0);
    expect(s.hitsPerSecond).toBeNull();
    expect(summarizeAim([hit(5)], Number.NaN).hitsPerSecond).toBeNull();
  });

  it('偏离里混进坏值时,平均值变成 NaN 交给 format() 出破折号', () => {
    // 不悄悄按"命中的条数"去平均 —— 那会把坏值稀释掉,给一个看着正常的数
    const s = summarizeAim([hit(10), hit(Number.NaN)], 1_000);
    expect(s.hits).toBe(2);
    expect(s.meanOffsetPx).toBeNaN();
  });
});

describe('aimBestKey', () => {
  it('三档设置各记各的', () => {
    const keys = new Set([
      aimBestKey('multi', 'standard', 10_000),
      aimBestKey('single', 'standard', 10_000),
      aimBestKey('multi', 'easy', 10_000),
      aimBestKey('multi', 'standard', 30_000),
    ]);
    expect(keys.size).toBe(4);
  });

  it('同一组设置永远给同一个键', () => {
    expect(aimBestKey('multi', 'hard', 60_000)).toBe(aimBestKey('multi', 'hard', 60_000));
  });

  it('键形带得动 mode / difficulty / duration', () => {
    expect(aimBestKey('single', 'easy', 10_000)).toBe('mouse-test:aim-best:single:easy:10000');
  });
});
