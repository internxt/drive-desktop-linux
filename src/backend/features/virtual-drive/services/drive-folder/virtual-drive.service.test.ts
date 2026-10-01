import type { Container } from 'diod';
import { DriveDependencyContainerFactory } from '../../../../../apps/drive/dependency-injection/DriveDependencyContainerFactory';
import { DependencyInjectionUserProvider } from '../../../../../apps/shared/dependency-injection/DependencyInjectionUserProvider';
import * as stopVirtualDriveModule from './stop-virual-drive';
import * as remountVirtualDriveModule from './remount-virtual-drive';
import * as daemonServiceModule from '../daemon.service';
import * as serverServiceModule from '../server.service';
import * as hydrationApiServiceModule from '../hydration-api.service';
import * as hydrationStateModule from '../../../fuse/on-read/download-cache/hydration-state';
import * as virtualRootFolderModule from '../../../../../apps/main/virtual-root-folder/service';
import { LazyVirtualDriveMetadataSynchronizationService } from '../lazy/LazyVirtualDriveMetadataSynchronizationService';
import { StorageFilesRepository } from '../../../../../context/storage/StorageFiles/domain/StorageFilesRepository';
import { DirectoryStateRepository } from '../lazy/directory-state-sqlite-repository';
import {
  startVirtualDrive,
  stopVirtualDriveOnce,
  remountVirtualDriveOnRootChange,
  getVirtualDriveContainer,
  resetVirtualDriveServiceState,
} from './virtual-drive.service';
import { partialSpyOn, calls, call } from '../../../../../../tests/vitest/utils.helper';

describe('virtual-drive.service', () => {
  const stopVirtualDrive = partialSpyOn(stopVirtualDriveModule, 'stopVirtualDrive');
  const remountVirtualDrive = partialSpyOn(remountVirtualDriveModule, 'remountVirtualDrive');
  const startDaemon = partialSpyOn(daemonServiceModule, 'startDaemon');
  const startFuseDaemonServer = partialSpyOn(serverServiceModule, 'startFuseDaemonServer');
  const startHydrationApi = partialSpyOn(hydrationApiServiceModule, 'startHydrationApi');
  const clearHydrationState = partialSpyOn(hydrationStateModule, 'clearHydrationState');
  const getRootVirtualDrive = partialSpyOn(virtualRootFolderModule, 'getRootVirtualDrive');
  const buildContainer = partialSpyOn(DriveDependencyContainerFactory, 'build');
  const getUser = partialSpyOn(DependencyInjectionUserProvider, 'get');
  const clearDirectoryState = partialSpyOn(DirectoryStateRepository, 'clear');

  const deleteAll = vi.fn();
  const seedRootFolders = vi.fn();
  const containerMock = {
    get: vi.fn((token) => {
      if (token === StorageFilesRepository) return { deleteAll };
      if (token === LazyVirtualDriveMetadataSynchronizationService) return { seedRootFolders };
      return { deleteAll, seedRootFolders };
    }),
  } as unknown as Container;

  beforeEach(() => {
    resetVirtualDriveServiceState();
    stopVirtualDrive.mockResolvedValue(undefined);
    remountVirtualDrive.mockResolvedValue(undefined);
    startDaemon.mockResolvedValue(undefined);
    startFuseDaemonServer.mockResolvedValue(undefined);
    startHydrationApi.mockResolvedValue(undefined);
    getRootVirtualDrive.mockReturnValue('/mock/root/');
    getUser.mockReturnValue({ root_folder_id: 1, rootFolderId: 'root-uuid' } as never);
    buildContainer.mockResolvedValue(containerMock);
    deleteAll.mockResolvedValue(undefined);
    seedRootFolders.mockResolvedValue(undefined);
    clearDirectoryState.mockResolvedValue(undefined);
  });

  describe('startVirtualDrive', () => {
    it('builds container, seeds root folders, and starts server, hydration api and daemon', async () => {
      // When
      await startVirtualDrive();

      // Then
      calls(buildContainer).toHaveLength(1);
      calls(seedRootFolders).toHaveLength(1);
      calls(startFuseDaemonServer).toHaveLength(1);
      calls(startHydrationApi).toHaveLength(1);
      calls(startDaemon).toHaveLength(1);
      expect(getVirtualDriveContainer()).toBe(containerMock);
    });

    it('does not remount if container is already initialized', async () => {
      await startVirtualDrive();
      await startVirtualDrive();

      calls(buildContainer).toHaveLength(1);
    });

    it('clears hydration state before starting daemon', async () => {
      // When
      await startVirtualDrive();

      // Then
      expect(clearHydrationState.mock.invocationCallOrder[0]).toBeLessThan(startDaemon.mock.invocationCallOrder[0]);
    });

    it('clears persisted directory freshness before seeding the in-memory repository', async () => {
      await startVirtualDrive();

      expect(clearDirectoryState.mock.invocationCallOrder[0]).toBeLessThan(seedRootFolders.mock.invocationCallOrder[0]);
    });

    it('starts daemon with the virtual drive root path', async () => {
      // When
      await startVirtualDrive();

      // Then
      call(startDaemon).toBe('/mock/root/');
    });
  });

  describe('stopVirtualDriveOnce', () => {
    it('shares in-flight stop when called twice concurrently', async () => {
      // Given
      let resolveStop: () => void;
      stopVirtualDrive.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveStop = resolve;
        }),
      );

      // When
      const first = stopVirtualDriveOnce();
      const second = stopVirtualDriveOnce();

      // Then
      await vi.waitFor(() => {
        calls(stopVirtualDrive).toHaveLength(1);
      });

      resolveStop!();
      await Promise.all([first, second]);
    });

    it('waits for an in-flight start and leaves the drive stopped', async () => {
      let resolveServerStart: () => void;
      startFuseDaemonServer.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveServerStart = resolve;
        }),
      );

      const start = startVirtualDrive();
      await vi.waitFor(() => {
        calls(startFuseDaemonServer).toHaveLength(1);
      });

      const stop = stopVirtualDriveOnce();
      resolveServerStart!();

      await Promise.all([start, stop]);

      expect(getVirtualDriveContainer()).toBeUndefined();
      calls(stopVirtualDrive).toHaveLength(1);
    });
  });

  describe('remountVirtualDriveOnRootChange', () => {
    it('shares in-flight remount when called twice concurrently', async () => {
      // Given
      let resolveRemount: () => void;
      remountVirtualDrive.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveRemount = resolve;
        }),
      );

      // When
      const first = remountVirtualDriveOnRootChange({ oldPath: '/old/', newPath: '/new/' });
      const second = remountVirtualDriveOnRootChange({ oldPath: '/old/', newPath: '/new/' });

      // Then
      calls(remountVirtualDrive).toHaveLength(1);

      resolveRemount!();
      await Promise.all([first, second]);
    });
  });
});
