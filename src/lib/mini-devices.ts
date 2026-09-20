/**
 * 首页卡片里的"小装置"。
 *
 * 一个**薄驱动** + 每种工具一个工厂。驱动只管四件事,和具体工具一概无关:
 *
 * 1. **惰性挂载** —— 卡片插进页面时**一个装置都不建**。装置面上挂着一组探针
 *    事件(哪种事件由 `DEVICES[kind].wake` 声明),用户第一次碰到它才调工厂。
 *    这一条不是优化:采样器的默认容量是 120000 条 × 17 字节 ≈ 2MB 一份,首页
 *    八张卡里有一半挂着采样器,全建起来就是十几 MB —— 而首页大部分人只是路过。
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
// 五个装置
// ---------------------------------------------------------------------------

/**
 * 鼠标的俯视图。五个可亮的部分各带一个 `data-mb`,值是**本站编号**
 * (见 `mouse-buttons.ts`:0 左 / 1 中 / 2 右 / 3 侧键4 / 4 侧键5)。
 *
 * 编号既是 `event.button`、又是本站位掩码里的位序,所以 `sync()` 里
 * `mask & (1 << code)` 和 `[data-mb="${code}"]` 说的是同一个键,不需要换算。
 *
 * **这是个固定字面量**,没有任何用户数据拼进来,所以走 `innerHTML` 是安全的。
 * 它**只能**在 `ctx.live` 里造出来 —— `start()` 会 `surface.replaceChildren(live)`,
 * 页面渲染进去的东西一开测就被抹掉。因此它的样式也**只能**在 `global.css`:
 * 运行期 `createElement` 出来的节点拿不到页面 `<style>` 的 `data-astro-cid`。
 *
 * ## 那两支滚轮箭头
 *
 * 滚轮**没有**自己的读数槽,方向就画在这张图上:轮子亮起来,箭头指出朝哪边。
 * 参考图(另一家的「按键与滚轮」)就是这套说法,而且它比一个 `↓` 字符更值 ——
 * 读数行那四格留给数,方向本来就不是有量纲的东西。
 *
 * **两条 path 都常驻,靠 `.mini-mouse[data-wheel]` 选中其中一条显示**(默认
 * `opacity: 0`)——和 `[data-mb]` 那五个部件同一套"数据在属性上、长相在
 * `global.css` 里"的分工,不靠增减节点。没滚过就什么都不亮,这是全站
 * "没数据不画空槽"的同一条。
 *
 * 两支箭头各 8×8,一上一下:**上箭头在轮子上方(y 8–16)、下箭头跨在按键分缝上
 * (y 38–46,分缝在 y=44)** —— 下半身那点空间只有 8 个单位,而跨分缝正好是参考图
 * 里那支下箭头的长相。viewBox 一个单位都没动,所以那几个量出来的高度
 * (`.mini-mouse` 的 88 / 126 / 52)全部照旧。
 */
const MOUSE_SVG = `
<svg class="mini-mouse" viewBox="2 2 52 88" aria-hidden="true" focusable="false">
  <rect class="mini-mouse__body" x="12" y="4" width="40" height="84" rx="14" />
  <path class="mini-mouse__part" data-mb="0" d="M32 4 L26 4 A14 14 0 0 0 12 18 L12 44 L32 44 Z" />
  <path class="mini-mouse__part" data-mb="2" d="M32 4 L38 4 A14 14 0 0 1 52 18 L52 44 L32 44 Z" />
  <rect class="mini-mouse__part mini-mouse__wheel" data-mb="1" x="28.5" y="20" width="7" height="16" rx="3.5" />
  <rect class="mini-mouse__part" data-mb="3" x="4" y="38" width="10" height="13" rx="3" />
  <rect class="mini-mouse__part" data-mb="4" x="4" y="56" width="10" height="13" rx="3" />
  <path class="mini-mouse__wheel-arrow" data-wheel-dir="up" d="M32 8 L28 16 L36 16 Z" />
  <path class="mini-mouse__wheel-arrow" data-wheel-dir="down" d="M32 46 L28 38 L36 38 Z" />
</svg>`;

