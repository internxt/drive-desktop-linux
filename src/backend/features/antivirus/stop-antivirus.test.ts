import { call, calls } from '../../../../tests/vitest/utils.helper';
import { loggerMock } from '../../../../tests/vitest/mocks.helper';

const { cancelScanMock, shutdownMock, getAntivirusManagerMock } = vi.hoisted(() => ({
  cancelScanMock: vi.fn(),
  shutdownMock: vi.fn(),
  getAntivirusManagerMock: vi.fn(),
}));

vi.mock('../../../apps/main/antivirus/AntivirusScanService', () => ({
  AntivirusScanService: {
    cancelScan: cancelScanMock,
  },
}));

vi.mock('../../../apps/main/antivirus/antivirusManager', () => ({
  getAntivirusManager: getAntivirusManagerMock,
}));

import { stopAntivirus } from './stop-antivirus';

describe('stop-antivirus', () => {
  beforeEach(() => {
    cancelScanMock.mockResolvedValue(undefined);
    shutdownMock.mockResolvedValue(undefined);
    getAntivirusManagerMock.mockReturnValue({ shutdown: shutdownMock });
  });

  it('should cancel the active scan and shut down the antivirus manager', async () => {
    // When
    await stopAntivirus();

    // Then
    calls(cancelScanMock).toHaveLength(1);
    calls(shutdownMock).toHaveLength(1);
  });

  it('should cancel the scan before shutting down the manager', async () => {
    // When
    await stopAntivirus();

    // Then
    expect(cancelScanMock.mock.invocationCallOrder[0]).toBeLessThan(shutdownMock.mock.invocationCallOrder[0]);
  });

  it('should log and resolve when cancelScan fails', async () => {
    // Given
    const error = new Error('cancel failed');
    cancelScanMock.mockRejectedValue(error);

    // When
    await expect(stopAntivirus()).resolves.toBeUndefined();

    // Then
    calls(shutdownMock).toHaveLength(0);
    call(loggerMock.error).toMatchObject({
      msg: '[APP] Failed to run cleanup step on quit',
      step: 'stop-antivirus',
      error,
    });
  });

  it('should log and resolve when shutdown fails', async () => {
    // Given
    const error = new Error('shutdown failed');
    shutdownMock.mockRejectedValue(error);

    // When
    await expect(stopAntivirus()).resolves.toBeUndefined();

    // Then
    calls(cancelScanMock).toHaveLength(1);
    call(loggerMock.error).toMatchObject({
      msg: '[APP] Failed to run cleanup step on quit',
      step: 'stop-antivirus',
      error,
    });
  });
});
