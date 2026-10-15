/**
 * English copy.
 *
 * **`en` is declared as `Catalog`(= `typeof zh`), and that is the whole mechanism.**
 * 漏一个键、拼错一个键、多出一个键,都是 `npm run typecheck` 直接红 ——
 * 不是英文版上静默少一句话。这一层值钱的机制就这一条。
 *
 * ## `navLabel` 要挑短的,理由在报头
 *
 * 报头那一排的宽度是**量出来的**,而折叠边界就建在那笔账上(见
 * `tools.ts` 末尾)。**英文短名天然比中文宽得多** —— 「按键」两个字的宽度
 * 大约等于 "Buttons" 的六成。所以英文版会**比中文版更早开始折叠**,
 * 那是预期的,不是坏了(折叠本身是自纠正的,一项一项搬直到装下)。
 *
 * 挑名字时按"能不能短"排序取:`Buttons` 而不是 `Button test`,`Accel`
 * 而不是 `Acceleration`,`Polling` 而不是 `Polling rate`。
 */

import type { Catalog } from './zh';
import { buttonEn } from './pages/button';
import { cpsEn } from './pages/cps';
import { dpiEn } from './pages/dpi';
import { holdDragEn } from './pages/holdDrag';
import { scrollEn } from './pages/scroll';
import { doubleClickEn } from './pages/doubleClick';
import { pollingEn } from './pages/polling';
import { homeEn } from './pages/home';
import { deadPixelEn } from './pages/deadPixel';
import { doodleEn } from './pages/doodle';
import { sensitivityEn } from './pages/sensitivity';
import { accelerationEn } from './pages/acceleration';
import { keyboardEn } from './pages/keyboard';
import { reactionEn } from './pages/reaction';
import { aimEn } from './pages/aim';
import { steadinessEn } from './pages/steadiness';
import { trailEn } from './pages/trail';
import { refreshEn } from './pages/refresh';
import { toolboxEn } from './pages/toolbox';

export const en: Catalog = {
  common: {
    brand: 'Mouse Test',
    navAria: 'Tool navigation',
    more: 'More',
    themeGroupAria: 'Color theme',
    themeToLight: 'Switch to light',
    themeToDark: 'Switch to dark',
    langGroupAria: 'Language',
    langMissing: 'This page has no English version yet',
  },

  confidence: {
    exact: 'Measured directly',
    estimate: 'Estimated',
    shape: 'Shape only',
    direction: 'Direction only',
    none: 'Not a measurement',
  },

  tools: {
    'button-test': { name: 'Mouse button / wheel / hold / double-click test', navLabel: 'Buttons' },
    'hold-drag-test': { name: 'Mouse hold & drag test', navLabel: 'Drag' },
    'double-click-test': { name: 'Mouse double-click test', navLabel: 'Double' },
    'scroll-test': { name: 'Mouse wheel test', navLabel: 'Wheel' },
    'cps-test': { name: 'Mouse CPS click speed test', navLabel: 'CPS' },
    'trail-test': { name: 'Mouse trail test', navLabel: 'Trail' },
    'polling-rate-test': { name: 'Mouse polling rate test', navLabel: 'Polling' },
    'dpi-test': { name: 'Mouse DPI test', navLabel: 'DPI' },
    'acceleration-test': { name: 'Mouse acceleration test', navLabel: 'Accel' },
    'keyboard-test': { name: 'Keyboard key test', navLabel: 'Keyboard' },
    'steadiness-test': { name: 'Mouse steadiness challenge', navLabel: 'Steady' },
    'reaction-test': { name: 'Mouse reaction time test', navLabel: 'Reaction' },
    'aim-test': { name: 'Mouse aim test', navLabel: 'Aim' },
    'doodle-test': { name: 'Mouse doodle pad', navLabel: 'Doodle' },
    'sensitivity-converter': { name: 'Mouse sensitivity converter', navLabel: 'Converter' },
    'dead-pixel-test': { name: 'Screen dead pixel check', navLabel: 'Dead pixel' },
    'refresh-visual-test': { name: 'Refresh rate visual test', navLabel: 'Refresh' },
    toolbox: { name: 'Mouse toolbox', navLabel: 'Toolbox' },
    'mouse-repair': { name: 'Mouse repair', navLabel: 'Repair' },
  },

  quality: {
    'duplicate-poor':
      'More than half the reports share a timestamp ({ratio}%) — the current timer resolution cannot resolve this mouse’s polling period, so treat the reading as a floor.',
    'duplicate-fair':
      '{ratio}% of reports share a timestamp with a neighbour; the timer resolution is close to its limit.',
    'out-of-order-poor': '{ratio}% of samples have timestamps that run backwards; the data is not trustworthy.',
    'out-of-order-fair': '{count} samples have out-of-order timestamps, usually from the driver or OS scheduling.',
    'duration-poor': 'The usable stretch is only {ms}ms — too short for the statistics to mean anything.',
    'duration-fair': 'Usable stretch is {seconds}s; draw circles for at least 3 seconds before reading.',
  },

  buttons: {
    '0': { name: 'Left', note: 'Primary' },
    '1': { name: 'Middle', note: 'Wheel click' },
    '2': { name: 'Right', note: 'Secondary' },
    '3': { name: 'Side 4', note: 'Back' },
    '4': { name: 'Side 5', note: 'Forward' },
    unknown: { name: 'Button {code}', note: '' },
  },

  chrome: {
    /* 「测试数据」而不是「数据」—— 页面会报一个不认人的浏览计数,见 zh.ts 那条注释 */
    footerPrivacy: 'Every test runs locally in your browser — no test data is uploaded.',
    footerRecommend: 'Desktop Chrome or Edge gives the most accurate readings.',
    footerRepair: '— the test tools and this repair service come from the same person.',
    /* 后台只有中文版,所以这条链接通向中文登录页 */
    footerLogin: 'Admin sign-in',
    dockTitle: 'Mouse repair',
    dockWechat: 'WeChat',
    dockTaobao: 'Taobao',
    dockQrPlaceholder: 'QR code',
    dockNote: 'Mouse acting up? Get in touch.',
  },

  pages: {
    cps: cpsEn,
    home: homeEn,
    button: buttonEn,
    dpi: dpiEn,
    polling: pollingEn,
    holdDrag: holdDragEn,
    scroll: scrollEn,
    doubleClick: doubleClickEn,
    doodle: doodleEn,
    deadPixel: deadPixelEn,
    sensitivity: sensitivityEn,
    acceleration: accelerationEn,
    keyboard: keyboardEn,
    reaction: reactionEn,
    aim: aimEn,
    steadiness: steadinessEn,
    trail: trailEn,
    refresh: refreshEn,
    toolbox: toolboxEn,
  },
};
