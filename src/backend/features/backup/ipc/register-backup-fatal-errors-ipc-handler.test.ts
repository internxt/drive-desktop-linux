import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ipcMain } from 'electron';
import { resgisterBackupFatalErrorsIpcHandler } from './register-backup-fatal-errors-ipc-handler';
import { getIpcHandler } from './__test-helpers__/ipc-test-utils';
import type { BackupFatalErrors } from '../../../../apps/main/background-processes/backups/BackupFatalErrors/BackupFatalErrors';

describe('resgisterBackupFatalErrorsIpcHandler', () => {
  const mockBackupErrors = {
    get: vi.fn(),
  } as unknown as BackupFatalErrors;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register the get-backup-fatal-errors handler', () => {
    resgisterBackupFatalErrorsIpcHandler(mockBackupErrors);

    expect(ipcMain.handle).toHaveBeenCalledWith('get-backup-fatal-errors', expect.any(Function));
  });

  describe('get-backup-fatal-errors', () => {
    it('should return the backup errors from backupErrors.get()', async () => {
      const mockErrors = [{ folderId: '123', error: 'test error' }];
      const mockFn = mockBackupErrors.get as unknown as ReturnType<typeof vi.fn>;
      mockFn.mockReturnValue(mockErrors);

      resgisterBackupFatalErrorsIpcHandler(mockBackupErrors);
      const handler = getIpcHandler('get-backup-fatal-errors')!;

      const result = await handler();

      expect(result).toBe(mockErrors);
      expect(mockBackupErrors.get).toHaveBeenCalled();
    });
  });
});
