import { Container } from 'diod';
import { FuseApp } from './FuseApp';
import { VirtualDrive } from '../virtual-drive/VirtualDrive';
import { StorageClearer } from '../../../context/storage/StorageFiles/application/delete/StorageClearer';
import { FileRepositorySynchronizer } from '../../../context/virtual-drive/files/application/FileRepositorySynchronizer';
import { FolderRepositorySynchronizer } from '../../../context/virtual-drive/folders/application/FolderRepositorySynchronizer/FolderRepositorySynchronizer';
import { RemoteTreeBuilder } from '../../../context/virtual-drive/remoteTree/application/RemoteTreeBuilder';
import { StorageRemoteChangesSyncher } from '../../../context/storage/StorageFiles/application/sync/StorageRemoteChangesSyncher';
import * as helpersModule from './helpers';
import * as hydrationModule from '../../../backend/features/fuse/on-read/hydration-registry';
import * as childProcess from 'child_process';
import { partialSpyOn } from 'tests/vitest/utils.helper';
import { loggerMock } from 'tests/vitest/mocks.helper';
import { Abstract } from 'diod';
import { ChildProcess, ExecFileException } from 'child_process';

type ExecFileCallback = (error: ExecFileException | null) => void;

vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

const mountPromiseMock = partialSpyOn(helpersModule, 'mountPromise');
const destroyAllHydrationsMock = partialSpyOn(hydrationModule, 'destroyAllHydrations');
const execFileMock = vi.mocked(childProcess.execFile);

function createMockContainer() {
  const services = new Map<Abstract<unknown>, unknown>();

  const register = (token: Abstract<unknown>, mock: unknown) => {
    services.set(token, mock);
  };

  const container = {
    get: vi.fn((token: Abstract<unknown>) => {
      return services.get(token) ?? { run: vi.fn() };
    }),
  } as unknown as Container;

  return { container, register };
}

function createFuseApp(container: Container) {
  const virtualDrive = {} as VirtualDrive;
  return new FuseApp(virtualDrive, container, '/tmp/test-mount', 1, 'root-uuid');
}