/**
 * 按键 / 滚轮 / 长按 / 双击 —— 首页并成一张卡的那台装置。
 *
 * 四样一起出:**逐键计数**(鼠标图上按哪瓣亮哪瓣,下面一排 chip 显示各自的次数)、
 * **双击间隔**、**按住秒数**,以及**滚轮方向**(轮子亮起来 + 箭头上/下)。
 * 四件事都是由"手上那一下"唤起、由同一条空闲判据结束的(停手 1.2 秒),
 * 所以这张卡**没有模式行** —— 仓库里那条判据是"模式存在的理由从来不是换个数字
 * 看看,而是结束的条件真的不一样"。凑数的模式不该加。
 *
 * **滚轮只给方向,不给格数、不给带子。** 方向是滚动唯一无需任何假设的那一位;
 * 格数要经过 `normalizeWheelDelta` 那层启发式换算,而"最近 N 次"是一条要占一行
 * 读数区的带子 —— 两样都留在「滚轮」那一页,那张卡照旧存在。这里给的是
 * 鼠标图上的箭头,和参考图同一套说法。
 *
 * **长按那一页的头号数字(疑似瞬断)刻意不上这张卡。** 它要拖满一整段才判得出
 * 形状,120px 里出不来。卡片小注里说破这一点并指向那一页。
 *
 * 三个坑照抄旧实现,别"优化":
 *
 * - **组合键只能逐位 diff `event.buttons` 的位掩码。** `pointerdown` 只在"从无键
 *   到有键"时派发一次,`pointerup` 只在**最后一个键**松开时派发,中间那几次
 *   按下/松开全都走 `pointermove`。用 `event.button` 会漏掉它们。
 * - **双击间隔取 `event.timeStamp`,按住秒数取 `performance.now()`。** 前者量的
 *   是**两个事件之间**(浏览器会把攒在一起的事件放进同一个任务里派发,那一刻两个
 *   处理函数里的 `performance.now()` 会塌到 0,一次正常双击会被报成 0 毫秒);
 *   后者量的是一段**墙钟**(按住不动不产生任何事件,只有墙钟知道过了多久)。
 * - **松手的判据是 `event.buttons === 0`,不是"收到了 pointerup"。**
 */
