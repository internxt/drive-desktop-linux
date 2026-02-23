import { registerBackupHandlers } from './register-backup-handlers';
import { backupErrorsTracker, status, backupManager } from '.';
import * as registerBackupConfigurationIpcHandlersModule from './ipc/register-backup-configuration-ipc-handlers';
import * as registerBackupFatalErrorsIpcHandlerModule from './ipc/register-backup-fatal-errors-ipc-handler';
import * as registerBackupProcessStatusIpcHandlerMocule from './ipc/register-backup-process-status-ipc-handler';
import * as registerEventBusBackupHandlersModule from './ipc/register-event-bus-backup-handlers';
import * as registerBackupLifecycleIpcHandlersModule from './ipc/register-backup-lifecycle-ipc-handlers';
import { partialSpyOn } from 'tests/vitest/utils.helper';

vi.mock('.', () => ({
  backupErrorsTracker: { mock: 'backupErrorsTracker' },
  tracker: { mock: 'tracker' },
  status: { mock: 'status' },
  backupManager: { mock: 'backupManager' },
}));

describe('registerBackupHandlers', () => {
  const registerBackupFatalErrorsIpcHandlerMock = partialSpyOn(
    registerBackupFatalErrorsIpcHandlerModule,
    'registerBackupFatalErrorsIpcHandler',
  );
  const registerBackupProcessStatusIpcHandlerMock = partialSpyOn(
    registerBackupProcessStatusIpcHandlerMocule,
    'registerBackupProcessStatusIpcHandler',
  );
  const registerBackupConfigurationIpcHandlersMock = partialSpyOn(
    registerBackupConfigurationIpcHandlersModule,
    'registerBackupConfigurationIpcHandlers',
  );
  const registerBackupLifecycleIpcHandlersMock = partialSpyOn(
    registerBackupLifecycleIpcHandlersModule,
    'registerBackupLifecycleIpcHandlers',
  );
  const registerEventBusBackupHandlersMock = partialSpyOn(
    registerEventBusBackupHandlersModule,
    'registerEventBusBackupHandlers',
  );

  it('should register all ipc and event bus handlers', () => {
    registerBackupHandlers();

    expect(registerBackupFatalErrorsIpcHandlerMock).toBeCalledWith(backupErrorsTracker);
    expect(registerBackupProcessStatusIpcHandlerMock).toBeCalledWith(status);
    expect(registerBackupConfigurationIpcHandlersMock).toBeCalledWith(backupManager);
    expect(registerBackupLifecycleIpcHandlersMock).toBeCalled();
    expect(registerEventBusBackupHandlersMock).toBeCalled();
  });
});
