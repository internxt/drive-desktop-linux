import { loggerMock } from 'tests/vitest/mocks.helper';

const {
  resetTrayStatusMock,
  getWidgetMock,
  createAuthWindowMock,
  stopVirtualDriveOnceMock,
  resetAppDataSourceOnLogoutMock,
  uninstallNautilusExtensionMock,
  setInitialSyncStateMock,
  cancelPendingRemoteSyncMock,
  resetRemoteSyncMock,
  cleanupAntivirusIpcMock,
  cancelScanMock,
  getAntivirusManagerMock,
  shutdownMock,
  clearUserMock,
  cancelAllJobsMock,
} = vi.hoisted(() => ({
  resetTrayStatusMock: vi.fn(),
  getWidgetMock: vi.fn(),
  createAuthWindowMock: vi.fn(),
  stopVirtualDriveOnceMock: vi.fn(),
  resetAppDataSourceOnLogoutMock: vi.fn(),
  uninstallNautilusExtensionMock: vi.fn(),
  setInitialSyncStateMock: vi.fn(),
  cancelPendingRemoteSyncMock: vi.fn(),
  resetRemoteSyncMock: vi.fn(),
  cleanupAntivirusIpcMock: vi.fn(),
  cancelScanMock: vi.fn(),
  getAntivirusManagerMock: vi.fn(),
  shutdownMock: vi.fn(),
  clearUserMock: vi.fn(),
  cancelAllJobsMock: vi.fn(),
}));

vi.mock('../token-scheduler/TokenScheduler', () => ({
  TokenScheduler: {
    cancelAllJobs: cancelAllJobsMock,
  },
}));

vi.mock('../tray/tray-setup', () => ({
  resetTrayStatus: resetTrayStatusMock,
}));

vi.mock('../windows/widget', () => ({
  getWidget: getWidgetMock,
}));

vi.mock('../windows/auth', () => ({
  createAuthWindow: createAuthWindowMock,
}));

vi.mock('../../../backend/features/virtual-drive/services/drive-folder/virtual-drive.service', () => ({
  stopVirtualDriveOnce: stopVirtualDriveOnceMock,
}));

vi.mock('../database/data-source', () => ({
  resetAppDataSourceOnLogout: resetAppDataSourceOnLogoutMock,
}));

vi.mock('../../../backend/features/nautilus-extension/uninstall', () => ({
  uninstallNautilusExtension: uninstallNautilusExtensionMock,
}));

vi.mock('../remote-sync/InitialSyncReady', () => ({
  setInitialSyncState: setInitialSyncStateMock,
}));

vi.mock('../remote-sync/service', () => ({
  remoteSyncManager: {
    resetRemoteSync: resetRemoteSyncMock,
  },
  cancelPendingRemoteSync: cancelPendingRemoteSyncMock,
}));

vi.mock('../antivirus/AntivirusScanService', () => ({
  AntivirusScanService: {
    cancelScan: cancelScanMock,
  },
}));

vi.mock('../antivirus/antivirusManager', () => ({
  getAntivirusManager: getAntivirusManagerMock,
}));

vi.mock('../background-processes/antivirus/try-setup-antivirus-ipc-and-initialize', () => ({
  cleanupAntivirusIpc: cleanupAntivirusIpcMock,
}));

vi.mock('../../shared/dependency-injection/DependencyInjectionUserProvider', () => ({
  DependencyInjectionUserProvider: {
    clearUser: clearUserMock,
  },
}));

describe('closeUserSessionResources', () => {
  let closeUserSessionResources: typeof import('./close-user-session-resources').closeUserSessionResources;

  beforeAll(async () => {
    ({ closeUserSessionResources } = await import('./close-user-session-resources'));
  });

  beforeEach(() => {
    getAntivirusManagerMock.mockReturnValue({ shutdown: shutdownMock });
  });

  it('runs all cleanup steps and reports completion', async () => {
    const widget = {
      isDestroyed: () => false,
      hide: vi.fn(),
      destroy: vi.fn(),
    };

    getWidgetMock.mockReturnValue(widget as never);

    await closeUserSessionResources();

    expect(resetTrayStatusMock).toHaveBeenCalledWith('IDLE');
    expect(widget.hide).toHaveBeenCalledTimes(1);
    expect(clearUserMock).toHaveBeenCalledTimes(1);
    expect(cancelAllJobsMock).toHaveBeenCalledTimes(1);
    expect(cancelPendingRemoteSyncMock).toHaveBeenCalledTimes(1);
    expect(setInitialSyncStateMock).toHaveBeenCalledWith('NOT_READY');
    expect(resetRemoteSyncMock).toHaveBeenCalledTimes(1);
    expect(cleanupAntivirusIpcMock).toHaveBeenCalledTimes(1);
    expect(cancelScanMock).toHaveBeenCalledTimes(1);
    expect(shutdownMock).toHaveBeenCalledTimes(1);
    expect(stopVirtualDriveOnceMock).toHaveBeenCalledTimes(1);
    expect(resetAppDataSourceOnLogoutMock).toHaveBeenCalledTimes(1);
    expect(createAuthWindowMock).toHaveBeenCalledTimes(1);
    expect(widget.destroy).toHaveBeenCalledTimes(1);
    expect(uninstallNautilusExtensionMock).toHaveBeenCalledTimes(1);
    expect(loggerMock.debug).toHaveBeenCalledWith({
      tag: 'AUTH',
      msg: '[LOGOUT] User session resources closed',
    });
  });

  it('deduplicates concurrent cleanup requests', async () => {
    let resolveStopVirtualDrive: () => void = () => undefined;
    const stopPromise = new Promise<void>((resolve) => {
      resolveStopVirtualDrive = resolve;
    });

    stopVirtualDriveOnceMock.mockReturnValueOnce(stopPromise);
    getWidgetMock.mockReturnValue(undefined);

    const firstExecution = closeUserSessionResources();
    const secondExecution = closeUserSessionResources();

    await vi.waitFor(() => {
      expect(stopVirtualDriveOnceMock).toHaveBeenCalledTimes(1);
    });
    expect(createAuthWindowMock).not.toHaveBeenCalled();

    resolveStopVirtualDrive();
    await Promise.all([firstExecution, secondExecution]);

    expect(createAuthWindowMock).toHaveBeenCalledTimes(1);
    expect(uninstallNautilusExtensionMock).toHaveBeenCalledTimes(1);
  });
});
