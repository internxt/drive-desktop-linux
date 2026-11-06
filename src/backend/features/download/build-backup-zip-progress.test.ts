import { createBackupZipProgressEmitter } from './build-backup-zip-progress';

describe('build-backup-zip-progress', () => {
  it('reports ratio from compressor bytes when total is positive', () => {
    const updateProgress = vi.fn();
    const tracker = createBackupZipProgressEmitter({ totalSizeBytes: 100, updateProgress });

    tracker.onZipCompressorProgress(50);

    expect(updateProgress).toHaveBeenLastCalledWith(0.5);
  });

  it('reports 0 when total size is zero', () => {
    const updateProgress = vi.fn();
    const tracker = createBackupZipProgressEmitter({ totalSizeBytes: 0, updateProgress });

    tracker.onZipCompressorProgress(10);
    tracker.setFileDownloadProgress('a', 5);

    expect(updateProgress).toHaveBeenLastCalledWith(0);
  });

  it('uses max of compressor and in-flight file bytes', () => {
    const updateProgress = vi.fn();
    const tracker = createBackupZipProgressEmitter({ totalSizeBytes: 100, updateProgress });

    tracker.onZipCompressorProgress(20);
    tracker.setFileDownloadProgress('f1', 80);

    expect(updateProgress).toHaveBeenLastCalledWith(0.8);
  });
});
