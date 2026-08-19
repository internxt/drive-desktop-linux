import { loggerMock } from 'tests/vitest/mocks.helper';
import { call, calls, partialSpyOn } from 'tests/vitest/utils.helper';
import * as tokenSchedulerModule from '../token-scheduler/TokenScheduler';
import * as traySetupModule from '../tray/tray-setup';
import * as widgetModule from '../windows/widget';
import * as authWindowModule from '../windows/auth';
import * as virtualDriveServiceModule from '../../../backend/features/virtual-drive/services/drive-folder/virtual-drive.service';
import * as dataSourceModule from '../database/data-source';
import * as fileManagerExtensionModule from '../../../backend/features/file-manager-extension/install';
import * as initialSyncReadyModule from '../remote-sync/InitialSyncReady';
import * as remoteSyncModule from '../remote-sync/service';
import * as antivirusScanServiceModule from '../antivirus/AntivirusScanService';
import * as antivirusManagerModule from '../antivirus/antivirusManager';
import * as dependencyInjectionUserProviderModule from '../../shared/dependency-injection/DependencyInjectionUserProvider';

const { shutdownMock } = vi.hoisted(() => ({
  shutdownMock: vi.fn(),
}));

const resetTrayStatusMock = partialSpyOn(traySetupModule, 'resetTrayStatus');
const getWidgetMock = partialSpyOn(widgetModule, 'getWidget');
const createAuthWindowMock = partialSpyOn(authWindowModule, 'createAuthWindow');
const stopVirtualDriveOnceMock = partialSpyOn(virtualDriveServiceModule, 'stopVirtualDriveOnce');
const resetAppDataSourceOnLogoutMock = partialSpyOn(dataSourceModule, 'resetAppDataSourceOnLogout');
const uninstallFileManagerExtensionMock = partialSpyOn(fileManagerExtensionModule, 'uninstallFileManagerExtension');
const setInitialSyncStateMock = partialSpyOn(initialSyncReadyModule, 'setInitialSyncState');
const cancelPendingRemoteSyncMock = partialSpyOn(remoteSyncModule, 'cancelPendingRemoteSync');
const resetRemoteSyncMock = partialSpyOn(remoteSyncModule.remoteSyncManager, 'resetRemoteSync');
const cancelScanMock = partialSpyOn(antivirusScanServiceModule.AntivirusScanService, 'cancelScan');
const getAntivirusManagerMock = partialSpyOn(antivirusManagerModule, 'getAntivirusManager');
const clearUserMock = partialSpyOn(dependencyInjectionUserProviderModule.DependencyInjectionUserProvider, 'clearUser');
const cancelAllJobsMock = partialSpyOn(tokenSchedulerModule.TokenScheduler, 'cancelAll');

describe('close-user-session-resources', () => {
  let closeUserSessionResources: typeof import('./close-user-session-resources').closeUserSessionResources;

  beforeAll(async () => {
    ({ closeUserSessionResources } = await import('./close-user-session-resources'));
  });

  beforeEach(() => {
    getAntivirusManagerMock.mockReturnValue({ shutdown: shutdownMock } as never);
  });

  it('runs all cleanup steps and reports completion', async () => {
    const widget = {
      isDestroyed: () => false,
      hide: vi.fn(),
      destroy: vi.fn(),
    };

    getWidgetMock.mockReturnValue(widget as never);

    await closeUserSessionResources();

    call(resetTrayStatusMock).toBe('IDLE');
    calls(widget.hide).toHaveLength(1);
    calls(clearUserMock).toHaveLength(1);
    calls(cancelAllJobsMock).toHaveLength(1);
    calls(cancelPendingRemoteSyncMock).toHaveLength(1);
    call(setInitialSyncStateMock).toBe('NOT_READY');
    calls(resetRemoteSyncMock).toHaveLength(1);
    calls(cancelScanMock).toHaveLength(1);
    calls(shutdownMock).toHaveLength(1);
    calls(stopVirtualDriveOnceMock).toHaveLength(1);
    calls(resetAppDataSourceOnLogoutMock).toHaveLength(1);
    calls(createAuthWindowMock).toHaveLength(1);
    calls(widget.destroy).toHaveLength(1);
    calls(uninstallFileManagerExtensionMock).toHaveLength(1);
    calls(loggerMock.debug).toContainEqual({
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
    getWidgetMock.mockReturnValue(undefined as never);

    const firstExecution = closeUserSessionResources();
    const secondExecution = closeUserSessionResources();

    await vi.waitFor(() => {
      calls(stopVirtualDriveOnceMock).toHaveLength(1);
    });
    calls(createAuthWindowMock).toHaveLength(0);

    resolveStopVirtualDrive();
    await Promise.all([firstExecution, secondExecution]);

    calls(createAuthWindowMock).toHaveLength(1);
    calls(uninstallFileManagerExtensionMock).toHaveLength(1);
  });
});
