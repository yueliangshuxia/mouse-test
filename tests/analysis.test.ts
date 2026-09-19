import { describe, expect, it } from 'vitest';
import {
  analyzeDragEpisodes,
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
  detectGaps,
  detectTrailJumps,
  estimateDpi,
  longestSegment,
  measureDrift,
  normalizeWheelDelta,
  pathLength,
  percentile,
  positiveIntervals,
  rateByCount,
  segmentTimestamps,
  summarizeClickGaps,
  summarizeKeyboard,
  summarizeScroll,
} from '../src/lib/analysis';

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
  const down = (t: number, x = 0, y = 0) => ({ t, x, y, kind: 'down' as const });
  const up = (t: number, x = 0, y = 0) => ({ t, x, y, kind: 'up' as const });
  const move = (t: number, x = 0, y = 0) => ({ t, x, y, kind: 'move' as const });

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
