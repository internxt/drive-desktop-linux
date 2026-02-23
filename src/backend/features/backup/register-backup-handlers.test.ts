import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerBackupHandlers } from './register-backup-handlers';
import { backupErrorsTracker, status, backupManager } from '.';
import { registerBackupConfigurationIpcHandlers } from './ipc/register-backup-configuration-ipc-handlers';
import { registerBackupFatalErrorsIpcHandler } from './ipc/register-backup-fatal-errors-ipc-handler';
import { registerBackupProcessStatusIpcHandler } from './ipc/register-backup-process-status-ipc-handler';
import { registerEventBusBackupHandlers } from './ipc/register-event-bus-backup-handlers';
import { registerBackupLifecycleIpcHandlers } from './ipc/register-backup-lifecycle-ipc-handlers';

vi.mock('.', () => ({
  backupErrorsTracker: { mock: 'backupErrorsTracker' },
  tracker: { mock: 'tracker' },
  status: { mock: 'status' },
  backupManager: { mock: 'backupManager' },
}));

vi.mock('./ipc/register-backup-configuration-ipc-handlers', () => ({
  registerBackupConfigurationIpcHandlers: vi.fn(),
}));

vi.mock('./ipc/register-backup-fatal-errors-ipc-handler', () => ({
  registerBackupFatalErrorsIpcHandler: vi.fn(),
}));

vi.mock('./ipc/register-backup-process-status-ipc-handler', () => ({
  registerBackupProcessStatusIpcHandler: vi.fn(),
}));

vi.mock('./ipc/register-event-bus-backup-handlers', () => ({
  registerEventBusBackupHandlers: vi.fn(),
}));

vi.mock('./ipc/register-backup-lifecycle-ipc-handlers', () => ({
  registerBackupLifecycleIpcHandlers: vi.fn(),
}));

describe('registerBackupHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register all ipc and event bus handlers', () => {
    registerBackupHandlers();

    expect(registerBackupFatalErrorsIpcHandler).toHaveBeenCalledWith(backupErrorsTracker);
    expect(registerBackupProcessStatusIpcHandler).toHaveBeenCalledWith(status);
    expect(registerBackupConfigurationIpcHandlers).toHaveBeenCalledWith(backupManager);
    expect(registerBackupLifecycleIpcHandlers).toHaveBeenCalled();
    expect(registerEventBusBackupHandlers).toHaveBeenCalled();
  });
});
