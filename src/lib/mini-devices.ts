/**
 * 首页卡片里的"小装置"。
 *
 * 一个**薄驱动** + 每种工具一个工厂。驱动只管四件事,和具体工具一概无关:
 *
 * 1. **惰性挂载** —— 卡片插进页面时**一个装置都不建**。装置面上挂着一组探针
 *    事件(哪种事件由 `DEVICES[kind].wake` 声明),用户第一次碰到它才调工厂。
 *    这一条不是优化:七张卡各有一个采样器时,默认容量 120000 条 × 17 字节
 *    ≈ 2MB 一份,七张就是十几 MB,而首页大部分人只是路过。
 * 2. **状态机** —— `idle → running → done`,负责 `.well` 的加减和装置内容的清空。
 * 3. **读数** —— `write()` 走 `ui.ts` 的 `setText`(写入前先比较那条约定)。
 *
 * 默认行为的拦截(右键菜单、中键自动滚动、侧键的前进/后退)**不在这里**,
 * 由 `index.astro` 一次装在整个卡片网格上 —— 见那边的注释。
 *
 * ## 为什么是 `Record` 而不是 `switch`
 *
 * 加一个工具 = 在 `mini-cards.ts` 加一条数据 + 在这里加一个工厂。用 `switch` 的
 * 话漏掉一个分支是**运行期静默失败**(卡片永远不出数),而 `Record` 的键是
 * `Exclude<MiniKind, null>`,漏一个 `npm run typecheck` 直接报错。
 *
 * ## `.well` 只出现在 `running`
 *
 * 设计系统那句话是「**有颜色的地方就是在出数**」。所以:
 *
 * - `idle` / `done` —— 纸面。虚线框说的是"碰我开始测",读数留在下面。
 * - `running` —— 落到仪器窗寄存器,`--bg` / `--accent` / `--trail-color` 整套
 *   被 `.well` 重映射,**这里不用写第二套配色**。
 *
 * `done` 刻意**不留在仪器窗**:测量已经结束了,继续亮着就是在说"这里还在出数",
 * 而那句话一旦不成立,整套"扫一眼就知道哪里是活的"就失效了。
 *
 * ## 三条浏览器约束(照抄现成结论,不重新发明)
 *
 * - **两个事件之间的间隔取 `event.timeStamp`;一段墙钟(按住多久)取
 *   `performance.now()`。** 前者见按键/双击/CPS,后者见长按。
 * - **绝不把 `pointerrawupdate` 和 `pointermove` 同时挂。** 回报率和轨迹两个
 *   装置走 `sampler.ts` 的 `createMoveSampler()`,通道选择由它定。
 * - **组合键只能逐位 diff `event.buttons`。** 用 `mouse-buttons.ts` 的现成表。
 */

import {
  analyzeDragEpisodesByButton,
  analyzeSegments,
  classifyClickGap,
  computeCps,
  detectTrailJumps,
  longestSegment,
  markScrollGlitches,
  normalizeWheelDelta,
  RESTART_LOCK_MS,
  segmentTimestamps,
  summarizeScroll,
  type CpsStats,
  type DragEvent,
  type ScrollNotch,
} from './analysis';
import { BUTTONS, eachButtonEdge, maskFromButtons } from './mouse-buttons';
import { defaultMiniMode, type MiniCard, type MiniKind } from './mini-cards';
import { createTrailRenderer, observeResize } from './renderer';
import { createMoveSampler } from './sampler';
import { createTicker, format, setText } from './ui';

export type Phase = 'idle' | 'running' | 'done';

/** 方向带上的一格。`down` 沉到底,`up` 升到顶。 */
export type TraceMark = 'up' | 'down';

