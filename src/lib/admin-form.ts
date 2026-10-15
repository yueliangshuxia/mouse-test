/**
 * 后台表单的解析与校验。**纯函数** —— 所以单测能把它逐条钉住,不需要起点一个
 * HTTP 请求,也不需要数据库。
 *
 * ## 文案是中文的,而且不住在目录里
 *
 * 后台与 `/login` **只有中文**(和 `/mouse-repair/` 同一个先例,理由写在
 * CLAUDE.md「后台不双语」那一节),所以这里的提示语直接写成字面量。
 * `src/lib/i18n/` 那套是给"全站两套语言"用的,后台不进那个体系。
 *
 * ## 校验放在这一层,而不是放进接口里
 *
 * 接口那一层只做三件事:解析、调这里、把 `{ ok: false }` 转成一句人能读的话。
 * 判断如果散进各个 `POST` 处理器里,会有两个后果:一是没法单测(要起服务器),
 * 二是**同一条规则在两个接口里写得不一样** —— 比如"用户名校验"在"建账号"和
 * "改账号"里各写一份,迟早放宽了其中一处。
 */

import { AD_SLOTS, isAdSlot, type AdSlot } from './ads';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const USERNAME_MIN = 3;
const USERNAME_MAX = 32;
const PASSWORD_MIN = 8;
/**
 * 上限取 72 —— 不是 scrypt 的限制(scrypt 不截断),而是**防止有人拿一个几 MB
 * 的字符串来打登录接口**。每一分钱的计算量都是服务器出的。
 */
const PASSWORD_MAX = 72;
const AD_TITLE_MAX = 80;
const AD_BODY_MAX = 200;
const AD_URL_MAX = 500;
const AD_WEIGHT_MAX = 100;

/** 用户名字符集刻意收窄:登录名要能手打、能贴、能在 URL 里带上而不必转义。 */
const USERNAME_PATTERN = /^[A-Za-z0-9_-]+$/;

export function parseUsername(raw: unknown): Parsed<string> {
  const value = String(raw ?? '').trim();
  if (value.length < USERNAME_MIN) return { ok: false, error: `用户名至少 ${USERNAME_MIN} 个字符` };
  if (value.length > USERNAME_MAX) return { ok: false, error: `用户名最多 ${USERNAME_MAX} 个字符` };
  if (!USERNAME_PATTERN.test(value)) {
    return { ok: false, error: '用户名只能用字母、数字、下划线和连字符' };
  }
  return { ok: true, value };
}

/**
 * 口令**只校验长度,不校验复杂度**。
 *
 * 强行要求"必须含大写 + 数字 + 符号"这类规则会把用户推向 `Password1!` 这种
 * 最好猜的口令,而真正的防线是 scrypt 的计算成本加上那个防爆破锁。这条判断
 * 是有意的,不是漏做。
 */
export function parsePassword(raw: unknown): Parsed<string> {
  const value = String(raw ?? '');
  if (value.length < PASSWORD_MIN) return { ok: false, error: `密码至少 ${PASSWORD_MIN} 位` };
  if (value.length > PASSWORD_MAX) return { ok: false, error: `密码最多 ${PASSWORD_MAX} 位` };
  return { ok: true, value };
}

export function parseSlot(raw: unknown): Parsed<AdSlot> {
  if (!isAdSlot(raw)) {
    return { ok: false, error: `位置只能是:${Object.values(AD_SLOTS).join(' / ')}` };
  }
  return { ok: true, value: raw };
}

/**
 * 链接必须是**绝对 http/https 地址**。
 *
 * 这一条不是格式洁癖:`javascript:` 和 `data:` 开头的链接挂在页面上就是一个
 * **点击即执行**的入口 —— 而且它会以本站的名义出现(广告卡片长在站内)。
 * 用 `new URL()` 解析而不是正则:协议的大小写、前导空白、以及 `http:\\` 这种
 * 反斜杠写法,正则很难穷尽,而 `URL` 是规范实现。
 */
export function parseHttpUrl(raw: unknown): Parsed<string> {
  const value = String(raw ?? '').trim();
  if (value.length === 0) return { ok: false, error: '链接不能为空' };
  if (value.length > AD_URL_MAX) return { ok: false, error: `链接最多 ${AD_URL_MAX} 个字符` };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: '链接要以 http:// 或 https:// 开头' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: '链接只能是 http 或 https' };
  }
  /*
   * 存的是**规范化之后**的地址(`parsed.href`),不是管理员敲进去的那一串。
   *
   * 理由:存进去的那个串最终会被渲染成 `<a href>`,而**解析它的浏览器和我们这个
   * `new URL()` 未必一样宽**。存原串就等于把"我们验过的那串"和"浏览器要走的那串"
   * 分成两个东西 —— 那类分歧正是开放重定向和协议绕过生长的缝隙。存 `href` 之后
   * 两个是同一个值,这类问题不存在。
   *
   * 代价是存进去的长相可能和敲进去的不一样(`https://example.com` 会补成 .../`,
   * 大写协议会变小写)。那是**对的**:表单里显示的应该是实际会被访问的地址。
   */
  return { ok: true, value: parsed.href };
}

function parseText(raw: unknown, label: string, max: number): Parsed<string> {
  const value = String(raw ?? '').trim();
  if (value.length === 0) return { ok: false, error: `${label}不能为空` };
  if (value.length > max) return { ok: false, error: `${label}最多 ${max} 个字符` };
  return { ok: true, value };
}

export function parseWeight(raw: unknown): Parsed<number> {
  const text = String(raw ?? '').trim();
  // `Number('')` 是 0、`Number('  ')` 也是 0 —— 空输入会被当成"权重 0",
  // 而 0 的意思是"不参与轮播",那不是管理员填了个空格的意图。所以先挡空串。
  if (text.length === 0) return { ok: false, error: '权重不能为空' };
  const value = Number(text);
  if (!Number.isInteger(value)) return { ok: false, error: '权重必须是整数' };
  if (value < 1) return { ok: false, error: '权重至少是 1' };
  if (value > AD_WEIGHT_MAX) return { ok: false, error: `权重最多是 ${AD_WEIGHT_MAX}` };
  return { ok: true, value };
}

export interface AdInput {
  slot: AdSlot;
  title: string;
  body: string;
  url: string;
  weight: number;
}

/**
 * 把一张表单的原始字段收成一条广告。**按固定顺序逐项校验,第一条不过就返回**,
 * 所以每次给的是同一条提示 —— 随机的报错顺序会让人以为"改了这个又错那个"。
 */
export function parseAdInput(form: Record<string, unknown>): Parsed<AdInput> {
  const slot = parseSlot(form.slot);
  if (!slot.ok) return slot;

  const title = parseText(form.title, '标题', AD_TITLE_MAX);
  if (!title.ok) return title;

  const body = parseText(form.body, '说明', AD_BODY_MAX);
  if (!body.ok) return body;

  const url = parseHttpUrl(form.url);
  if (!url.ok) return url;

  const weight = parseWeight(form.weight);
  if (!weight.ok) return weight;

  return {
    ok: true,
    value: { slot: slot.value, title: title.value, body: body.value, url: url.value, weight: weight.value },
  };
}
