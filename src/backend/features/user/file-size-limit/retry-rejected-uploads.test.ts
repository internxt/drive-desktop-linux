import { Container } from 'diod';
import { call, calls, partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import { backupManager } from '../../backup';
import * as releaseModule from '../../virtual-drive/services/operations/release.service';
import * as virtualDriveServiceModule from '../../virtual-drive/services/drive-folder/virtual-drive.service';
import * as addMaxFileSizeRejectionModule from './add-max-file-size-rejection';
import { clearRejectedUploadsForSize } from './clear-rejected-uploads-for-size';
import { registerRejectedUploadForSize } from './register-rejected-upload-for-size';
import { rejectedUploadsForSize } from './rejected-uploads-for-size';
import { retryRejectedUploads } from './retry-rejected-uploads';

const VIRTUAL_DRIVE_PATH = '/Private/notes/large.bin';
const BACKUP_PATH = '/home/dev/Documents/large.bin';

describe('retry-rejected-uploads', () => {
  const getVirtualDriveContainerMock = partialSpyOn(virtualDriveServiceModule, 'getVirtualDriveContainer');
  const releaseMock = partialSpyOn(releaseModule, 'release');
  const clearUploadSizeLimitBlockedPathMock = partialSpyOn(addMaxFileSizeRejectionModule, 'clearUploadSizeLimitBlockedPath');
  const startBackupMock = partialSpyOn(backupManager, 'startBackup');
  const finder = { run: vi.fn() };
  const container = { get: () => finder } as unknown as Container;

  beforeEach(() => {
    clearRejectedUploadsForSize();
    finder.run.mockReset();
    finder.run.mockResolvedValue({ path: VIRTUAL_DRIVE_PATH });
    getVirtualDriveContainerMock.mockReturnValue(container);
    releaseMock.mockResolvedValue({ data: undefined });
    startBackupMock.mockResolvedValue(undefined);
  });

  it('should release a virtual drive file that still has a temporal', async () => {
    // Given
    registerRejectedUploadForSize({ path: VIRTUAL_DRIVE_PATH, kind: 'virtual-drive' });

    // When
    await retryRejectedUploads();

    // Then
    call(clearUploadSizeLimitBlockedPathMock).toBe(VIRTUAL_DRIVE_PATH);
    call(releaseMock).toMatchObject({
      path: VIRTUAL_DRIVE_PATH,
      processName: 'file-size-limit-retry',
      container,
    });
    calls(startBackupMock).toHaveLength(0);
  });

  it('should unregister a virtual drive file when its temporal is gone', async () => {
    // Given
    registerRejectedUploadForSize({ path: VIRTUAL_DRIVE_PATH, kind: 'virtual-drive' });
    finder.run.mockResolvedValue(undefined);

    // When
    await retryRejectedUploads();

    // Then
    calls(releaseMock).toHaveLength(0);
    expect(rejectedUploadsForSize().has(VIRTUAL_DRIVE_PATH)).toBe(false);
  });

  it('should keep a virtual drive file registered when the drive container is missing', async () => {
    // Given
    registerRejectedUploadForSize({ path: VIRTUAL_DRIVE_PATH, kind: 'virtual-drive' });
    getVirtualDriveContainerMock.mockReturnValue(undefined);

    // When
    await retryRejectedUploads();

    // Then
    calls(releaseMock).toHaveLength(0);
    expect(rejectedUploadsForSize().get(VIRTUAL_DRIVE_PATH)).toBe('virtual-drive');
  });

  it('should start one backup when a rejected backup path is registered', async () => {
    // Given
    registerRejectedUploadForSize({ path: BACKUP_PATH, kind: 'backup' });

    // When
    await retryRejectedUploads();

    // Then
    calls(startBackupMock).toHaveLength(1);
    calls(releaseMock).toHaveLength(0);
  });

  it('should run one retry when several calls overlap', async () => {
    // Given
    registerRejectedUploadForSize({ path: VIRTUAL_DRIVE_PATH, kind: 'virtual-drive' });
    let finishRelease: (value: { data: undefined }) => void = () => undefined;
    releaseMock.mockReturnValue(
      new Promise((resolve) => {
        finishRelease = resolve;
      }),
    );

    // When
    const firstRetry = retryRejectedUploads();
    const secondRetry = retryRejectedUploads();

    // Then
    expect(secondRetry).toBe(firstRetry);
    await vi.waitFor(() => {
      calls(releaseMock).toHaveLength(1);
    });

    finishRelease({ data: undefined });
    await firstRetry;

    await retryRejectedUploads();
    calls(releaseMock).toHaveLength(2);
  });
});