export interface MiniContext {
  /** 卡里那块装置面。探针已经挂在它上面了,工厂可以继续用 */
  readonly surface: HTMLElement;
  /** 装置自建的实时画面放这里。驱动每次开测都换一个新的 */
  readonly live: HTMLElement;
  /**
   * 当前选中的模式 key;卡片没写 `modes` 时是 `null`。
   *
   * 工厂在**创建时**读一次就够了 —— 换模式时驱动会把卡片复位回空态,下一次
   * 交互重新建一个工厂。所以工厂不必监听模式变化,也**不该**中途改口径:
   * 一轮测到一半换挡,前面那段的读数和后面的对不上号。
   */
  readonly mode: string | null;
  /** 写一个读数槽。槽是按 `MiniCard.readouts[].key` 找的 */
  write(key: string, value: string): void;
  /**
   * 往一条**方向带**上推一格。`key` 指向 `MiniCard.readouts` 里
   * `kind: 'trace'` 的那一条。
   *
   * 每格一次滚动:向下沉到底、向上升顶。孤立反向的那一格标红(毛刺)——
   * 判据是 `analysis.ts` 的 `markScrollGlitches`,和滚轮页的 `glitches`
   * **是同一条**,不另起一套。
   *
   * 带子画在**读数区**(纸面),不在装置面里:它是读数,和 `方向` / `格数` 并排。
   */
  push(key: string, mark: TraceMark): void;
  /**
   * 挂一个监听,**返回时自动摘掉**(随 `finish()` 或下一次开测)。
   * 工厂里不要自己 `addEventListener`。
   */
  on(target: EventTarget, type: string, fn: EventListener, options?: AddEventListenerOptions): void;
  /** 交还定时器 / rAF / 采样器。开测时和结束时都会被调用 */
  onCleanup(fn: () => void): void;
  /**
   * 「这么久没有新事件就算了结这次测量」。
   *
   * `busy` 为真表示**装置正忙着**(比如有按键还按着),此时只把计时器撤掉,
   * 不重新计时 —— 按住不动是不产生事件的,不这样写会在用户还按着的时候
   * 把测量判成结束。
   */
  settleAfter(ms: number, busy?: boolean): void;
  /**
   * 结算之后这么久内,**装置面上的交互不算"想再测一轮"**,由驱动的探针挡住。
   *
   * 只有"窗口到点自动关闭"的测量需要它(卡片上就是 CPS 的 5 秒模式):结算那
   * 一刻手还在惯性连点,下一按就会把刚出的成绩抹掉、原地开下一轮。理由和整页
   * 同一条,见 `analysis.ts` 的 `RESTART_LOCK_MS` —— 那个常量就是给这里用的。
   *
   * 锁挂在**驱动**上而不是工厂里,因为新的一轮会新建一个工厂,工厂自己记的
   * 任何状态都活不过这一次结算。
   */
  cooldown(ms: number): void;
  /** 立刻了结这次测量 */
  finish(): void;
}

/**
 * 工厂。`seed` 是**把装置唤醒的那一个事件**。
 *
 * 这个参数是被一条**实测出来的**浏览器行为逼出来的:
 *
 * 装置是在"第一次交互"那一个事件的派发过程中挂载的,于是工厂只能在这期间
 * 才把自己的监听装上。DOM 规范说派发期间新增的监听不会收到这一次事件,
 * 但**实测 Chrome 会**(在目标阶段:捕获那一趟跑完之后,冒泡那一趟重新读了一遍
 * 监听表)。两种行为都真实存在,而依赖"浏览器会不会多跑一趟"是不可接受的 ——
 * 信规范就会丢第一次点击,**信 Chrome 就会把第一次点击数两遍**。
 *
 * 所以两边都不靠:驱动把 seed **显式**交给工厂,同时保证工厂的监听**永远看不到
 * 这个事件对象**(见 `mountMiniCard` 里的 `seed` 比对)。这样无论浏览器怎么实现,
 * 第一次交互都恰好被处理一次。
 */
type MiniFactory = (ctx: MiniContext, seed: Event) => void;

interface MiniDevice {
  /**
   * 哪种事件算"用户开始用了"。
   *
   * **必须按装置分别声明,不能一律三种都收。** 一律收 `pointermove` 的话,
   * 鼠标从页面顶上扫到卡片区,路过几张卡就挂起几个采样器和画布 ——
   * 惰性挂载等于没做。
   */
  wake: readonly string[];
  run: MiniFactory;
}

/** 卡片上的采样器容量。默认 120000 条 ≈ 2MB,卡片上测一次只有几秒,给 20000 ≈ 340KB。 */
const MINI_CAPACITY = 20_000;

/** 离散型装置(按键、双击、CPS、滚轮)停手多久算结束 */
const IDLE_DONE_MS = 1200;

/** 轨迹和回报率:指针不动了多久算结束 */
const MOTION_DONE_MS = 1500;

// ---------------------------------------------------------------------------
// 装置内容的小工具
// ---------------------------------------------------------------------------

function div(className: string): HTMLDivElement {
  const node = document.createElement('div');
  node.className = className;
  return node;
}

/** 装置面正中间那个大数字。它落在仪器窗里,所以颜色由 `.well` 说了算 */
function bigNumber(live: HTMLElement): HTMLDivElement {
  const node = div('mini-live__big');
  live.appendChild(node);
  return node;
}

/** 大数字底下那行小字 */
function caption(live: HTMLElement): HTMLDivElement {
  const node = div('mini-live__caption');
  live.appendChild(node);
  return node;
}

/**
 * 把唤醒装置的那个事件收窄成它该有的类型。
 *
 * 见 `MiniFactory` 那段:工厂的监听是在派发过程中挂的,**收不到**这一次事件,
 * 所以每个工厂都要自己把 seed 补处理一遍。类型在运行期只能这样验。
 */
