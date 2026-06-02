import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    name: 'main',
    environment: 'node',
    setupFiles: ['./vitest.setup.main.ts'],
    clearMocks: true,
    include: [
      '**/*.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/release/**',
      'src/apps/renderer/**',
      'src/apps/backups/**',
      '**/*.test.tsx',
    ],
    watch: false,
    globals: true,
    env: {
      NEW_CRYPTO_KEY: 'test-crypto-key-for-vitest',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/main',
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
      // Redirect electron to a stub so electron/index.js never runs its binary
      // check (module.exports = getElectronPath() throws at load time if the
      // binary is absent, which breaks test collection before vi.mock applies).
      electron: path.resolve(__dirname, './src/__mocks__/electron.ts'),
    },
  },
});
