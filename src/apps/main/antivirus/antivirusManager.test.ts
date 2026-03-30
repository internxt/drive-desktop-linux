import { partialSpyOn } from 'tests/vitest/utils.helper';
import { AntivirusManager } from './antivirusManager';
import * as scanCronJobModule from './scanCronJob';
import configStore from '../config';
import clamAVServer from './ClamAVDaemon';
import * as FreshclamUpdaterModule from './FreshclamUpdater';
import eventBus from '../event-bus';

vi.mock('./ClamAVDaemon');
vi.mock('../event-bus', () => ({
  default: { on: vi.fn() },
}));

const configGet = partialSpyOn(configStore, 'get');
const configSet = partialSpyOn(configStore, 'set');
const scheduleDailyScanMock = partialSpyOn(scanCronJobModule, 'scheduleDailyScan');
const clearDailyScanMock = partialSpyOn(scanCronJobModule, 'clearDailyScan');
const checkClamdAvailabilityMock = partialSpyOn(clamAVServer, 'checkClamdAvailability');
const startClamdServerMock = partialSpyOn(clamAVServer, 'startClamdServer');
const stopClamdServerMock = partialSpyOn(clamAVServer, 'stopClamdServer');
const waitForClamdMock = partialSpyOn(clamAVServer, 'waitForClamd');
const runFreshclamMock = partialSpyOn(FreshclamUpdaterModule, 'runFreshclam');
const eventBusOnMock = partialSpyOn(eventBus, 'on');

function getInstance(): AntivirusManager {
  (AntivirusManager as unknown as { instance: undefined }).instance = undefined;
  return AntivirusManager.getInstance();
}

function withAntivirusAvailable(available: boolean) {
  configGet.mockImplementation((key) => {
    if (key === 'availableUserProducts')
      return (available ? { antivirus: true, backups: false, cleaner: false } : undefined) as never;
    if (key === 'backgroundScanEnabled') return false as never;
    return undefined as never;
  });
}