describe('FuseApp', () => {
  let container: Container;
  let register: (token: Abstract<unknown>, mock: unknown) => void;
  let fuseApp: FuseApp;

  beforeEach(() => {
    ({ container, register } = createMockContainer());
    fuseApp = createFuseApp(container);
  });

  describe('getStatus', () => {
    it('should return UNMOUNTED initially', () => {
      expect(fuseApp.getStatus()).toBe('UNMOUNTED');
    });
  });

  describe('mount', () => {
    it('should return UNMOUNTED if fuse is not initialized', async () => {
      const status = await fuseApp.mount();

      expect(status).toBe('UNMOUNTED');
      expect(loggerMock.error).toBeCalledWith({
        msg: '[FUSE] Cannot mount: FUSE instance not initialized',
      });
    });

    it('should mount successfully and emit mounted event', async () => {
      mountPromiseMock.mockResolvedValueOnce(undefined);
      const mountedHandler = vi.fn();
      fuseApp.on('mounted', mountedHandler);

      await fuseApp.start();

      expect(fuseApp.getStatus()).toBe('MOUNTED');
      expect(mountedHandler).toHaveBeenCalled();
    });

    it('should return MOUNTED without remounting if already mounted', async () => {
      mountPromiseMock.mockResolvedValueOnce(undefined);
      await fuseApp.start();

      const status = await fuseApp.mount();

      expect(status).toBe('MOUNTED');
      expect(loggerMock.debug).toBeCalledWith({
        msg: '[FUSE] Already mounted',
      });
    });

    it('should set status to ERROR if mount fails', async () => {
      vi.useFakeTimers();
      mountPromiseMock.mockRejectedValue(new Error('mount failed'));

      const startPromise = fuseApp.start();
      // eslint-disable-next-line no-await-in-loop
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(3000);
      }
      await startPromise;

      expect(fuseApp.getStatus()).toBe('ERROR');
      vi.useRealTimers();
    });
  });

  describe('start', () => {
    it('should emit mount-error after all retries fail', async () => {
      vi.useFakeTimers();
      mountPromiseMock.mockRejectedValue(new Error('mount failed'));
      const mountErrorHandler = vi.fn();
      fuseApp.on('mount-error', mountErrorHandler);

      const startPromise = fuseApp.start();
      // eslint-disable-next-line no-await-in-loop
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(3000);
      }
      await startPromise;

      expect(mountErrorHandler).toHaveBeenCalled();
      expect(loggerMock.error).toBeCalledWith({
        msg: '[FUSE] mount error after max retries',
      });
      vi.useRealTimers();
    });

    it('should call update after successful mount', async () => {
      const tree = { files: [], folders: [] };
      const remoteTreeBuilder = { run: vi.fn().mockResolvedValue(tree) };
      const fileSynchronizer = { run: vi.fn().mockResolvedValue(undefined) };
      const folderSynchronizer = { run: vi.fn().mockResolvedValue(undefined) };
      const storageSyncher = { run: vi.fn().mockResolvedValue(undefined) };

      register(RemoteTreeBuilder, remoteTreeBuilder);
      register(FileRepositorySynchronizer, fileSynchronizer);
      register(FolderRepositorySynchronizer, folderSynchronizer);
      register(StorageRemoteChangesSyncher, storageSyncher);

      mountPromiseMock.mockResolvedValueOnce(undefined);

      await fuseApp.start();

      expect(remoteTreeBuilder.run).toBeCalledWith(1, 'root-uuid');
    });
  });

  describe('stop', () => {
    it('should do nothing if fuse is not initialized', async () => {
      await fuseApp.stop();

      expect(execFileMock).not.toHaveBeenCalled();
    });

    it('should unmount fuse and reset status', async () => {
      mountPromiseMock.mockResolvedValueOnce(undefined);
      execFileMock.mockImplementation((_cmd, _args, ...rest) => {
        const cb = rest.pop() as ExecFileCallback;
        cb(null);
        return {} as ChildProcess;
      });

      await fuseApp.start();
      expect(fuseApp.getStatus()).toBe('MOUNTED');

      await fuseApp.stop();

      expect(fuseApp.getStatus()).toBe('UNMOUNTED');
      expect(execFileMock).toBeCalledWith('/usr/bin/fusermount', ['-u', '/tmp/test-mount'], expect.any(Function));
    });

    it('should fall back to lazy unmount when non-lazy fails', async () => {
      mountPromiseMock.mockResolvedValueOnce(undefined);

      let callCount = 0;
      execFileMock.mockImplementation((_cmd, _args, ...rest) => {
        const cb = rest.pop() as ExecFileCallback;
        callCount++;
        if (callCount === 1) {
          cb(new Error('device busy'));
        } else {
          cb(null);
        }
        return {} as ChildProcess;
      });

      await fuseApp.start();
      await fuseApp.stop();

      expect(execFileMock).toHaveBeenCalledTimes(2);
      expect(execFileMock).toBeCalledWith('/usr/bin/fusermount', ['-uz', '/tmp/test-mount'], expect.any(Function));
    });

    it('should resolve even when both unmount attempts fail', async () => {
      mountPromiseMock.mockResolvedValueOnce(undefined);
      execFileMock.mockImplementation((_cmd, _args, ...rest) => {
        const cb = rest.pop() as ExecFileCallback;
        cb(new Error('unmount failed'));
        return {} as ChildProcess;
      });

      await fuseApp.start();
      await fuseApp.stop();

      expect(fuseApp.getStatus()).toBe('UNMOUNTED');
      expect(loggerMock.error).toBeCalledWith(expect.objectContaining({ msg: '[FUSE] lazy unmount failed:' }));
    });
  });

  describe('clearCache', () => {
    it('should destroy hydrations and clear storage', async () => {
      const storageClearer = { run: vi.fn().mockResolvedValue(undefined) };
      register(StorageClearer, storageClearer);
      destroyAllHydrationsMock.mockResolvedValue(undefined);

      await fuseApp.clearCache();

      expect(destroyAllHydrationsMock).toHaveBeenCalled();
      expect(storageClearer.run).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should build remote tree and synchronize', async () => {
      const tree = { files: ['file1'], folders: ['folder1'] };
      const remoteTreeBuilder = { run: vi.fn().mockResolvedValue(tree) };
      const fileSynchronizer = { run: vi.fn().mockResolvedValue(undefined) };
      const folderSynchronizer = { run: vi.fn().mockResolvedValue(undefined) };
      const storageSyncher = { run: vi.fn().mockResolvedValue(undefined) };

      register(RemoteTreeBuilder, remoteTreeBuilder);
      register(FileRepositorySynchronizer, fileSynchronizer);
      register(FolderRepositorySynchronizer, folderSynchronizer);
      register(StorageRemoteChangesSyncher, storageSyncher);

      await fuseApp.update();

      expect(remoteTreeBuilder.run).toBeCalledWith(1, 'root-uuid');
      expect(fileSynchronizer.run).toBeCalledWith(['file1']);
      expect(folderSynchronizer.run).toBeCalledWith(['folder1']);
      expect(storageSyncher.run).toHaveBeenCalled();
    });

    it('should log error when tree building fails', async () => {
      const error = new Error('network error');
      const remoteTreeBuilder = { run: vi.fn().mockRejectedValue(error) };
      register(RemoteTreeBuilder, remoteTreeBuilder);

      await fuseApp.update();

      expect(loggerMock.error).toBeCalledWith({
        msg: '[FUSE] Error Updating the tree:',
        error,
      });
    });
  });
});
