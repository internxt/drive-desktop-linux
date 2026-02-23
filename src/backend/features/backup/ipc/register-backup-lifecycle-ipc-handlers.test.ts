import { ipcMain } from 'electron';
import { registerBackupLifecycleIpcHandlers } from './register-backup-lifecycle-ipc-handlers';
import { backupManager } from '..';
import * as userHasBackupsEnabledModule from '../utils/user-has-backups-enabled';
import { getIpcHandler } from './__test-helpers__/ipc-test-utils';
import { partialSpyOn, call, calls } from 'tests/vitest/utils.helper';
import { loggerMock } from 'tests/vitest/mocks.helper';

describe('registerBackupLifecycleIpcHandlers', () => {
  const startBackupMock = partialSpyOn(backupManager, 'startBackup');
  const stopBackupMock = partialSpyOn(backupManager, 'stopBackup');
  const userHasBackupsEnabledMock = partialSpyOn(userHasBackupsEnabledModule, 'userHasBackupsEnabled');

  it('should register the start-backups-process handler', () => {
    registerBackupLifecycleIpcHandlers();

    expect(ipcMain.on).toBeCalledWith('start-backups-process', expect.any(Function));
  });

  it('should register the stop-backups-process handler', () => {
    registerBackupLifecycleIpcHandlers();

    expect(ipcMain.on).toBeCalledWith('stop-backups-process', expect.any(Function));
  });

  describe('start-backups-process', () => {
    it('should call the backupManager startBackup method when user has backup feature', async () => {
      userHasBackupsEnabledMock.mockReturnValue(true);
      registerBackupLifecycleIpcHandlers();
      const handler = getIpcHandler('start-backups-process', true)!;

      await handler();

      call(loggerMock.debug).toMatchObject({
        msg: 'Backups started manually',
      });
      calls(startBackupMock).toHaveLength(1);
    });

    it('should not call startBackup when user does not have backup feature available', async () => {
      userHasBackupsEnabledMock.mockReturnValue(false);
      registerBackupLifecycleIpcHandlers();
      const handler = getIpcHandler('start-backups-process', true)!;

      await handler();

      expect(loggerMock.debug).not.toBeCalled();
      expect(startBackupMock).not.toBeCalled();
    });
  });

  describe('stop-backups-process', () => {
    it('should call the backupManager stopBackup method when stop-backups-process event is called', () => {
      registerBackupLifecycleIpcHandlers();
      const handler = getIpcHandler('stop-backups-process', true)!;

      handler();

      call(loggerMock.debug).toMatchObject({
        msg: 'Stopping backups',
      });
      calls(stopBackupMock).toHaveLength(1);
    });
  });
});
