/* eslint-disable @typescript-eslint/no-explicit-any */
import { ManualSystemScan, ProgressData } from './ManualSystemScan';
import { Antivirus } from './Antivirus';
import { ScannedItem } from '../database/entities/ScannedItem';
import eventBus from '../event-bus';
import { mockDeep, MockProxy } from 'vitest-mock-extended';
import { partialSpyOn } from '../../../../tests/vitest/utils.helper';
import * as getFilesFromDirectoryModule from './utils/getFilesFromDirectory';
import * as transformItemModule from './utils/transformItem';
import * as isPermissionErrorModule from './utils/isPermissionError';
import * as isErrorModule from '../../../shared/errors/is-error';
import * as errorUtilsModule from './utils/errorUtils';
import { DBScannerConnection } from './db/DBScannerConnection';

vi.mock('./Antivirus');

const mockDbConnection = mockDeep<DBScannerConnection>();
vi.mock('./db/DBScannerConnection', () => ({
  DBScannerConnection: vi.fn(function () {
    return mockDbConnection;
  }),
}));

vi.mock('async', () => ({
  queue: vi.fn((worker) => ({
    push: vi.fn((item, callback) => {
      worker(item, callback);
      return { drain: vi.fn() };
    }),
    pushAsync: vi.fn((item) => {
      return Promise.resolve(worker(item));
    }),
    drain: vi.fn().mockResolvedValue(undefined),
    kill: vi.fn(),
  })),
}));

vi.mock('os', () => ({
  default: {
    homedir: vi.fn(() => '/home/user'),
  },
}));

vi.mock('../event-bus', () => ({
  __esModule: true,
  default: {
    emit: vi.fn(),
  },
}));

