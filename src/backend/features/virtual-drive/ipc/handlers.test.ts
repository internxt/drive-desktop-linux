import { ipcMain } from 'electron';
import eventBus from '../../../../apps/main/event-bus';
import * as virtualDriveServiceModule from '../services/drive-folder/virtual-drive.service';
import * as updateVirtualDriveContainerModule from '../services/update-virtual-drive-container.service';
import * as daemonServiceModule from '../services/daemon.service';
import { DependencyInjectionUserProvider } from '../../../../apps/shared/dependency-injection/DependencyInjectionUserProvider';
import { registerVirtualDriveHandlers } from './handlers';
import { partialSpyOn, calls } from '../../../../../tests/vitest/utils.helper';
import type { Container } from 'diod';

describe('virtual-drive handlers', () => {
  const startVirtualDriveSpy = partialSpyOn(virtualDriveServiceModule, 'startVirtualDrive');
  const remountVirtualDriveSpy = partialSpyOn(virtualDriveServiceModule, 'remountVirtualDriveOnRootChange');
  const getVirtualDriveContainerSpy = partialSpyOn(virtualDriveServiceModule, 'getVirtualDriveContainer');
  const updateVirtualDriveContainerSpy = partialSpyOn(updateVirtualDriveContainerModule, 'updateVirtualDriveContainer');
  const getVirtualDriveStateSpy = partialSpyOn(daemonServiceModule, 'getVirtualDriveState');
  const getUserSpy = partialSpyOn(DependencyInjectionUserProvider, 'get');
  const ipcHandleSpy = vi.spyOn(ipcMain, 'handle').mockImplementation(() => undefined as never);

  beforeEach(() => {
    eventBus.removeAllListeners();
    startVirtualDriveSpy.mockResolvedValue(undefined);
    remountVirtualDriveSpy.mockResolvedValue(undefined);
    getVirtualDriveContainerSpy.mockReturnValue(undefined);
    updateVirtualDriveContainerSpy.mockResolvedValue({ data: true });
    getVirtualDriveStateSpy.mockResolvedValue({ status: 'MOUNTED' } as never);
    getUserSpy.mockReturnValue({ root_folder_id: 1, rootFolderId: 'root-uuid' } as never);
    ipcHandleSpy.mockClear();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  it('registers all event listeners and IPC handlers', () => {
    registerVirtualDriveHandlers();

    expect(eventBus.listenerCount('APP_DATA_SOURCE_INITIALIZED')).toBe(1);
    expect(eventBus.listenerCount('REMOTE_CHANGES_SYNCHED')).toBe(1);
    expect(eventBus.listenerCount('SYNC_ROOT_CHANGED')).toBe(1);
    expect(eventBus.listenerCount('USER_LOGGED_OUT')).toBe(0);
    expect(ipcHandleSpy).toHaveBeenCalledWith('get-virtual-drive-status', daemonServiceModule.getVirtualDriveState);
  });

  it('triggers startVirtualDrive when APP_DATA_SOURCE_INITIALIZED is emitted', () => {
    registerVirtualDriveHandlers();

    eventBus.emit('APP_DATA_SOURCE_INITIALIZED');

    calls(startVirtualDriveSpy).toHaveLength(1);
  });

  it('updates container tree on REMOTE_CHANGES_SYNCHED when container is initialized', () => {
    const mockContainer = {} as Container;
    getVirtualDriveContainerSpy.mockReturnValue(mockContainer);

    registerVirtualDriveHandlers();

    eventBus.emit('REMOTE_CHANGES_SYNCHED');

    calls(updateVirtualDriveContainerSpy).toHaveLength(1);
    expect(updateVirtualDriveContainerSpy).toHaveBeenCalledWith({
      container: mockContainer,
      user: { root_folder_id: 1, rootFolderId: 'root-uuid' },
    });
  });

  it('does not update container tree on REMOTE_CHANGES_SYNCHED when container is not yet initialized', () => {
    getVirtualDriveContainerSpy.mockReturnValue(undefined);

    registerVirtualDriveHandlers();

    eventBus.emit('REMOTE_CHANGES_SYNCHED');

    calls(updateVirtualDriveContainerSpy).toHaveLength(0);
  });

  it('triggers remount when SYNC_ROOT_CHANGED is emitted', () => {
    registerVirtualDriveHandlers();

    eventBus.emit('SYNC_ROOT_CHANGED', { oldPath: '/old/path', newPath: '/new/path' });

    calls(remountVirtualDriveSpy).toHaveLength(1);
    expect(remountVirtualDriveSpy).toHaveBeenCalledWith({ oldPath: '/old/path', newPath: '/new/path' });
  });
});