function asPointer(event: Event): PointerEvent | null {
  return typeof PointerEvent !== 'undefined' && event instanceof PointerEvent ? event : null;
}

// ---------------------------------------------------------------------------
// 七个装置
// ---------------------------------------------------------------------------

/**
 * 鼠标按键。框里排五个键帽,按哪个亮哪个,底下记总次数。
 *
 * 状态只能从 `event.buttons` 的位掩码逐位 diff 出来 —— `pointerdown` 只在
 * "从无键到有键"时派发一次,组合键的第二次按下走的是 `pointermove`。
 */
const buttonsMini: MiniFactory = (ctx, seed) => {
  let mask = 0;
  let presses = 0;

  const row = div('mini-live__row');
  ctx.live.appendChild(row);

  const chips = BUTTONS.map((button) => {
    const chip = div('mini-chip');
    chip.textContent = button.name;
    row.appendChild(chip);
    return chip;
  });

  function sync(): void {
    const held: string[] = [];
    for (let i = 0; i < BUTTONS.length; i++) {
      const down = (mask & (1 << BUTTONS[i].code)) !== 0;
      chips[i].classList.toggle('mini-chip--down', down);
      if (down) held.push(BUTTONS[i].name);
    }
    // 「当前按着」为空时给破折号而不是 0:这不是"算不出来",是"此刻没有"。
    // 全站的破折号在两种场合都用,这里是后一种。
    ctx.write('presses', String(presses));
    ctx.write('held', held.length > 0 ? held.join(' + ') : '—');
  }

  function handle(event: PointerEvent): void {
    const next = maskFromButtons(event.buttons);
    if (next !== mask) {
      eachButtonEdge(mask, next, (_code, down) => {
        if (down) presses++;
      });
      mask = next;
      if (mask !== 0) {
        // 拖出框外还要收得到 pointerup,否则掩码会一直卡在"按着"
        try {
          ctx.surface.setPointerCapture(event.pointerId);
        } catch {
          /* 已在捕获状态 */
        }
      }
      sync();
    }
    ctx.settleAfter(IDLE_DONE_MS, mask !== 0);
  }

  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave']) {
    ctx.on(ctx.surface, type, handle as EventListener);
  }

  sync();
  // 唤醒它的那一次按下就是第一次按下,不补这一下会白丢一次
  const pointer = asPointer(seed);
  if (pointer) handle(pointer);
};

/**
 * 双击。记相邻两次**同一个键**的按下间隔,小于 `CLICK_CHATTER_MS` 的标出来。
 *
 * 按同一个键分开记:左键点一下再用右键点一下,这两个事件之间的差没有意义,
 * 混在一起会凭空造出一个"间隔"。
 */
const doubleClickMini: MiniFactory = (ctx, seed) => {
  const lastByButton = new Map<number, number>();
  const big = bigNumber(ctx.live);
  const captionNode = caption(ctx.live);
  big.textContent = '—';
  captionNode.textContent = '连点两下';

  let clicks = 0;

  function press(event: PointerEvent): void {
    // `pointerdown` 只由"从无键到有键"那一下产生,所以这里的 button 必是具体编号。
    // 负值理论上不会出现,挡一下免得把 -1 记进表里。
    if (event.button < 0) return;

    const stamp = event.timeStamp;
    const previous = lastByButton.get(event.button);
    lastByButton.set(event.button, stamp);

    clicks++;
    ctx.write('clicks', String(clicks));

    if (previous !== undefined) {
      const gap = stamp - previous;
      const kind = classifyClickGap(gap);
      const chatter = kind === 'chatter';
      ctx.write('gap', format(gap, 0));
      big.textContent = format(gap, 0);
      big.classList.toggle('mini-live__big--alert', chatter);
      captionNode.textContent = chatter ? '偏快 —— 人手做不到这个速度' : '间隔正常';
    }

    ctx.settleAfter(IDLE_DONE_MS);
  }

  ctx.on(ctx.surface, 'pointerdown', press as EventListener);

  const pointer = asPointer(seed);
  if (pointer) press(pointer);
};

/** 卡片上那个 5 秒档。整页那边还有 10 / 30 秒,见 `cps-test.astro` 的 `DURATIONS`。 */
const CPS_FIVE_SECONDS_MS = 5000;