describe('ManualSystemScan', () => {
  const getFilesFromDirectoryMock = partialSpyOn(getFilesFromDirectoryModule, 'getFilesFromDirectory');
  const countSystemFilesMock = partialSpyOn(getFilesFromDirectoryModule, 'countSystemFiles');
  const transformItemMock = partialSpyOn(transformItemModule, 'transformItem');
  const isPermissionErrorMock = partialSpyOn(isPermissionErrorModule, 'isPermissionError');
  const isErrorMock = partialSpyOn(isErrorModule, 'isError');
  const getErrorMessageMock = partialSpyOn(errorUtilsModule, 'getErrorMessage');

  let manualSystemScan: ManualSystemScan;
  let mockAntivirus: MockProxy<Antivirus>;

  beforeEach(async () => {
    mockAntivirus = mockDeep<Antivirus>();

    vi.mocked(Antivirus.createInstance).mockResolvedValue(mockAntivirus);

    const mockScanResult = {
      file: '/path/to/file.txt',
      isInfected: false,
      viruses: [] as [],
    };

    mockAntivirus.scanFile.mockResolvedValue(mockScanResult);
    mockAntivirus.scanFileWithRetry.mockResolvedValue(mockScanResult);
    mockAntivirus.stopClamAv.mockResolvedValue(undefined);
    mockAntivirus.stopServer.mockResolvedValue(undefined);

    getFilesFromDirectoryMock.mockImplementation(async ({ cb }) => {
      await cb('/path/to/file.txt');
    });
    countSystemFilesMock.mockResolvedValue(10);

    transformItemMock.mockImplementation(async (path) => ({
      pathName: path,
      name: path.split('/').pop(),
      hash: 'mock-hash',
      updatedAtW: new Date().toISOString(),
      isInfected: false,
    }));

    isPermissionErrorMock.mockReturnValue(false);
    isErrorMock.mockImplementation((error) => error instanceof Error);
    getErrorMessageMock.mockImplementation((error) => (error as Error)?.message || String(error));

    manualSystemScan = new ManualSystemScan();
  });

  describe('scanItems', { timeout: 15000 }, () => {
    it('should scan specified paths', async () => {
      const originalResetCounters = manualSystemScan['resetCounters'];
      manualSystemScan['resetCounters'] = vi.fn().mockResolvedValue(undefined);

      (manualSystemScan as any).abortController = new AbortController();

      const mockQueue = {
        pushAsync: vi.fn().mockResolvedValue(undefined),
        drain: vi.fn().mockResolvedValue(undefined),
        kill: vi.fn(),
      };
      (manualSystemScan as any).manualQueue = mockQueue;

      const originalWaitForActiveScans = manualSystemScan['waitForActiveScans'];
      manualSystemScan['waitForActiveScans'] = vi.fn().mockResolvedValue(undefined);

      await manualSystemScan.scanItems(['/path/to/file.txt']);

      expect(Antivirus.createInstance).toHaveBeenCalled();

      expect(getFilesFromDirectoryMock).toHaveBeenCalled();

      manualSystemScan['resetCounters'] = originalResetCounters;
      manualSystemScan['waitForActiveScans'] = originalWaitForActiveScans;
    });
  });

  describe('stopScan', () => {
    it('should stop the scan process', async () => {
      const mockKill = vi.fn();
      (manualSystemScan as any).manualQueue = {
        kill: mockKill,
      };

      (manualSystemScan as any).antivirus = mockAntivirus;

      const originalResetCounters = manualSystemScan['resetCounters'];
      manualSystemScan['resetCounters'] = vi.fn().mockResolvedValue(undefined);

      await manualSystemScan.stopScan();

      expect((manualSystemScan as any).abortController.signal.aborted).toBe(true);

      expect(mockKill).toHaveBeenCalled();

      expect(mockAntivirus.stopClamAv).toHaveBeenCalled();

      manualSystemScan['resetCounters'] = originalResetCounters;
    });
  });

  describe('emitProgressEvent', () => {
    it('should emit a progress event with provided data', () => {
      const progressData: Partial<ProgressData> = {
        currentScanPath: '/test/path',
        progress: 50,
        infectedFiles: ['/infected/file.txt'],
        totalScannedFiles: 5,
      };

      const result = manualSystemScan['emitProgressEvent'](progressData, 123);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'ANTIVIRUS_SCAN_PROGRESS',
        expect.objectContaining({
          currentScanPath: '/test/path',
          progress: 50,
          infectedFiles: ['/infected/file.txt'],
          totalScannedFiles: 5,
          scanId: 'scan-123',
          done: false,
        }),
      );

      expect(result).toMatchObject({
        currentScanPath: '/test/path',
        progress: 50,
        infectedFiles: ['/infected/file.txt'],
        totalScannedFiles: 5,
        scanId: 'scan-123',
        done: false,
      });
    });

    it('should use default values when not provided', () => {
      (manualSystemScan as any).infectedFiles = ['/test/infected.txt'];
      (manualSystemScan as any).totalScannedFiles = 10;

      const calculateProgressSpy = vi.spyOn(manualSystemScan as any, 'calculateProgress');
      calculateProgressSpy.mockReturnValue(75);

      (manualSystemScan as any).emitProgressEvent({});

      expect(eventBus.emit).toHaveBeenCalledWith(
        'ANTIVIRUS_SCAN_PROGRESS',
        expect.objectContaining({
          currentScanPath: 'Scanning...',
          progress: 75,
          infectedFiles: ['/test/infected.txt'],
          totalScannedFiles: 10,
        }),
      );

      calculateProgressSpy.mockRestore();
    });

    it('should not emit event immediately when emitNow is false', () => {
      (manualSystemScan as any).progressEvents = [];

      const progressData: Partial<ProgressData> = {
        currentScanPath: '/test/path',
      };

      manualSystemScan['emitProgressEvent'](progressData, 123, false);

      expect(eventBus.emit).not.toHaveBeenCalled();

      expect((manualSystemScan as any).progressEvents.length).toBeGreaterThan(0);
      expect((manualSystemScan as any).progressEvents[0]).toMatchObject({
        currentScanPath: '/test/path',
      });
    });
  });

  describe('calculateProgress', () => {
    it('should return 50 when totalItemsToScan is 0', () => {
      (manualSystemScan as any).totalItemsToScan = 0;

      const progress = manualSystemScan['calculateProgress']();

      expect(progress).toBe(50);
    });

    it('should return 100 when totalScannedFiles >= totalItemsToScan', () => {
      (manualSystemScan as any).totalItemsToScan = 100;
      (manualSystemScan as any).totalScannedFiles = 100;

      const progress = manualSystemScan['calculateProgress']();

      expect(progress).toBe(100);
    });

    it('should calculate percentage correctly', () => {
      (manualSystemScan as any).totalItemsToScan = 200;
      (manualSystemScan as any).totalScannedFiles = 50;

      const progress = manualSystemScan['calculateProgress']();

      expect(progress).toBe(24);
    });

    it('should cap progress at 99% until complete', () => {
      (manualSystemScan as any).totalItemsToScan = 100;
      (manualSystemScan as any).totalScannedFiles = 99;

      const progress = manualSystemScan['calculateProgress']();

      expect(progress).toBe(98);
    });
  });

  describe('emitCompletionEvent', () => {
    it('should emit a completion event with the specified message', () => {
      (manualSystemScan as any).infectedFiles = ['/infected.txt'];
      (manualSystemScan as any).totalScannedFiles = 100;

      manualSystemScan['emitCompletionEvent']('Test Complete', 0, 'test-session');

      expect(eventBus.emit).toHaveBeenCalledWith(
        'ANTIVIRUS_SCAN_PROGRESS',
        expect.objectContaining({
          currentScanPath: 'Test Complete',
          infectedFiles: ['/infected.txt'],
          progress: 100,
          totalScannedFiles: 100,
          done: true,
          scanId: 'test-session',
        }),
      );
    });

    it('should emit a delayed event when delay > 0', () => {
      vi.useFakeTimers();

      manualSystemScan['emitCompletionEvent']('Delayed Complete', 1000);

      expect(eventBus.emit).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);

      expect(eventBus.emit).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('emitErrorEvent', () => {
    it('should emit an error event with the specified message', () => {
      (manualSystemScan as any).infectedFiles = [];
      (manualSystemScan as any).totalScannedFiles = 50;

      manualSystemScan['emitErrorEvent']('Test Error', 'error-session');

      expect(eventBus.emit).toHaveBeenCalledWith(
        'ANTIVIRUS_SCAN_PROGRESS',
        expect.objectContaining({
          currentScanPath: 'Test Error',
          infectedFiles: [],
          progress: 100,
          totalScannedFiles: 50,
          done: true,
          scanId: 'error-session',
        }),
      );
    });
  });

  describe('trackProgress', () => {
    beforeEach(() => {
      (manualSystemScan as any).scanSessionId = 1;
      (manualSystemScan as any).totalScannedFiles = 0;
      (manualSystemScan as any).infectedFiles = [];
      (manualSystemScan as any).totalInfectedFiles = 0;
      (manualSystemScan as any).totalItemsToScan = 10;

      vi.spyOn(manualSystemScan as any, 'emitProgressEvent').mockReturnValue({
        currentScanPath: 'test',
        progress: 10,
        done: false,
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should track progress for non-infected files', () => {
      manualSystemScan.trackProgress(1, {
        file: '/test/clean.txt',
        isInfected: false,
      });

      expect((manualSystemScan as any).totalScannedFiles).toBe(1);
      expect((manualSystemScan as any).totalInfectedFiles).toBe(0);
      expect((manualSystemScan as any).infectedFiles).toEqual([]);

      expect((manualSystemScan as any).emitProgressEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          currentScanPath: '/test/clean.txt',
          scanId: 'scan-1',
        }),
        1,
        false,
      );
    });

    it('should track progress for infected files and emit immediately', () => {
      manualSystemScan.trackProgress(1, {
        file: '/test/infected.txt',
        isInfected: true,
      });

      expect((manualSystemScan as any).totalScannedFiles).toBe(1);
      expect((manualSystemScan as any).totalInfectedFiles).toBe(1);
      expect((manualSystemScan as any).infectedFiles).toEqual(['/test/infected.txt']);

      expect((manualSystemScan as any).emitProgressEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          currentScanPath: '/test/infected.txt',
          scanId: 'scan-1',
        }),
        1,
        true,
      );
    });

    it('should not update tracking for different session ID', () => {
      manualSystemScan.trackProgress(999, {
        file: '/test/file.txt',
        isInfected: true,
      });

      expect((manualSystemScan as any).totalScannedFiles).toBe(0);
      expect((manualSystemScan as any).totalInfectedFiles).toBe(0);
      expect((manualSystemScan as any).infectedFiles).toEqual([]);
      expect((manualSystemScan as any).emitProgressEvent).not.toHaveBeenCalled();
    });

    it('should handle completion when 100% is reached', () => {
      (manualSystemScan as any).totalScannedFiles = 9;
      (manualSystemScan as any).totalItemsToScan = 10;

      vi.spyOn(manualSystemScan as any, 'calculateProgress').mockReturnValue(100);

      (manualSystemScan as any).emitProgressEvent.mockReturnValue({
        done: false,
        currentScanPath: '/test/last.txt',
      });

      vi.useFakeTimers();

      manualSystemScan.trackProgress(1, {
        file: '/test/last.txt',
        isInfected: false,
      });

      expect((manualSystemScan as any).emitProgressEvent.mock.results[0].value.done).toBe(true);

      vi.advanceTimersByTime(1000);
      expect(eventBus.emit).toHaveBeenCalledWith('ANTIVIRUS_SCAN_PROGRESS', expect.objectContaining({ done: true }));

      vi.useRealTimers();
      (manualSystemScan as any).calculateProgress.mockRestore();
    });
  });

  describe('clearAntivirus', () => {
    it('should stop ClamAV and clear the antivirus instance', async () => {
      (manualSystemScan as any).antivirus = mockAntivirus;

      await manualSystemScan['clearAntivirus']();

      expect(mockAntivirus.stopClamAv).toHaveBeenCalled();
      expect((manualSystemScan as any).antivirus).toBeNull();
    });

    it('should handle errors when stopping ClamAV', async () => {
      (manualSystemScan as any).antivirus = mockAntivirus;

      mockAntivirus.stopClamAv.mockRejectedValueOnce(new Error('Test error'));

      await manualSystemScan['clearAntivirus']();

      expect((manualSystemScan as any).antivirus).toBeNull();
    });

    it('should do nothing if no antivirus instance exists', async () => {
      (manualSystemScan as any).antivirus = null;

      await manualSystemScan['clearAntivirus']();

      expect(mockAntivirus.stopClamAv).not.toHaveBeenCalled();
      expect((manualSystemScan as any).antivirus).toBeNull();
    });
  });

  describe('resetCounters', () => {
    it('should reset all counters and state', async () => {
      (manualSystemScan as any).totalScannedFiles = 100;
      (manualSystemScan as any).totalInfectedFiles = 5;
      (manualSystemScan as any).infectedFiles = ['/test.txt'];
      (manualSystemScan as any).progressEvents = [{ progress: 50 }];
      (manualSystemScan as any).totalItemsToScan = 200;
      (manualSystemScan as any).errorCount = 10;

      const mockQueue = { kill: vi.fn() };
      (manualSystemScan as any).manualQueue = mockQueue;

      (manualSystemScan as any).antivirus = mockAntivirus;

      vi.spyOn(manualSystemScan as any, 'clearAllIntervals').mockImplementation(() => {
        /* mock implementation */
      });

      await manualSystemScan['resetCounters']();

      expect((manualSystemScan as any).totalScannedFiles).toBe(0);
      expect((manualSystemScan as any).totalInfectedFiles).toBe(0);
      expect((manualSystemScan as any).infectedFiles).toEqual([]);
      expect((manualSystemScan as any).progressEvents).toEqual([]);
      expect((manualSystemScan as any).totalItemsToScan).toBe(0);
      expect((manualSystemScan as any).abortController.signal.aborted).toBe(false);

      expect((manualSystemScan as any).clearAllIntervals).toHaveBeenCalled();
      expect(mockQueue.kill).toHaveBeenCalled();
      expect(mockAntivirus.stopClamAv).toHaveBeenCalled();

      (manualSystemScan as any).clearAllIntervals.mockRestore();
    });
  });

  describe('emitEmptyDirProgressEvent', () => {
    it('should emit a progress event for an empty directory', () => {
      vi.spyOn(manualSystemScan as any, 'emitProgressEvent').mockImplementation(() => ({}));

      manualSystemScan['emitEmptyDirProgressEvent']('/empty/dir', 123);

      expect((manualSystemScan as any).emitProgressEvent).toHaveBeenCalledWith(
        {
          currentScanPath: '/empty/dir',
          progress: 100,
          totalScannedFiles: 0,
          done: true,
          scanId: 'scan-empty-123',
        },
        123,
      );

      (manualSystemScan as any).emitProgressEvent.mockRestore();
    });
  });

  describe('isScanComplete and isNearlyScanComplete', () => {
    it('isScanComplete should return true when all files are scanned', () => {
      (manualSystemScan as any).totalItemsToScan = 100;
      (manualSystemScan as any).totalScannedFiles = 100;

      expect(manualSystemScan['isScanComplete']()).toBe(true);
    });

    it('isScanComplete should return false when not all files are scanned', () => {
      (manualSystemScan as any).totalItemsToScan = 100;
      (manualSystemScan as any).totalScannedFiles = 90;

      expect(manualSystemScan['isScanComplete']()).toBe(false);
    });

    it('isNearlyScanComplete should return true when 99.5% of files are processed', () => {
      (manualSystemScan as any).totalItemsToScan = 1000;
      (manualSystemScan as any).totalScannedFiles = 995;
      (manualSystemScan as any).errorCount = 0;

      expect(manualSystemScan['isNearlyScanComplete']()).toBe(true);
    });

    it('isNearlyScanComplete should return true when only a few files remain', () => {
      (manualSystemScan as any).totalItemsToScan = 100;
      (manualSystemScan as any).totalScannedFiles = 96;
      (manualSystemScan as any).errorCount = 0;

      expect(manualSystemScan['isNearlyScanComplete']()).toBe(true);
    });
  });

  describe('handleStalledScan', () => {
    it('should increment stuck count when no progress', () => {
      (manualSystemScan as any).totalScannedFiles = 5;

      const result = manualSystemScan['handleStalledScan'](5, 0, false, false, true);

      expect(result).toEqual({
        stuckCount: 1,
        hasError: false,
        isComplete: false,
        shouldContinue: true,
      });
    });

    it('should force completion if nearly complete and stuck for a while', () => {
      (manualSystemScan as any).totalItemsToScan = 100;
      (manualSystemScan as any).totalScannedFiles = 98;
      (manualSystemScan as any).errorCount = 1;

      vi.spyOn(manualSystemScan as any, 'isNearlyScanComplete').mockReturnValue(true);

      const result = manualSystemScan['handleStalledScan'](98, 29, false, false, false);

      expect(result.isComplete).toBe(true);
      expect(result.shouldContinue).toBe(false);

      expect(eventBus.emit).toHaveBeenCalledWith('ANTIVIRUS_SCAN_PROGRESS', expect.objectContaining({ done: true }));

      (manualSystemScan as any).isNearlyScanComplete.mockRestore();
    });

    it('should report error if custom scan is stuck and not nearly complete', () => {
      (manualSystemScan as any).totalItemsToScan = 100;
      (manualSystemScan as any).totalScannedFiles = 50;

      vi.spyOn(manualSystemScan as any, 'isNearlyScanComplete').mockReturnValue(false);

      const result = manualSystemScan['handleStalledScan'](50, 29, false, false, true);

      expect(result.hasError).toBe(true);
      expect((manualSystemScan as any).abortController.signal.aborted).toBe(true);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'ANTIVIRUS_SCAN_PROGRESS',
        expect.objectContaining({
          currentScanPath: expect.stringContaining('Scan appears stuck'),
          done: true,
        }),
      );

      (manualSystemScan as any).isNearlyScanComplete.mockRestore();
    });

    it('should reset stuck count if progress is made', () => {
      (manualSystemScan as any).totalScannedFiles = 5;

      const result = manualSystemScan['handleStalledScan'](4, 3, false, false, true);

      expect(result.stuckCount).toBe(0);
      expect(result.shouldContinue).toBe(true);
    });
  });

  describe('handlePreviousScannedItem', () => {
    it('should track progress for matching item', async () => {
      const currentSession = 1;
      const mockScannedItem: Partial<ScannedItem> = {
        pathName: '/test/file.txt',
        hash: 'abc123',
        updatedAtW: '12345',
        isInfected: false,
      };

      const mockPreviousItem: Partial<ScannedItem> = {
        pathName: '/test/file.txt',
        hash: 'abc123',
        updatedAtW: '12345',
        isInfected: false,
      };

      const trackProgressSpy = vi.spyOn(manualSystemScan, 'trackProgress').mockImplementation(() => {
        /* mock implementation */
      });

      await manualSystemScan['handlePreviousScannedItem'](
        currentSession,
        mockScannedItem as ScannedItem,
        mockPreviousItem as ScannedItem,
      );

      expect(trackProgressSpy).toHaveBeenCalledWith(currentSession, {
        file: '/test/file.txt',
        isInfected: false,
      });

      trackProgressSpy.mockRestore();
    });

    it('should not track progress if session IDs differ', async () => {
      // const currentSession = 1;
      const wrongSession = 2;

      const trackProgressSpy = vi.spyOn(manualSystemScan, 'trackProgress').mockImplementation(() => {
        /* mock implementation */
      });

      await manualSystemScan['handlePreviousScannedItem'](
        wrongSession,
        {
          pathName: '',
          hash: '',
          updatedAtW: '',
          isInfected: false,
        } as ScannedItem,
        {
          pathName: '',
          hash: '',
          updatedAtW: '',
          isInfected: false,
        } as ScannedItem,
      );

      expect(trackProgressSpy).not.toHaveBeenCalled();

      trackProgressSpy.mockRestore();
    });

    it('should not track progress if hashes differ', async () => {
      const currentSession = 1;
      const mockScannedItem: Partial<ScannedItem> = {
        pathName: '/test/file.txt',
        hash: 'abc123',
        updatedAtW: '12345',
        isInfected: false,
      };

      const mockPreviousItem: Partial<ScannedItem> = {
        pathName: '/test/file.txt',
        hash: 'def456',
        updatedAtW: '9999',
        isInfected: false,
      };

      const trackProgressSpy = vi.spyOn(manualSystemScan, 'trackProgress').mockImplementation(() => {
        /* mock implementation */
      });

      await manualSystemScan['handlePreviousScannedItem'](
        currentSession,
        mockScannedItem as ScannedItem,
        mockPreviousItem as ScannedItem,
      );

      expect(trackProgressSpy).not.toHaveBeenCalled();

      trackProgressSpy.mockRestore();
    });
  });
});
