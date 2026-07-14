import 'reflect-metadata';
import { vi } from 'vitest';

// electron is aliased to src/__mocks__/electron.ts in vitest.config.main.ts so
// electron/index.js never runs its binary check during module collection.

// Mock electron-log (depends on electron)
vi.mock('electron-log', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    transports: {
      file: { level: 'info' },
      console: { level: 'info' },
    },
  },
}));

// Mock the specific setup-electron-log module that's causing issues.
// Must use the build/ path since that's the compiled module actually required at runtime.
vi.mock('@internxt/drive-desktop-core/build/backend/core/logger/setup-electron-log', () => ({}));

// Keep real backend exports to avoid breaking value objects in many suites.
vi.mock('@internxt/drive-desktop-core/build/backend', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@internxt/drive-desktop-core/build/backend')>();

  return {
    ...actual,
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
    PaymentsModule: {
      ...actual.PaymentsModule,
      getUserAvailableProducts: vi.fn(),
    },
  };
});

vi.mock('@internxt/drive-desktop-core/src/backend', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@internxt/drive-desktop-core/src/backend')>();

  return {
    ...actual,
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  };
});

// Mock electron-store
vi.mock('electron-store', () => {
  return {
    default: vi.fn(function ElectronStoreMock() {
      return {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      };
    }),
  };
});

// Mock axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: {
      request: {
        use: vi.fn(),
      },
      response: {
        use: vi.fn(),
      },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
    create: vi.fn(() => mockAxiosInstance),
    isAxiosError: vi.fn((error) => Boolean(error && typeof error === 'object' && 'isAxiosError' in error)),
  };
});

// Mock @internxt/inxt-js
vi.mock('@internxt/inxt-js', () => ({
  default: vi.fn(),
  Environment: class Environment {},
}));

// Mock event-bus with EventEmitter
vi.mock('./src/apps/main/event-bus', async () => {
  const { EventEmitter } = await import('events');
  return {
    default: new EventEmitter(),
  };
});