describe('AntivirusManager', () => {
  beforeEach(() => {
    startClamdServerMock.mockResolvedValue(undefined);
    waitForClamdMock.mockResolvedValue(undefined);
    runFreshclamMock.mockResolvedValue(undefined);
  });

  describe('getInstance', () => {
    it('always returns the same instance', () => {
      (AntivirusManager as unknown as { instance: undefined }).instance = undefined;
      const a = AntivirusManager.getInstance();
      const b = AntivirusManager.getInstance();
      expect(a).toBe(b);
    });

    it('registers USER_AVAILABLE_PRODUCTS_UPDATED handler on construction', () => {
      (AntivirusManager as unknown as { instance: undefined }).instance = undefined;
      AntivirusManager.getInstance();
      expect(eventBusOnMock).toHaveBeenCalledWith('USER_AVAILABLE_PRODUCTS_UPDATED', expect.any(Function));
    });
  });

  describe('isBackgroundScanEnabled', () => {
    it('returns the value from the config store', () => {
      configGet.mockImplementation((key) => {
        if (key === 'backgroundScanEnabled') return true as never;
        return undefined as never;
      });
      expect(getInstance().isBackgroundScanEnabled()).toBe(true);
    });

    it('returns false when config store returns false', () => {
      configGet.mockImplementation((key) => {
        if (key === 'backgroundScanEnabled') return false as never;
        return undefined as never;
      });
      expect(getInstance().isBackgroundScanEnabled()).toBe(false);
    });
  });

  describe('setBackgroundScanEnabled', () => {
    it('does nothing when the value is already the same', async () => {
      configGet.mockImplementation((key) => {
        if (key === 'backgroundScanEnabled') return true as never;
        return undefined as never;
      });

      await getInstance().setBackgroundScanEnabled(true);

      expect(configSet).not.toHaveBeenCalled();
      expect(scheduleDailyScanMock).not.toHaveBeenCalled();
      expect(clearDailyScanMock).not.toHaveBeenCalled();
    });

    it('persists the new value in the config store', async () => {
      configGet.mockImplementation((key) => {
        if (key === 'backgroundScanEnabled') return false as never;
        return undefined as never;
      });

      await getInstance().setBackgroundScanEnabled(true);

      expect(configSet).toHaveBeenCalledWith('backgroundScanEnabled', true);
    });

    it('clears the daily scan when disabling', async () => {
      configGet.mockImplementation((key) => {
        if (key === 'backgroundScanEnabled') return true as never;
        return undefined as never;
      });

      await getInstance().setBackgroundScanEnabled(false);

      expect(clearDailyScanMock).toHaveBeenCalledOnce();
      expect(scheduleDailyScanMock).not.toHaveBeenCalled();
    });

    it('does not schedule the scan when enabling but antivirus is not available', async () => {
      configGet.mockImplementation((key) => {
        if (key === 'backgroundScanEnabled') return false as never;
        if (key === 'availableUserProducts') return undefined as never;
        return undefined as never;
      });

      await getInstance().setBackgroundScanEnabled(true);

      expect(scheduleDailyScanMock).not.toHaveBeenCalled();
    });

    it('schedules the daily scan when enabling and antivirus is available', async () => {
      configGet.mockImplementation((key) => {
        if (key === 'backgroundScanEnabled') return false as never;
        if (key === 'availableUserProducts') return { antivirus: true, backups: false, cleaner: false } as never;
        return undefined as never;
      });

      await getInstance().setBackgroundScanEnabled(true);

      expect(scheduleDailyScanMock).toHaveBeenCalledOnce();
    });
  });

  describe('initialize', () => {
    it('skips initialization when antivirus is not available', async () => {
      withAntivirusAvailable(false);

      await getInstance().initialize();

      expect(checkClamdAvailabilityMock).not.toHaveBeenCalled();
    });

    it('schedules daily scan when ClamAV is already running and background scan is enabled', async () => {
      withAntivirusAvailable(true);
      checkClamdAvailabilityMock.mockResolvedValue(true);
      configGet.mockImplementation((key) => {
        if (key === 'availableUserProducts') return { antivirus: true, backups: false, cleaner: false } as never;
        if (key === 'backgroundScanEnabled') return true as never;
        return undefined as never;
      });

      await getInstance().initialize();

      expect(scheduleDailyScanMock).toHaveBeenCalledOnce();
      expect(startClamdServerMock).not.toHaveBeenCalled();
    });

    it('clears daily scan when ClamAV is already running and background scan is disabled', async () => {
      withAntivirusAvailable(true);
      checkClamdAvailabilityMock.mockResolvedValue(true);
      configGet.mockImplementation((key) => {
        if (key === 'availableUserProducts') return { antivirus: true, backups: false, cleaner: false } as never;
        if (key === 'backgroundScanEnabled') return false as never;
        return undefined as never;
      });

      await getInstance().initialize();

      expect(clearDailyScanMock).toHaveBeenCalledOnce();
      expect(startClamdServerMock).not.toHaveBeenCalled();
    });

    it('runs freshclam and starts ClamAV when not already running', async () => {
      withAntivirusAvailable(true);
      checkClamdAvailabilityMock.mockResolvedValue(false);

      await getInstance().initialize();

      expect(runFreshclamMock).toHaveBeenCalledOnce();
      expect(startClamdServerMock).toHaveBeenCalledOnce();
    });

    it('schedules daily scan after startup when background scan is enabled', async () => {
      checkClamdAvailabilityMock.mockResolvedValue(false);
      configGet.mockImplementation((key) => {
        if (key === 'availableUserProducts') return { antivirus: true, backups: false, cleaner: false } as never;
        if (key === 'backgroundScanEnabled') return true as never;
        return undefined as never;
      });

      await getInstance().initialize();

      expect(scheduleDailyScanMock).toHaveBeenCalledOnce();
    });

    it('does not throw when freshclam fails', async () => {
      withAntivirusAvailable(true);
      checkClamdAvailabilityMock.mockResolvedValue(false);
      runFreshclamMock.mockRejectedValue(new Error('freshclam failed'));

      await expect(getInstance().initialize()).resolves.not.toThrow();
      expect(startClamdServerMock).toHaveBeenCalledOnce();
    });
  });

  describe('syncDailyScan', () => {
    it('schedules the daily scan when background scan is enabled', async () => {
      checkClamdAvailabilityMock.mockResolvedValue(false);
      configGet.mockImplementation((key) => {
        if (key === 'availableUserProducts') return { antivirus: true, backups: false, cleaner: false } as never;
        if (key === 'backgroundScanEnabled') return true as never;
        return undefined as never;
      });

      await getInstance().initialize();

      expect(scheduleDailyScanMock).toHaveBeenCalledOnce();
      expect(clearDailyScanMock).not.toHaveBeenCalled();
    });

    it('clears the daily scan when background scan is disabled', async () => {
      checkClamdAvailabilityMock.mockResolvedValue(false);
      configGet.mockImplementation((key) => {
        if (key === 'availableUserProducts') return { antivirus: true, backups: false, cleaner: false } as never;
        if (key === 'backgroundScanEnabled') return false as never;
        return undefined as never;
      });

      await getInstance().initialize();

      expect(clearDailyScanMock).toHaveBeenCalledOnce();
      expect(scheduleDailyScanMock).not.toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('clears the daily scan', async () => {
      stopClamdServerMock.mockResolvedValue(undefined);

      await getInstance().shutdown();

      expect(clearDailyScanMock).toHaveBeenCalledOnce();
    });

    it('stops the ClamAV server', async () => {
      stopClamdServerMock.mockResolvedValue(undefined);

      await getInstance().shutdown();

      expect(stopClamdServerMock).toHaveBeenCalledOnce();
    });

    it('does not throw when stopping the server fails', async () => {
      stopClamdServerMock.mockRejectedValue(new Error('stop failed'));

      await expect(getInstance().shutdown()).resolves.not.toThrow();
    });
  });
});
