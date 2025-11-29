import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    name: 'renderer',
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.renderer.ts'],
    include: ['src/apps/renderer/**/*.test.{ts,tsx}'],
    watch: false,
    exclude: [
      '**/node_modules/**',
      '**/release/**',
    ],
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/release/**',
        '**/tests/**',
        '**/*.test.{ts,tsx}',
        '**/__mocks__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Mock file assets (images, fonts, etc.)
      '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
        path.resolve(__dirname, './.erb/mocks/fileMock.js'),
      // Mock CSS modules
      '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    },
  },
});
