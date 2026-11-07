import { FileSizeLimitAdapter, FileSizeLimitModule } from '@internxt/drive-desktop-core/build/backend';
import { ipcMain } from 'electron';
import { call, partialSpyOn } from '../../../../tests/vitest/utils.helper';
import * as getFileSizeLimitAdapterModule from '../../../backend/features/user/file-size-limit/get-file-size-limit-adapter';

type IpcHandleMock = {
  mock: {
    calls: Array<[string, (...args: unknown[]) => unknown]>;
  };
};

const adapter: FileSizeLimitAdapter = {
  getStoredLimit: () => 1,
  saveLimit: () => undefined,
  getLastRevalidatedAt: () => 0,
  saveLastRevalidatedAt: () => undefined,
  fetchLimit: () => Promise.resolve({ data: 1 }),
};

function registeredWatchHandler() {
  const handle = ipcMain.handle as unknown as IpcHandleMock;
  return handle.mock.calls.find(([channel]) => channel === 'watchFileSizeLimitAfterUpgrade')?.[1];
}

describe('handlers', () => {
  const watchFileSizeLimitAfterUpgradeMock = partialSpyOn(FileSizeLimitModule, 'watchFileSizeLimitAfterUpgrade');
  const getFileSizeLimitAdapterMock = partialSpyOn(getFileSizeLimitAdapterModule, 'getFileSizeLimitAdapter');

  let watchHandler: ((...args: unknown[]) => unknown) | undefined;

  beforeAll(async () => {
    await import('./handlers');
    watchHandler = registeredWatchHandler();
  });

  beforeEach(() => {
    getFileSizeLimitAdapterMock.mockReturnValue(adapter);
  });

  it('should register the upgrade watch on the main process', () => {
    expect(watchHandler).toEqual(expect.any(Function));
  });

  it('should watch the file size limit with the current adapter', () => {
    if (!watchHandler) {
      throw new Error('watchFileSizeLimitAfterUpgrade handler was not registered');
    }

    // When
    watchHandler();

    // Then
    call(getFileSizeLimitAdapterMock).toStrictEqual([]);
    call(watchFileSizeLimitAfterUpgradeMock).toBe(adapter);
  });
});
