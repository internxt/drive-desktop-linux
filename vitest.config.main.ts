import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    name: 'main',
    environment: 'node',
    setupFiles: ['./vitest.setup.main.ts'],
    include: [
      '**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/release/**',
      'src/apps/renderer/**',
      '**/*.test.tsx',
    ],
    watch: false,
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/release/**',
        '**/tests/**',
        '**/*.test.ts',
        '**/__mocks__/**',
        'src/apps/renderer/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
