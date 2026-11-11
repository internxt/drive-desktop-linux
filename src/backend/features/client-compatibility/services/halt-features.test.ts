const { hideMock, resetTrayStatusMock, stopMailBridgeMock } = vi.hoisted(() => ({
  hideMock: vi.fn(),
  resetTrayStatusMock: vi.fn(),
  stopMailBridgeMock: vi.fn(),
}));

vi.mock('../../backup', () => ({ backupManager: { stopAndClearBackups: vi.fn() } }));
vi.mock('../../../../apps/main/remote-sync/service', () => ({ cancelPendingRemoteSync: vi.fn() }));
vi.mock('../../virtual-drive/services/drive-folder/virtual-drive.service', () => ({ stopVirtualDriveOnce: vi.fn() }));
vi.mock('../../../../apps/main/antivirus/AntivirusScanService', () => ({
  AntivirusScanService: { cancelScan: vi.fn() },
}));
vi.mock('../../../../apps/main/antivirus/antivirusManager', () => ({
  getAntivirusManager: () => ({ shutdown: vi.fn() }),
}));
vi.mock('../../mail-bridge', () => ({ stopMailBridge: stopMailBridgeMock }));
vi.mock('../../../../apps/main/tray/tray-setup', () => ({ resetTrayStatus: resetTrayStatusMock }));
vi.mock('../../../../apps/main/windows/auth', () => ({ getAuthWindow: () => ({ hide: hideMock }) }));

import { haltFeatures } from './halt-features';

describe('halt-features', () => {
  it('should show the alert, hide the login window and stop the features', async () => {
    // When
    await haltFeatures();
    // Then
    expect(resetTrayStatusMock).toHaveBeenCalledWith('ALERT');
    expect(hideMock).toHaveBeenCalledTimes(1);
    expect(stopMailBridgeMock).toHaveBeenCalledTimes(1);
  });
});
