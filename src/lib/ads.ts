/**
 * 广告位:槽位清单 + 按权重挑选。**纯函数,不碰数据库、不碰 DOM。**
 *
 * ## 槽位清单为什么是一个模块而不是一个字符串数组
 *
 * 它是**三个地方共用的同一个值**:后台的增删改表单(下拉框)、公开页面上那个
 * `AdSlot` 组件(告诉接口我要哪个槽位)、以及 `admin-form.ts` 的校验(表单里
 * 递上来的槽位合不合法)。三处各抄一份的话,加一个新槽位时漏掉一处是**静默**
 * 的 —— 表单里选得到、页面上却没有;这和 `mouse-buttons.ts` / `keyboard-layout.ts`
 * 是同一个理由。
 *
 * ## 槽位只有两个,而且都是"不出故障判定的位置"
 *
 * 首页与工具箱页。**诊断工具页刻意不挂** —— CLAUDE.md 里那条硬规矩是
 * 「故障判定区永远不出现服务信息」:用户看到"检测到故障"旁边就是维修入口,
 * 第一反应是"它是不是想卖我东西",而全站的信誉正建立在这类判断不被怀疑上。
 * 往这张表里加槽位之前,先回去读那一条。
 */

/** 槽位的**键**(进数据库、进 URL)与**给人看的名字**(后台表单、图例)。 */
export const AD_SLOTS = {
  home: '首页',
  toolbox: '工具箱',
} as const;

export type AdSlot = keyof typeof AD_SLOTS;

/** 稳定的槽位顺序 —— 后台表单与看板都按它排,免得两次渲染顺序不一样。 */
export const AD_SLOT_KEYS: readonly AdSlot[] = Object.keys(AD_SLOTS) as AdSlot[];

export function isAdSlot(value: unknown): value is AdSlot {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(AD_SLOTS, value);
}

/** 一条广告。字段和 `ads` 表一一对应。 */
export interface AdRecord {
  id: number;
  slot: AdSlot;
  title: string;
  body: string;
  url: string;
  weight: number;
  active: boolean;
}

/**
 * 按权重随机挑一条。**`rng` 是注入的** —— 不写死 `Math.random()`,单测才能
 * 拿一段确定的序列把边界(第一段、最后一段、刚好落在分界上)全部钉住。
 * 这和 `analysis.ts` 里那些纯函数是一个写法:随机性留在调用方,判断留在纯层。
 *
 * **入参先过一遍筛**:只有 `active` 且 `weight > 0` 的参与。权重 0 的意思是
 * "这一条不参与轮播"(后台表单不允许填 0,但表里的老数据可能是 0),所以它
 * 不该让分母变大、也不该被选中。
 *
 * 全都不合格时返回 `null` —— 调用方据此**整块不渲染**。这正是全站那条
 * 「没数据不画空槽」:一个空的广告框会被读成"这里坏了"。
 */
export function pickAd(ads: readonly AdRecord[], rng: () => number = Math.random): AdRecord | null {
  const pool = ads.filter((ad) => ad.active && ad.weight > 0);
  if (pool.length === 0) return null;

  const total = pool.reduce((sum, ad) => sum + ad.weight, 0);
  let ticket = rng() * total;

  for (const ad of pool) {
    ticket -= ad.weight;
    // `< 0` 让"刚好落在分界上"归给前一段;`rng()` 理论上取不到 1,但真取到 1 时
    // 循环会走完,最后那一条靠下面这个兜底返回 —— 越界在这里是无声的,所以要挡
    if (ticket < 0) return ad;
  }
  return pool[pool.length - 1] ?? null;
}
