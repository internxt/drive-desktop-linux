import * as eventBusModule from '../../apps/main/event-bus';
import * as appDataSourceModule from '../../apps/main/database/data-source';
import * as widgetModule from '../../apps/main/windows/widget';
import * as authWindowModule from '../../apps/main/windows/auth';
import * as configStoreModule from '../../apps/main/config';
import * as trayModule from '../../apps/main/tray/tray-setup';
import * as onboardingModule from '../../apps/main/windows/onboarding';
import * as themeModule from '../theme';
import * as antivirusModule from '../../apps/main/background-processes/antivirus/try-setup-antivirus-ipc-and-initialize';
import * as paymentsModule from '../../backend/features/payments/services/get-user-available-products-and-store';
import * as backupModule from '../../backend/features/backup/register-backup-handlers';
import * as backupStartModule from '../../backend/features/backup/start-backups-if-available';
import * as fileSizeLimitModule from '../../backend/features/user/file-size-limit/resolve-user-file-size-limit';
import * as marketingModule from '../../backend/features/marketing';
import { partialSpyOn } from 'tests/vitest/utils.helper';

vi.mock('../../apps/main/event-bus', () => ({
  default: {
    on: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock('../../apps/main/database/data-source', () => ({
  AppDataSource: {
    isInitialized: false,
    initialize: vi.fn(),
  },
}));

vi.mock('../../apps/main/windows/widget', () => ({
  getOrCreateWidged: vi.fn(),
  setBoundsOfWidgetByPath: vi.fn(),
}));

vi.mock('../../apps/main/windows/auth', () => ({
  getAuthWindow: vi.fn(),
}));

vi.mock('../../apps/main/config', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../../apps/main/tray/tray-setup', () => ({
  getTray: vi.fn(),
  resetTrayStatus: vi.fn(),
}));

vi.mock('../../apps/main/windows/onboarding', () => ({
  openOnboardingWindow: vi.fn(),
}));

vi.mock('../theme', () => ({
  getTheme: vi.fn(),
}));

vi.mock('../../apps/main/background-processes/antivirus/try-setup-antivirus-ipc-and-initialize', () => ({
  trySetupAntivirusIpcAndInitialize: vi.fn(),
}));

vi.mock('../../backend/features/payments/services/get-user-available-products-and-store', () => ({
  getUserAvailableProductsAndStore: vi.fn(),
}));

vi.mock('../../backend/features/backup/register-backup-handlers', () => ({
  registerBackupHandlers: vi.fn(),
}));

vi.mock('../../backend/features/backup/start-backups-if-available', () => ({
  startBackupsIfAvailable: vi.fn(),
}));

vi.mock('../../backend/features/user/file-size-limit/resolve-user-file-size-limit', () => ({
  resolveUserFileSizeLimit: vi.fn(),
}));

vi.mock('../../backend/features/marketing', () => ({
  showMarketingNotifications: vi.fn(),
}));

import { registerSessionEventHandlers } from './register-session-event-handlers';

describe('register-session-event-handlers', () => {
  const eventBusOnSpy = partialSpyOn(eventBusModule.default, 'on');
  const appDataSourceInitializeSpy = partialSpyOn(appDataSourceModule.AppDataSource, 'initialize');
  const getOrCreateWidgedSpy = partialSpyOn(widgetModule, 'getOrCreateWidged');
  const getAuthWindowSpy = partialSpyOn(authWindowModule, 'getAuthWindow');
  const configStoreGetSpy = partialSpyOn(configStoreModule.default, 'get');
  const getTraySpy = partialSpyOn(trayModule, 'getTray');
  const resetTrayStatusSpy = partialSpyOn(trayModule, 'resetTrayStatus');
  const openOnboardingWindowSpy = partialSpyOn(onboardingModule, 'openOnboardingWindow');
  const getThemeSpy = partialSpyOn(themeModule, 'getTheme');
  const trySetupAntivirusSpy = partialSpyOn(antivirusModule, 'trySetupAntivirusIpcAndInitialize');
  const getUserAvailableProductsAndStoreSpy = partialSpyOn(
    paymentsModule, 'getUserAvailableProductsAndStore'
  );
  const registerBackupHandlersSpy = partialSpyOn(backupModule, 'registerBackupHandlers');
  const startBackupsIfAvailableSpy = partialSpyOn(backupStartModule, 'startBackupsIfAvailable');
  const resolveUserFileSizeLimitSpy = partialSpyOn(fileSizeLimitModule, 'resolveUserFileSizeLimit');
  const showMarketingNotificationsSpy = partialSpyOn(marketingModule, 'showMarketingNotifications');

  beforeEach(() => {
    eventBusOnSpy.mockImplementation(() => ({}) as never);
    appDataSourceInitializeSpy.mockResolvedValue({} as never);
    getOrCreateWidgedSpy.mockResolvedValue({ show: vi.fn() } as never);
    getAuthWindowSpy.mockReturnValue({ hide: vi.fn(), destroy: vi.fn(), isDestroyed: () => false } as never);
    configStoreGetSpy.mockReturnValue(undefined);
    getTraySpy.mockReturnValue({} as never);
    resetTrayStatusSpy.mockImplementation(() => undefined);
    openOnboardingWindowSpy.mockImplementation(() => undefined);
    getThemeSpy.mockImplementation(() => ({}) as never);
    trySetupAntivirusSpy.mockResolvedValue(undefined);
    getUserAvailableProductsAndStoreSpy.mockResolvedValue(undefined);
    registerBackupHandlersSpy.mockImplementation(() => undefined);
    startBackupsIfAvailableSpy.mockResolvedValue(undefined);
    resolveUserFileSizeLimitSpy.mockResolvedValue({} as never);
    showMarketingNotificationsSpy.mockResolvedValue(undefined);
  });

  it('should register the session event handlers', () => {
    registerSessionEventHandlers();

    expect(eventBusOnSpy).toHaveBeenCalledTimes(2);
    expect(eventBusOnSpy).toHaveBeenNthCalledWith(1, 'WIDGET_IS_READY', expect.any(Function));
    expect(eventBusOnSpy).toHaveBeenNthCalledWith(2, 'USER_LOGGED_IN', expect.any(Function));
  });

  it('should initialize app data source and open onboarding when user logs in', async () => {
    registerSessionEventHandlers();

    const [, loginHandler] = eventBusOnSpy.mock.calls[1];
    await (loginHandler as (...args: unknown[]) => Promise<void> | void)();

    expect(appDataSourceInitializeSpy).toHaveBeenCalledTimes(1);
    expect(getUserAvailableProductsAndStoreSpy).toHaveBeenCalledTimes(1);
    expect(getThemeSpy).toHaveBeenCalledTimes(1);
    expect(resetTrayStatusSpy).toHaveBeenCalledWith('IDLE');
    expect(openOnboardingWindowSpy).toHaveBeenCalledTimes(1);
    expect(trySetupAntivirusSpy).toHaveBeenCalledTimes(1);
    expect(showMarketingNotificationsSpy).toHaveBeenCalledTimes(1);
  });
});
