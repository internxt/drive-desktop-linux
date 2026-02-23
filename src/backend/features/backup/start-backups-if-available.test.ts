import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startBackupsIfAvailable } from './start-backups-if-available';
import { userHasBackupsEnabled } from './utils/user-has-backups-enabled';
import { backupManager } from '.';
import { logger } from '@internxt/drive-desktop-core/build/backend';

vi.mock('./utils/user-has-backups-enabled', () => ({
  userHasBackupsEnabled: vi.fn(),
}));

vi.mock('.', () => ({
  backupManager: {
    startScheduler: vi.fn(),
    isScheduled: vi.fn(),
  },
}));

describe('startBackupsIfAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not start scheduler if user has no backup feature', async () => {
    vi.mocked(userHasBackupsEnabled).mockReturnValue(false);

    await startBackupsIfAvailable();

    expect(logger.debug).toHaveBeenCalledWith({
      tag: 'BACKUPS',
      msg: 'User does not have the backup feature available',
    });
    expect(backupManager.startScheduler).not.toHaveBeenCalled();
  });

  it('should start scheduler if user has backup feature', async () => {
    vi.mocked(userHasBackupsEnabled).mockReturnValue(true);
    vi.mocked(backupManager.startScheduler).mockResolvedValue(undefined);
    vi.mocked(backupManager.isScheduled).mockReturnValue(true);

    await startBackupsIfAvailable();

    expect(backupManager.startScheduler).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith({
      tag: 'BACKUPS',
      msg: 'Start service',
    });
    expect(logger.debug).toHaveBeenCalledWith({
      tag: 'BACKUPS',
      msg: 'Backups schedule is set',
    });
    expect(logger.debug).toHaveBeenCalledWith({
      tag: 'BACKUPS',
      msg: 'Backups ready',
    });
  });
});
