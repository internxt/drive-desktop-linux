import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import { useAntivirus } from './useAntivirus';

type ProgressCallback = (progress: {
  scanId: string;
  currentScanPath: string;
  infectedFiles: string[];
  progress: number;
  totalInfectedFiles: number;
  totalScannedFiles: number;
  done?: boolean;
}) => void;

describe('useAntivirus', () => {
  let progressCallbackStore: ProgressCallback | null = null;

  beforeEach(() => {
    progressCallbackStore = null;

    // Setup mock implementation for onScanProgress to capture the callback
    vi.mocked(window.electron.antivirus.onScanProgress).mockImplementation((cb) => {
      progressCallbackStore = cb;
      return Promise.resolve();
    });

    // Setup default mock implementations
    vi.mocked(window.electron.antivirus.isAvailable).mockResolvedValue(true);
    vi.mocked(window.electron.antivirus.isBackgroundScanEnabled).mockResolvedValue(true);
    vi.mocked(window.electron.antivirus.setBackgroundScanEnabled).mockResolvedValue(true);
    vi.mocked(window.electron.antivirus.scanItems).mockResolvedValue(undefined);
    vi.mocked(window.electron.antivirus.addItemsToScan).mockResolvedValue([
      { path: '/test/file1.txt', itemName: 'file1.txt', isDirectory: false },
      { path: '/test/file2.txt', itemName: 'file2.txt', isDirectory: false },
    ]);
    vi.mocked(window.electron.antivirus.removeInfectedFiles).mockResolvedValue(undefined);
    vi.mocked(window.electron.antivirus.cancelScan).mockResolvedValue(undefined);
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useAntivirus());

      expect(result.current.infectedFiles).toEqual([]);
      expect(result.current.currentScanPath).toBe('');
      expect(result.current.countScannedFiles).toBe(0);
      expect(result.current.progressRatio).toBe(0);
      expect(result.current.isScanCompleted).toBe(false);
      expect(result.current.isScanning).toBe(false);
      expect(result.current.isAntivirusAvailable).toBe(false);
      expect(result.current.isAntivirusEnabled).toBe(true);
      expect(result.current.isUpdatingAntivirusEnabled).toBe(false);
      expect(result.current.showErrorState).toBe(false);
      expect(result.current.view).toBe('loading');
    });
  });

  describe('UI operations', () => {
    it('should properly handle scan again button click', () => {
      const { result } = renderHook(() => useAntivirus());

      act(() => {
        result.current.onScanAgainButtonClicked();
      });

      expect(result.current.view).toBe('chooseItems');
      expect(result.current.isScanning).toBe(false);
      expect(result.current.isScanCompleted).toBe(false);
      expect(result.current.infectedFiles).toEqual([]);
      expect(result.current.countScannedFiles).toBe(0);
      expect(result.current.progressRatio).toBe(0);
    });

    it('should handle system scan button click', async () => {
      const { result } = renderHook(() => useAntivirus());

      let scanPromise: Promise<void> = Promise.resolve();
      act(() => {
        scanPromise = result.current.onScanUserSystemButtonClicked();
      });

      expect(result.current.view).toBe('scan');
      expect(result.current.isScanning).toBe(true);

      await scanPromise;

      expect(window.electron.antivirus.scanItems).toHaveBeenCalled();
      expect(window.electron.antivirus.scanItems).toHaveBeenCalledWith([]);
    });

    it('should handle errors during scanning', async () => {
      vi.mocked(window.electron.antivirus.scanItems).mockRejectedValueOnce(new Error('Scan failed'));

      const { result } = renderHook(() => useAntivirus());

      let scanPromise: Promise<void> = Promise.resolve();
      act(() => {
        scanPromise = result.current.onScanUserSystemButtonClicked();
      });

      expect(result.current.view).toBe('scan');
      expect(result.current.isScanning).toBe(true);

      await scanPromise;

      expect(window.electron.antivirus.scanItems).toHaveBeenCalled();

      expect(result.current.isScanning).toBe(false);
      expect(result.current.showErrorState).toBe(true);
      expect(result.current.isScanCompleted).toBe(false);
    });

    it('should handle canceling a scan', async () => {
      const { result } = renderHook(() => useAntivirus());

      act(() => {
        result.current.onScanUserSystemButtonClicked();
      });

      expect(result.current.view).toBe('scan');
      expect(result.current.isScanning).toBe(true);

      await act(async () => {
        await result.current.onCancelScan();
      });

      expect(window.electron.antivirus.cancelScan).toHaveBeenCalled();

      expect(result.current.view).toBe('chooseItems');
      expect(result.current.isScanning).toBe(false);
      expect(result.current.isScanCompleted).toBe(false);
      expect(result.current.infectedFiles).toEqual([]);
      expect(result.current.countScannedFiles).toBe(0);
      expect(result.current.progressRatio).toBe(0);
    });
  });

  describe('public methods', () => {
    it('should expose all required methods', () => {
      const { result } = renderHook(() => useAntivirus());

      expect(typeof result.current.onScanUserSystemButtonClicked).toBe('function');
      expect(typeof result.current.onScanAgainButtonClicked).toBe('function');
      expect(typeof result.current.onCancelScan).toBe('function');
      expect(typeof result.current.onSetBackgroundScanEnabled).toBe('function');
    });

    it('should update antivirus enabled preference', async () => {
      vi.mocked(window.electron.antivirus.isBackgroundScanEnabled).mockResolvedValueOnce(false);
      vi.mocked(window.electron.antivirus.setBackgroundScanEnabled).mockResolvedValueOnce(false);

      const { result } = renderHook(() => useAntivirus());

      await act(async () => {
        await result.current.onSetBackgroundScanEnabled(false);
      });

      expect(window.electron.antivirus.setBackgroundScanEnabled).toHaveBeenCalledWith(false);
      expect(result.current.isAntivirusEnabled).toBe(false);
      expect(result.current.isUpdatingAntivirusEnabled).toBe(false);
    });

    it('should update antivirus enabled state immediately while request is pending', async () => {
      vi.mocked(window.electron.antivirus.isBackgroundScanEnabled).mockResolvedValueOnce(false);
      let resolveSetBackgroundScanEnabled: (value: boolean) => void = () => undefined;
      const pendingSetBackgroundScanEnabled = new Promise<boolean>((resolve) => {
        resolveSetBackgroundScanEnabled = resolve;
      });

      vi.mocked(window.electron.antivirus.setBackgroundScanEnabled).mockReturnValueOnce(
        pendingSetBackgroundScanEnabled,
      );

      const { result } = renderHook(() => useAntivirus());

      let updatePromise: Promise<void> = Promise.resolve();

      act(() => {
        updatePromise = result.current.onSetBackgroundScanEnabled(false);
      });

      expect(result.current.isAntivirusEnabled).toBe(false);
      expect(result.current.isUpdatingAntivirusEnabled).toBe(true);

      await act(async () => {
        resolveSetBackgroundScanEnabled(false);
        await updatePromise;
      });

      expect(result.current.isAntivirusEnabled).toBe(false);
      expect(result.current.isUpdatingAntivirusEnabled).toBe(false);
    });
  });

  describe('progress handling', () => {
    it('should update state based on progress updates', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useAntivirus());

      expect(window.electron.antivirus.onScanProgress).toHaveBeenCalled();

      expect(progressCallbackStore).not.toBeNull();

      act(() => {
        if (progressCallbackStore) {
          progressCallbackStore({
            scanId: 'test-scan-id',
            currentScanPath: '/path/to/file.txt',
            infectedFiles: ['infected.exe'],
            progress: 50,
            totalInfectedFiles: 1,
            totalScannedFiles: 100,
            done: false,
          });
        }
      });

      expect(result.current.currentScanPath).toBe('/path/to/file.txt');
      expect(result.current.infectedFiles).toEqual(['infected.exe']);
      expect(result.current.progressRatio).toBe(50);
      expect(result.current.countScannedFiles).toBe(100);
      expect(result.current.isScanning).toBe(false);
      expect(result.current.isScanCompleted).toBe(false);

      act(() => {
        if (progressCallbackStore) {
          progressCallbackStore({
            scanId: 'test-scan-id',
            currentScanPath: '/path/to/last/file.txt',
            infectedFiles: ['infected.exe', 'virus.dll'],
            progress: 100,
            totalInfectedFiles: 2,
            totalScannedFiles: 200,
            done: true,
          });
        }
      });

      expect(result.current.progressRatio).toBe(100);

      // Fast-forward the 500ms timeout for scan completion
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.infectedFiles).toEqual(['infected.exe', 'virus.dll']);
      expect(result.current.countScannedFiles).toBe(200);
      expect(result.current.isScanning).toBe(false);
      expect(result.current.isScanCompleted).toBe(true);

      vi.useRealTimers();
    });
  });
});
