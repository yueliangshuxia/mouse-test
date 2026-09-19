import { defineConfig } from 'vitest/config';

/**
 * 只测**纯**的那一层:统计与判据(`analysis.ts`)、两张表和翻译
 * (`mouse-buttons.ts`、`mini-cards.ts`)。都在 `tests/` 下。
 *
 * 采样层和渲染层需要真实浏览器与真实鼠标硬件,塞进单测只会测到 mock 的行为,
 * 不如不测——它们的正确性靠真机手测(见 CLAUDE.md 的验证顺序那一节)。
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
