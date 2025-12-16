import 'reflect-metadata';
import { vi } from 'vitest';

// Mock electron-log (must be before electron mock)
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

// Mock native modules that require system libraries
vi.mock('@gcas/fuse', () => ({
  default: vi.fn(),
  Fuse: vi.fn().mockImplementation(() => ({
    mount: vi.fn(),
    unmount: vi.fn(),
    ops: {},
  })),
}));

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/home'),
    getName: vi.fn().mockReturnValue('DriveDesktop'),
    getVersion: vi.fn().mockReturnValue('1.0.0'),
  },
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn()
  },
}));

// Mock electron-store
vi.mock('electron-store', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
    })),
  };
});

// Mock @internxt/drive-desktop-core backend logger
vi.mock('@internxt/drive-desktop-core/build/backend', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

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
  };
});

// Mock @internxt/inxt-js
vi.mock('@internxt/inxt-js', () => ({
  default: vi.fn(),
}));
