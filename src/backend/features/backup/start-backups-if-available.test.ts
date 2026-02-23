import { startBackupsIfAvailable } from './start-backups-if-available';
import * as userHasBackupsEnabledModule from './utils/user-has-backups-enabled';
import { backupManager } from '.';
import { partialSpyOn, call, calls } from 'tests/vitest/utils.helper';
import { loggerMock } from 'tests/vitest/mocks.helper';

describe('startBackupsIfAvailable', () => {
  const startSchedulerMock = partialSpyOn(backupManager, 'startScheduler');
  const isScheduledMock = partialSpyOn(backupManager, 'isScheduled');
  const userHasBackupsEnabledMock = partialSpyOn(userHasBackupsEnabledModule, 'userHasBackupsEnabled');

  it('should not start scheduler if user has no backup feature', async () => {
    userHasBackupsEnabledMock.mockReturnValue(false);

    await startBackupsIfAvailable();

    call(loggerMock.debug).toMatchObject({
      msg: 'User does not have the backup feature available',
    });
    expect(startSchedulerMock).not.toBeCalled();
  });

  it('should start scheduler if user has backup feature', async () => {
    userHasBackupsEnabledMock.mockReturnValue(true);
    startSchedulerMock.mockResolvedValue(undefined);
    isScheduledMock.mockReturnValue(true);

    await startBackupsIfAvailable();

    expect(startSchedulerMock).toBeCalled();
    calls(loggerMock.debug).toMatchObject([
      { msg: 'Start service' },
      { msg: 'Backups schedule is set' },
      { msg: 'Backups ready' },
    ]);
  });
});
