import { partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { FileMother } from '../../../../context/virtual-drive/files/domain/__test-helpers__/FileMother';
import { LocalFileMother } from '../../../../context/local/localFile/domain/__test-helpers__/LocalFileMother';
import { BackupProgressTracker } from '../backup-progress-tracker';
import { mockDeep } from 'vitest-mock-extended';
import { createBackupUpdateExecutor, ModifiedFilePair } from './create-backup-update-executor';
import * as updateFileWithRetryModule from './update-file-with-retry';
import * as backupErrorsTrackerModule from '..';

describe('createBackupUpdateExecutor', () => {
  const updateFileWithRetryMock = partialSpyOn(updateFileWithRetryModule, 'updateFileWithRetry');
  const backupErrorsTrackerAddMock = partialSpyOn(backupErrorsTrackerModule.backupErrorsTracker, 'add');

  let tracker: BackupProgressTracker;
  let abortController: AbortController;

  beforeEach(() => {
    tracker = mockDeep<BackupProgressTracker>();
    abortController = new AbortController();
  });

  function createExecutor() {
    return createBackupUpdateExecutor('bucket', {} as any, tracker);
  }

  function createPair(): ModifiedFilePair {
    return [LocalFileMother.any(), FileMother.any()];
  }

  it('should update a file successfully', async () => {
    updateFileWithRetryMock.mockResolvedValue({ data: undefined });
    const executor = createExecutor();
    const pair = createPair();

    const result = await executor(pair, abortController.signal);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(tracker.incrementProcessed).toHaveBeenCalledWith(1);
  });

  it('should return fatal error without tracking it', async () => {
    const fatalError = new DriveDesktopError('NOT_ENOUGH_SPACE', 'No space');
    updateFileWithRetryMock.mockResolvedValue({ error: fatalError });
    const executor = createExecutor();
    const pair = createPair();

    const result = await executor(pair, abortController.signal);

    expect(result.error).toBe(fatalError);
    expect(backupErrorsTrackerAddMock).not.toHaveBeenCalled();
    expect(tracker.incrementProcessed).toHaveBeenCalledWith(1);
  });

  it('should track non-fatal error and return success', async () => {
    const nonFatalError = new DriveDesktopError('BAD_RESPONSE', 'Network error');
    updateFileWithRetryMock.mockResolvedValue({ error: nonFatalError });
    const executor = createExecutor();
    const [localFile, remoteFile] = createPair();

    const result = await executor([localFile, remoteFile], abortController.signal);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(backupErrorsTrackerAddMock).toHaveBeenCalledWith(remoteFile.folderId, {
      name: localFile.nameWithExtension(),
      error: nonFatalError.cause,
    });
    expect(tracker.incrementProcessed).toHaveBeenCalledWith(1);
  });

  it('should call updateFileWithRetry with correct params', async () => {
    updateFileWithRetryMock.mockResolvedValue({ data: undefined });
    const executor = createExecutor();
    const [localFile, remoteFile] = createPair();

    await executor([localFile, remoteFile], abortController.signal);

    expect(updateFileWithRetryMock).toHaveBeenCalledWith({
      path: localFile.path,
      size: localFile.size,
      bucket: 'bucket',
      fileUuid: remoteFile.uuid,
      environment: {},
      signal: abortController.signal,
    });
  });
});
