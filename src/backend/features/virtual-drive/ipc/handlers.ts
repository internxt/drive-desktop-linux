import { ipcMain } from 'electron';
import eventBus from '../../../../apps/main/event-bus';
import {
  getVirtualDriveContainer,
  startVirtualDrive,
  remountVirtualDriveOnRootChange,
} from '../services/drive-folder/virtual-drive.service';
import { updateVirtualDriveContainer } from '../services/update-virtual-drive-container.service';
import { DependencyInjectionUserProvider } from '../../../../apps/shared/dependency-injection/DependencyInjectionUserProvider';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { getVirtualDriveState } from '../services/daemon.service';
import { DirectoryStateSqliteRepository } from '../services/lazy/DirectoryStateSqliteRepository';

function remoteChangesSyncedHandler() {
  const container = getVirtualDriveContainer();
  if (container) {
    void Promise.all([
      updateVirtualDriveContainer({ container, user: DependencyInjectionUserProvider.get() }),
      container.get(DirectoryStateSqliteRepository).clear(),
    ]);
  } else {
    logger.warn({ msg: '[FUSE] updateVirtualDriveContainer called before container was initialized' });
  }
}

function syncRootChangedHandler({ oldPath, newPath }: { oldPath: string; newPath: string }) {
  void remountVirtualDriveOnRootChange({ oldPath, newPath });
}

export function registerVirtualDriveHandlers() {
  eventBus.on('APP_DATA_SOURCE_INITIALIZED', startVirtualDrive);
  eventBus.on('REMOTE_CHANGES_SYNCHED', remoteChangesSyncedHandler);
  eventBus.on('SYNC_ROOT_CHANGED', syncRootChangedHandler);
  ipcMain.handle('get-virtual-drive-status', getVirtualDriveState);
}
