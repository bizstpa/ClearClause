/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // Project page on GitHub Pages is served from /ClearClause/; keep dev at /.
  base: command === 'build' ? '/ClearClause/' : '/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