/**
 * CPS。两个模式共用同一套读数,差别只在**这次测量什么时候结束**:
 *
 * - `instant` —— 手停下来 1.2 秒就算完。大数字是"1 秒内最多几下"(1 秒滑窗的
 *   最高次数),分母用"从第一下到现在"的墙钟 —— 用户还在点,那两个数本来就是
 *   一回事,不必等计时器。
 * - `five` —— 窗口由**计时器**在 5 秒整关闭,与手停不停无关。大数字是这 5 秒的
 *   平均 CPS。这就是整页 5 秒档的口径:时长**显式**传给 `computeCps`。
 *
 * 5 秒模式**绝不能**调 `settleAfter`:手在 5 秒中间歇一下是正常的,而
 * `settleAfter` 会在那一下之后把这一轮提前结束掉。它只由 deadline 关闭。
 *
 * 结尾那段空档是这条设计的全部理由 —— "点 20 下然后歇 4 秒"在时间戳里长得和
 * "匀速点 5 秒"一模一样,因为不点就没有事件。分母只能由计时器给。
 */
const cpsMini: MiniFactory = (ctx, seed) => {
  const times: number[] = [];
  const big = bigNumber(ctx.live);
  const captionNode = caption(ctx.live);
  big.textContent = '—';

  const timed = ctx.mode === 'five';
  captionNode.textContent = timed ? '连点 5 秒' : '1 秒内最多几下';

  let base = 0;
  let stopTick: (() => void) | null = null;

  /**
   * 把当前累计摆到两个读数槽上,返回算出来的那组数。
   *
   * `windowMs` 固定 1 秒而 `durationMs` 由**调用方**给:前者是峰值的定义
   * ("任意 1 秒内最多几下"),后者是平均的分母,两件事。瞬时模式传墙钟,
   * 计时模式传 5 秒整 —— 后者哪怕这一轮只点了 3 下也必须按 5 秒算。
   */
  function publish(durationMs: number): CpsStats | null {
    const stats = computeCps(times, { windowMs: 1000, durationMs });
    ctx.write('cps', format(stats ? stats.peak : null, 0));
    ctx.write('clicks', String(times.length));
    return stats;
  }

  /** 5 秒模式:窗口到点就结算,和手停没停无关 */
  function settleTimed(): void {
    stopTick?.();
    stopTick = null;
    const stats = publish(CPS_FIVE_SECONDS_MS);
    big.textContent = format(stats ? stats.average : null, 1);
    captionNode.textContent = '5 秒平均 CPS';
    // 结算这一刻手还在惯性连点 —— 不锁的话下一按就把这个数抹掉、原地开下一轮
    ctx.cooldown(RESTART_LOCK_MS);
    ctx.finish();
  }

  function beginTimed(): void {
    stopTick?.();
    stopTick = createTicker(80, () => {
      const elapsed = performance.now() - base;
      const left = (CPS_FIVE_SECONDS_MS - elapsed) / 1000;
      if (left <= 0) {
        settleTimed();
        return;
      }
      // 跑的时候大数字是**倒计时**:这是个有终点的测量,得让人看得到还剩多久
      big.textContent = left.toFixed(1);
      captionNode.textContent = `还剩 ${left.toFixed(1)} 秒`;
      publish(Math.max(1000, elapsed));
    });
    ctx.onCleanup(() => {
      stopTick?.();
      stopTick = null;
    });
  }

  function press(event: PointerEvent): void {
    if (event.button !== 0) return; // 只认主键,和那一页的默认键一致

    const stamp = event.timeStamp;
    if (times.length === 0) {
      base = stamp;
      if (timed) beginTimed();
    }
    times.push(stamp - base);

    // 计时模式的读数和结束都归 ticker 管,这里只记数
    if (timed) return;

    const stats = publish(Math.max(1000, stamp - base));
    big.textContent = format(stats ? stats.peak : null, 0);
    ctx.settleAfter(IDLE_DONE_MS);
  }

  ctx.on(ctx.surface, 'pointerdown', press as EventListener);

  const pointer = asPointer(seed);
  if (pointer) press(pointer);
};

/**
 * 长按。给已经按住的秒数,以及**疑似**瞬断次数。
 *
 * 秒数取 `performance.now()` 而不是事件时间戳:按住不动不产生任何事件,
 * 只有墙钟知道过了多久。而事件流那一份仍用 `event.timeStamp`,交给
 * `analyzeDragEpisodesByButton` 去推每个键自己的边沿。
 */