const mouseButtonsMini: MiniFactory = (ctx, seed) => {
  let mask = 0;
  let presses = 0;

  /** 每个键上一次按下的时刻。**按编号分开记** —— 左键点一下再用右键点一下,
   *  这两个事件之间的差没有意义,混在一起会凭空造出一个"间隔"。 */
  const lastByButton = new Map<number, number>();
  /** 每个键累计按过几次。chip 上那个数就是它 */
  const counts = new Map<number, number>();

  // ---- 鼠标图 ----
  const holder = document.createElement('div');
  holder.innerHTML = MOUSE_SVG;
  const mouse = holder.firstElementChild as SVGElement;
  ctx.live.appendChild(mouse);

  const parts = new Map<number, Element>();
  for (const node of mouse.querySelectorAll('[data-mb]')) {
    parts.set(Number(node.getAttribute('data-mb')), node);
  }

  // ---- 一排 chip ----
  const row = div('mini-live__row');
  ctx.live.appendChild(row);

  const chips = new Map<number, { chip: HTMLElement; count: HTMLElement }>();
  for (const button of BUTTONS) {
    const chip = div('mini-chip');
    chip.dataset.mb = String(button.code);
    chip.appendChild(document.createTextNode(button.name));

    const count = document.createElement('i');
    count.className = 'mini-chip__n';
    /*
     * 计数**从 0 开始**,不用破折号 —— 这是刻意的,和全站那条规矩不冲突:
     * 那一条说的是"**算不出来**才给破折号",而这里是真数出来的 0。
     * (同一张卡上的 `holding` / `gap` / `held` 开头是破折号,那是"此刻还没有"。)
     */
    count.textContent = '0';

    chip.appendChild(count);
    row.appendChild(chip);
    chips.set(button.code, { chip, count });
  }

  // ---- 按住计时 ----
  let holding = false;
  let heldSince = 0;

  const tick = createTicker(80, () => {
    if (!holding) return;
    ctx.write('held', format((performance.now() - heldSince) / 1000, 1));
  });
  ctx.onCleanup(tick);

  function beginHold(): void {
    if (holding) return;
    holding = true;
    heldSince = performance.now();
  }

  function endHold(): void {
    if (!holding) return;
    holding = false;
    ctx.write('held', format((performance.now() - heldSince) / 1000, 1));
  }

  function sync(): void {
    const down: string[] = [];
    for (const button of BUTTONS) {
      const pressed = (mask & (1 << button.code)) !== 0;
      // 写 'true' / 'false' 而不是增删属性:属性一增一删会多一次样式重算,
      // 而这条路径挂在 pointermove 上。
      parts.get(button.code)?.setAttribute('data-down', pressed ? 'true' : 'false');
      chips.get(button.code)?.chip.classList.toggle('mini-chip--down', pressed);
      if (pressed) down.push(button.name);
    }
    ctx.write('presses', String(presses));
    // 「当前按着」为空时给破折号而不是 0:这不是"算不出来",是"此刻没有"。
    // 全站的破折号在两种场合都用,这里是后一种。
    ctx.write('holding', down.length > 0 ? down.join(' + ') : '—');
  }

  /** 一次按下。`stamp` 是 `event.timeStamp` —— 见上面那段"两个事件之间" */
  function press(code: number, stamp: number): void {
    presses++;

    const entry = chips.get(code);
    if (entry) {
      const times = (counts.get(code) ?? 0) + 1;
      counts.set(code, times);
      entry.count.textContent = String(times);
    }

    const previous = lastByButton.get(code);
    lastByButton.set(code, stamp);
    if (previous === undefined) return;

    const gap = stamp - previous;
    ctx.write('gap', format(gap, 0));
    // 触点抖动标在**那个键的计数**上(参考图里也是计数在变色),不是另起一行字
    entry?.count.classList.toggle('mini-chip__n--chatter', classifyClickGap(gap) === 'chatter');
  }

  function handle(event: PointerEvent): void {
    const next = maskFromButtons(event.buttons);
    if (next !== mask) {
      eachButtonEdge(mask, next, (code, isDown) => {
        if (isDown) press(code, event.timeStamp);
      });
      mask = next;
      if (mask !== 0) {
        beginHold();
        // 拖出框外还要收得到 pointerup,否则掩码会一直卡在"按着"
        try {
          ctx.surface.setPointerCapture(event.pointerId);
        } catch {
          /* 已在捕获状态 */
        }
      } else {
        endHold();
      }
      sync();
    }
    ctx.settleAfter(IDLE_DONE_MS, mask !== 0);
  }

  /**
   * 强制收手。`pointercancel`(设备被拔掉、手势被系统接管)和 `blur`
   * (切走标签页)都**报不了松开**,但按键确实已经不在手上了 —— 不兜住的话
   * 掩码会一直卡在"按着"、秒数会一直涨下去,看起来像卡死。
   */
  function forceRelease(): void {
    if (mask !== 0) {
      mask = 0;
      sync();
    }
    endHold();
    ctx.settleAfter(IDLE_DONE_MS);
  }

  /**
   * 滚轮朝哪边。`''` 是"这一轮还没滚过" —— 图上什么都不亮。
   *
   * 状态只活这一次测量:鼠标图是工厂每次开测新建的,`wheelDir` 也随工厂重建。
   * 所以这里不写清除逻辑,`finish()` 之后那个方向**留着**是对的 ——
   * 和"按过的键还亮着"同一件事,它就是这一轮的读数。
   */
  let wheelDir: '' | 'up' | 'down' = '';

  function onWheel(event: WheelEvent): void {
    // 不拦的话页面会跟着滚,装置面从指针底下溜走 —— 和「滚轮」那一页同一条理由,
    // 那边量滚动时记的正是这件事,在卡片上是纯污染。所以要 `passive: false`。
    event.preventDefault();

    const step = normalizeWheelDelta(event.deltaY, event.deltaMode);
    // 零位移的那一次没有方向,不翻状态(`summarizeScroll` 也跳过它,两个口径一致)
    if (step !== 0) {
      wheelDir = step > 0 ? 'down' : 'up';
      mouse.dataset.wheel = wheelDir;
    }
    ctx.settleAfter(IDLE_DONE_MS, mask !== 0);
  }

  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointerleave']) {
    ctx.on(ctx.surface, type, handle as EventListener);
  }
  ctx.on(ctx.surface, 'pointercancel', forceRelease as EventListener);
  ctx.on(window, 'blur', forceRelease);
  // 滚轮也在这张卡上(`DEVICES` 的 wake 里两条都有),但判据和上面四条完全不同:
  // 滚动**不产生 `buttons` 的边沿**,它只翻方向,不进 `mask`、不动计数。
  ctx.on(ctx.surface, 'wheel', onWheel as EventListener, { passive: false });

  // 开局先清一遍:读数行不在装置面里(`replaceChildren` 换不掉它),
  // 上一轮留下的数会一直挂在那儿,不写就等于"这一轮已经测出来了"。
  ctx.write('gap', '—');
  ctx.write('held', '—');
  sync();

  // 唤醒它的那一次交互就是第一次,不补这一下会白丢一次。
  // seed 是两条路里的一条:按下唤起的就是第一次按下,滚轮唤起的就是第一次滚动。
  if (seed instanceof WheelEvent) onWheel(seed);
  else {
    const pointer = asPointer(seed);
    if (pointer) handle(pointer);
  }
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
  /*
   * 两条 wake **都要**:这张卡上滚轮也是一等公民,只挂 `pointerdown` 的话
   * 空态下滚滚轮什么都不会发生 —— 而"空态"正是它第一次被用到的样子。
   * (`wheel` 加进来的代价只有一条:卡片装置面上的滚动不再带动页面,那是想要的。)
   */
  'mouse-buttons': { wake: ['pointerdown', 'wheel'], run: mouseButtonsMini },
  cps: { wake: ['pointerdown'], run: cpsMini },
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
