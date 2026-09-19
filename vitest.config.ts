import { defineConfig } from 'vitest/config';

/**
 * 只测 src/lib/analysis.ts 这一层纯函数。
 *
 * 采样层和渲染层需要真实浏览器与真实鼠标硬件,塞进单测只会测到 mock 的行为,
 * 不如不测——它们的正确性靠真机手测(见计划文件的验证章节)。
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