const holdMini: MiniFactory = (ctx, seed) => {
  const events: DragEvent[] = [];
  const big = bigNumber(ctx.live);
  const captionNode = caption(ctx.live);
  big.textContent = '0.0';
  captionNode.textContent = '按住不动';

  let heldSince = 0;
  let holding = false;

  function record(event: PointerEvent, kind: DragEvent['kind']): void {
    events.push({
      t: event.timeStamp,
      x: event.clientX,
      y: event.clientY,
      kind,
      buttonMask: maskFromButtons(event.buttons),
    });
  }

  function onDown(event: PointerEvent): void {
    record(event, 'down');
    if (!holding) {
      holding = true;
      heldSince = performance.now();
      try {
        ctx.surface.setPointerCapture(event.pointerId);
      } catch {
        /* 已在捕获状态 */
      }
    }
  }

  function onMove(event: PointerEvent): void {
    if (event.buttons === 0) return;
    record(event, 'move');
  }

  function onUp(event: PointerEvent): void {
    record(event, 'up');
    // 组合键下松开一个键不会有 pointerup,所以判据是"还有没有键按着",
    // 不是"收到了 pointerup"。
    if (event.buttons !== 0) return;
    release();
  }

  function release(): void {
    if (!holding) return;
    holding = false;

    const seconds = (performance.now() - heldSince) / 1000;
    big.textContent = format(seconds, 1);
    ctx.write('held', format(seconds, 1));

    let breaks = 0;
    for (const episodes of analyzeDragEpisodesByButton(events).values()) {
      for (const episode of episodes) breaks += episode.drops;
    }
    // 这里收到过事件,所以 0 是真的 0,不是"没测到" —— 不用破折号
    ctx.write('breaks', String(breaks));
    captionNode.textContent = breaks > 0 ? '按住期间疑似断过' : '全程没有断开';

    ctx.finish();
  }

  const tick = createTicker(80, () => {
    if (!holding) return;
    const seconds = (performance.now() - heldSince) / 1000;
    big.textContent = format(seconds, 1);
    ctx.write('held', format(seconds, 1));
  });
  ctx.onCleanup(tick);

  // 拖到窗口外面松手、或者切走标签页,pointerup 可能永远不来。
  // 不兜住的话秒数会一直涨下去,看起来像卡死了。
  ctx.on(window, 'blur', () => release());

  ctx.on(ctx.surface, 'pointerdown', onDown as EventListener);
  ctx.on(ctx.surface, 'pointermove', onMove as EventListener);
  ctx.on(ctx.surface, 'pointerup', onUp as EventListener);
  // 取消(设备被拔掉、手势被系统接管)时报不了松开,但它确实结束了
  ctx.on(ctx.surface, 'pointercancel', () => release());

  const pointer = asPointer(seed);
  if (pointer) onDown(pointer);
};

/**
 * 滚轮。只给**方向**和估算的格数。
 *
 * `deltaMode` 只说单位是像素/行/页,从不说"一格是多少",所以格数是启发式换算
 * (`normalizeWheelDelta`)。方向不需要任何假设,是可靠的。
 */
const wheelMini: MiniFactory = (ctx, seed) => {
  const notches: ScrollNotch[] = [];
  const big = bigNumber(ctx.live);
  const captionNode = caption(ctx.live);
  big.textContent = '—';
  captionNode.textContent = '滚滚轮';

  function onWheel(event: WheelEvent): void {
    // 不拦的话页面会跟着滚,而装置面会从指针底下溜走 —— 那一页量滚动时
    // 记的是同一件事,在卡片上是纯污染。所以要 `passive: false`。
    event.preventDefault();

    const step = normalizeWheelDelta(event.deltaY, event.deltaMode);
    notches.push({ notches: step, raw: event.deltaY, deltaMode: event.deltaMode });

    const stats = summarizeScroll(notches);
    const net = stats.netNotches;
    big.textContent = net > 0 ? '↓' : net < 0 ? '↑' : '—';
    captionNode.textContent = net > 0 ? '向下' : net < 0 ? '向上' : '方向待定';
    // 方向给**箭头朝向**而不是「向下」两个字:它和装置面里那个大箭头是同一件事,
    // 说两遍不如长得一样,顺带把读数行让给右边那条方向带。
    ctx.write('direction', net > 0 ? '↓' : net < 0 ? '↑' : '—');
    ctx.write('notches', format(Math.abs(net), 0));

    // 零位移的那一次没有方向,不进带子 —— 进去就是凭空多一格。
    // (`summarizeScroll` 本来也跳过它,两个口径一致。)
    if (step !== 0) ctx.push('recent', step > 0 ? 'down' : 'up');

    ctx.settleAfter(IDLE_DONE_MS);
  }

  ctx.on(ctx.surface, 'wheel', onWheel as EventListener, { passive: false });

  if (seed instanceof WheelEvent) onWheel(seed);
};

/**
 * 轨迹。卡里的画布画一笔,报采样数和**孤立尖峰**。
 *
 * 主指标是 `isolated` 而不是 `jumps`:后者混着"手甩快了"的连续隆起,
 * 拿它当结论就等于一边讲"跳变不等于丢帧"一边给一个分不清两者的数。
 */
const trailMini: MiniFactory = (ctx) => {
  const sampler = createMoveSampler(ctx.surface, { capacity: MINI_CAPACITY, capture: true });
  ctx.onCleanup(() => sampler.destroy());

  const canvas = document.createElement('canvas');
  canvas.className = 'mini-canvas';
  ctx.live.appendChild(canvas);

  const renderer = createTrailRenderer(canvas, sampler.buffer, { lineWidth: 1.5 });
  renderer.start();
  ctx.onCleanup(() => renderer.destroy());
  // 卡片宽度会随窗口变,画布的原点和 DPR 得跟着重算
  ctx.onCleanup(observeResize(canvas, () => renderer.resize()));

  let lastCount = 0;
  let lastGrowth = performance.now();

  const tick = createTicker(250, (now) => {
    const total = sampler.buffer.n;
    if (total !== lastCount) {
      lastCount = total;
      lastGrowth = now;
    }

    ctx.write('samples', String(total));

    const main = longestSegment(segmentTimestamps(sampler.buffer.t, total));
    const jumps = main ? detectTrailJumps(sampler.buffer.x, sampler.buffer.y, main) : null;
    ctx.write('isolated', jumps ? String(jumps.isolated) : '—');

    if (now - lastGrowth > MOTION_DONE_MS) ctx.finish();
  });
  ctx.onCleanup(tick);
};

/**
 * 回报率。计数法:样本数 ÷ 时长。
 *
 * 卡里那个数**只能当下限** —— 每秒报文数 = 每秒移动的英寸数 × DPI,小框里
 * 推不开,推得越快越是下限。卡底的说明和正文都照实写了。
 */
const pollingMini: MiniFactory = (ctx) => {
  const sampler = createMoveSampler(ctx.surface, { capacity: MINI_CAPACITY, capture: true });
  ctx.onCleanup(() => sampler.destroy());

  const big = bigNumber(ctx.live);
  const captionNode = caption(ctx.live);
  big.textContent = '—';
  captionNode.textContent = '在框里来回快速移动';

  let lastCount = 0;
  let lastGrowth = performance.now();

  const tick = createTicker(300, (now) => {
    const total = sampler.buffer.n;
    if (total !== lastCount) {
      lastCount = total;
      lastGrowth = now;
    }

    // 只给计数类结论。这里的切段用的是默认阈值,和整页那一份完全同一套。
    const analysis = analyzeSegments(sampler.buffer.t, total);
    ctx.write('hz', analysis ? format(analysis.hz, 0) : '—');
    ctx.write('samples', String(total));
    big.textContent = analysis ? format(analysis.hz, 0) : '—';
    captionNode.textContent =
      analysis && analysis.segmentCount > 1 ? '中途停过,只算了最长的一段' : '小框里的下限';

    if (now - lastGrowth > MOTION_DONE_MS) ctx.finish();
  });
  ctx.onCleanup(tick);
};

/**
 * 每种装置一张表。漏一项 `typecheck` 就会报错(见文件头)。
 */
const DEVICES: Record<Exclude<MiniKind, null>, MiniDevice> = {
  buttons: { wake: ['pointerdown'], run: buttonsMini },
  'double-click': { wake: ['pointerdown'], run: doubleClickMini },
  cps: { wake: ['pointerdown'], run: cpsMini },
  hold: { wake: ['pointerdown'], run: holdMini },
  wheel: { wake: ['wheel'], run: wheelMini },
  trail: { wake: ['pointermove'], run: trailMini },
  polling: { wake: ['pointermove'], run: pollingMini },
};

// ---------------------------------------------------------------------------
// 驱动
// ---------------------------------------------------------------------------

/**
 * 给一张卡接上装置。`spec.kind === null` 的卡片(DPI / 加速度 / 键盘)直接返回:
 * 它们的装置槽里是一段说明,没有可接的东西。
 */
export function mountMiniCard(card: HTMLElement, spec: MiniCard): void {
  const found = card.querySelector<HTMLElement>('.mini-device');
  if (!found) return;
  /*
   * 收窄成一个不可空的常量。下面的函数是**声明式**的,TS 不会把上面这个守卫的
   * 结果带进它们的作用域 —— `renderer.ts` 里那个 `context` 是同一个问题。
   */
  const surface: HTMLElement = found;

  const kind = spec.kind;
  if (kind === null) {
    // 放不进卡片的那些(DPI / 加速度 / 键盘):装置槽里是一段说明,没有可接的
    // 东西。仍然打上标记 —— 三张卡的 `data-phase` 空着会让人以为挂载失败了。
    surface.dataset.phase = 'static';
    return;
  }

  const device = DEVICES[kind];

  /** 读数槽。按 `slug:key` 找,找不到就是签错了名 —— 静默不写,不报错 */
  const outputs = new Map<string, Element>();
  for (const readout of spec.readouts) {
    const node = card.querySelector(`[data-mini-out="${spec.slug}:${readout.key}"]`);
    if (node) outputs.set(readout.key, node);
  }

  /**
   * 方向带。格子由 `index.astro` 按 `readout.slots` 渲染好,这里只往上刷 `data-*`
   * —— 和读数槽一样按 `slug:key` 挂钩。
   */
  const traces = new Map<string, { host: HTMLElement; marks: TraceMark[] }>();
  for (const readout of spec.readouts) {
    if (readout.kind !== 'trace') continue;
    const host = card.querySelector<HTMLElement>(`[data-mini-trace="${spec.slug}:${readout.key}"]`);
    if (host) traces.set(readout.key, { host, marks: [] });
  }

  /**
   * 把一整段方向刷到带子上。**窗口取最右边那几格**,越靠右越新。
   *
   * 毛刺判据跑在**整段历史**上,不是跑在窗口里:窗口最右那一格在窗口内没有右邻,
   * 拿窗口算的话它永远标不上红。跑整段,一格被标红之后往左滚出窗口也不会变。
   */
  function paintTrace(trace: { host: HTMLElement; marks: TraceMark[] }): void {
    const cells = [...trace.host.children] as HTMLElement[];
    const flags = markScrollGlitches(trace.marks);
    // 负数表示左边还有几格是空的 —— 一开始整条都是空的
    const first = trace.marks.length - cells.length;
    cells.forEach((cell, index) => {
      const at = first + index;
      if (at < 0) {
        delete cell.dataset.mark;
        delete cell.dataset.glitch;
        return;
      }
      cell.dataset.mark = trace.marks[at];
      if (flags[at]) cell.dataset.glitch = 'true';
      else delete cell.dataset.glitch;
    });
  }

  /** 和 `write()` 一样:签错了名就静默不画。所以单测把 push 的键也一起扫。 */
  function pushMark(key: string, mark: TraceMark): void {
    const trace = traces.get(key);
    if (!trace) return;
    trace.marks.push(mark);
    paintTrace(trace);
  }

  const modes = spec.modes ?? [];
  let activeMode = defaultMiniMode(spec)?.key ?? null;

  let phase: Phase = 'idle';
  let cleanups: Array<() => void> = [];
  let settleTimer = 0;
  let live: HTMLElement | null = null;
  /** 正在唤醒装置的那一个事件对象,见 `MiniFactory` 和 `on()` */
  let seeding: Event | null = null;
  /**
   * 这个时刻之前,装置面上的交互**不许开局**。由工厂通过 `ctx.cooldown()` 设,
   * 理由见 `MiniContext.cooldown`。**挂在驱动上**:新的一轮会新建一个工厂,
   * 工厂自己记的任何状态都活不过这一次结算。
   */
  let lockUntil = 0;

  /*
   * 状态写在 `data-phase` 上。**没有 CSS 依赖它** —— 它是给验证用的:
   * 从外面看,一个装置"还没碰过"和"跑完停在那儿"长得一模一样(都是纸面 +
   * 虚线框),而这两件事在调试时结论相反。CDP 探针靠它读状态,不然只能靠猜。
   */
  surface.dataset.phase = phase;

  function runCleanups(): void {
    for (const fn of cleanups) fn();
    cleanups = [];
  }

  /** 空态那句话。模式可以覆盖卡片的 `prompt`,所以每次都要现取 */
  function promptText(): string {
    return modes.find((mode) => mode.key === activeMode)?.prompt ?? spec.prompt;
  }

  /** 把装置面换回空态那句话 */
  function showPrompt(): void {
    const node = document.createElement('p');
    node.className = 'mini-device__prompt';
    node.textContent = promptText();
    surface.replaceChildren(node);
  }

  function armSettle(ms: number, busy: boolean): void {
    window.clearTimeout(settleTimer);
    settleTimer = 0;
    if (busy) return; // 还按着,不判结束
    settleTimer = window.setTimeout(finish, ms);
  }

  function finish(): void {
    if (phase !== 'running') return;
    phase = 'done';
    surface.dataset.phase = phase;
    window.clearTimeout(settleTimer);
    settleTimer = 0;
    runCleanups();
    surface.classList.remove('well', 'mini-device--running');
    // 装置自己的画面**留着** —— 它就是这次的读数,清掉等于测得结果看不见了。
    // 框也回到虚线:那是"碰我开始测"这句话,而它随时可以重测。
  }

  /**
   * 回到空态。**换模式的时候用** —— 上一轮的数是在另一个口径下测出来的,
   * 留着就像"这个模式已经测过了",而它一次都没测。
   *
   * 和 `finish()` 的差别只有一处:读数也一并清掉。测量跑着的时候不换挡
   * (见下面模式按钮那个守卫),所以这里不必处理"跑了一半"。
   */
  function resetToIdle(): void {
    if (phase === 'running') return;
    runCleanups();
    window.clearTimeout(settleTimer);
    settleTimer = 0;
    live = null;
    for (const key of outputs.keys()) setText(outputs.get(key) ?? null, '—');
    for (const trace of traces.values()) {
      trace.marks.length = 0;
      paintTrace(trace);
    }
    surface.classList.remove('well', 'mini-device--running');
    showPrompt();
    phase = 'idle';
    surface.dataset.phase = phase;
  }

  function makeContext(): MiniContext {
    return {
      surface,
      live: live as HTMLElement,
      mode: activeMode,
      write(key, value) {
        setText(outputs.get(key) ?? null, value);
      },
      push(key, mark) {
        pushMark(key, mark);
      },
      on(target, type, fn, options) {
        /*
         * **seed 那个事件对象一律滤掉。** 工厂是拿 seed 显式处理的(见
         * `MiniFactory`),而浏览器会不会把同一个事件再送给刚挂上的监听
         * 是个不确定的事 —— 滤掉之后两种实现都恰好处理一次。
         *
         * 不清理这个比对:seed 是本次派发里那一个具体的对象,不会被再派发第二次,
         * 留着它同时也挡住了"同一次派发里被调用多轮"的其他可能。
         */
        const wrapped = (event: Event): void => {
          if (event === seeding) return;
          fn(event);
        };
        target.addEventListener(type, wrapped, options);
        cleanups.push(() => target.removeEventListener(type, wrapped, options));
      },
      onCleanup(fn) {
        cleanups.push(fn);
      },
      settleAfter(ms, busy = false) {
        armSettle(ms, busy);
      },
      cooldown(ms) {
        lockUntil = performance.now() + ms;
      },
      finish,
    };
  }

  function start(seed: Event): void {
    // 从 idle 或 done 进来都先回到干净的起点:上一次的监听、定时器、读数全部作废
    runCleanups();
    seeding = seed;
    window.clearTimeout(settleTimer);
    settleTimer = 0;

    for (const key of outputs.keys()) setText(outputs.get(key) ?? null, '—');

    for (const trace of traces.values()) {
      trace.marks.length = 0;
      paintTrace(trace);
    }

    live = div('mini-live');
    // 空态那句话连同它的虚线框一起让位。装置自己的画面接上来
    surface.replaceChildren(live);
    /*
     * `.well` 在**工厂跑之前**加上:装置里凡是"读一次 CSS 变量定颜色"的东西
     * (轨迹画布的 `--trail-color`)必须在仪器窗的令牌已经生效之后才去读,
     * 否则画出来的是纸面的颜色。
     */
    surface.classList.add('well', 'mini-device--running');
    phase = 'running';
    surface.dataset.phase = phase;

    device.run(makeContext(), seed);
  }

  const probe = (event: Event): void => {
    if (phase === 'running') return;
    /*
     * 结算冷却。这一段里手还在惯性连点,由着它开局的话刚出的成绩会被立刻抹掉
     * —— 和 CPS 那一页是同一条(`analysis.ts` 的 `RESTART_LOCK_MS`)。事件整个
     * 吞掉,不是"忽略这一次计数":连开局都不该开。
     */
    if (performance.now() < lockUntil) return;
    start(event);
  };
  for (const type of device.wake) {
    /*
     * 捕获阶段:保证探针比页面自己的任何手势代码先跑。
     * 不声明 `passive` —— 滚轮那条要 `preventDefault()` 阻止页面跟着滚,
     * 而被动监听里调的 `preventDefault()` 会被浏览器直接忽略。
     */
    surface.addEventListener(type, probe, { capture: true });
  }

  /*
   * 模式开关。**装在卡片上,不是装置面上** —— 它落在描述和装置面之间,和
   * `trail-test` 的模式行一样在测试区**外面**。这正是它不会顺手开测的原因:
   * 探针长在装置面上,按钮是它的兄弟节点,点按钮不经过探针。
   *
   * 选中态交给全局的 `button[aria-pressed='true']`(双击页 `.target`、CPS 页
   * `.duration` 同一套),这里只管按下时改哪个属性。
   */
  for (const button of card.querySelectorAll<HTMLElement>('[data-mini-mode]')) {
    // 属性写的是 `slug:key`(和读数槽同一个挂钩方式)。slug 里没有冒号
    const key = button.dataset.miniMode?.split(':')[1] ?? '';
    if (!key) continue;
    button.setAttribute('aria-pressed', key === activeMode ? 'true' : 'false');
    button.addEventListener('click', () => {
      // 跑着的时候换挡会让这一轮的读数前后对不上号,直接不认
      if (phase === 'running' || key === activeMode) return;
      activeMode = key;
      for (const mode of modes) {
        card
          .querySelector(`[data-mini-mode="${spec.slug}:${mode.key}"]`)
          ?.setAttribute('aria-pressed', mode.key === key ? 'true' : 'false');
      }
      resetToIdle();
    });
  }
}
