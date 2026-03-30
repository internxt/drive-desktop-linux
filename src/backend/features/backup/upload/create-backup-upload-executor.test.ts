import path from 'path';
import { partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { FileMother } from '../../../../context/virtual-drive/files/domain/__test-helpers__/FileMother';
import { LocalFileMother } from '../../../../context/local/localFile/domain/__test-helpers__/LocalFileMother';
import { RemoteTreeMother } from '../../../../context/virtual-drive/remoteTree/domain/__test-helpers__/RemoteTreeMother';
import { BackupProgressTracker } from '../backup-progress-tracker';
import { mockDeep } from 'vitest-mock-extended';
import { createBackupUploadExecutor } from './create-backup-upload-executor';
import * as uploadFileToBackupModule from './upload-file-to-backup';
import * as backupErrorsTrackerModule from '../';
import { AbsolutePath } from '../../../../context/local/localFile/infrastructure/AbsolutePath';
import { Environment } from '@internxt/inxt-js';

describe('createBackupUploadExecutor', () => {
  const uploadFileToBackupMock = partialSpyOn(uploadFileToBackupModule, 'uploadFileToBackup');
  const backupErrorsTrackerAddMock = partialSpyOn(backupErrorsTrackerModule.backupErrorsTracker, 'add');

  let tracker: BackupProgressTracker;
  let abortController: AbortController;

  beforeEach(() => {
    tracker = mockDeep<BackupProgressTracker>();
    abortController = new AbortController();
  });

  function setup() {
    const remoteTree = RemoteTreeMother.onlyRoot();
    // file placed directly under root so getParent always returns root
    const localFile = LocalFileMother.fromPartial({
      path: path.join(remoteTree.root.path, 'test-file.txt') as AbsolutePath,
    });
    const executor = createBackupUploadExecutor(remoteTree.root.path, remoteTree, 'bucket', {} as Environment, tracker);
    return { remoteTree, localFile, executor };
  }

  it('should upload a file successfully and add it to the remote tree', async () => {
    const { remoteTree, localFile, executor } = setup();
    const createdFile = FileMother.any();
    uploadFileToBackupMock.mockResolvedValue({ data: createdFile });
    const addFileMock = partialSpyOn(remoteTree, 'addFile');

    const result = await executor(localFile, abortController.signal);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(addFileMock).toHaveBeenCalled();
    expect(tracker.incrementProcessed).toHaveBeenCalledWith(1);
  });

  it('should skip adding to remote tree when file already exists (data is null)', async () => {
    const { remoteTree, localFile, executor } = setup();
    uploadFileToBackupMock.mockResolvedValue({ data: null });
    const addFileMock = partialSpyOn(remoteTree, 'addFile');

    const result = await executor(localFile, abortController.signal);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(addFileMock).not.toHaveBeenCalled();
    expect(tracker.incrementProcessed).toHaveBeenCalledWith(1);
  });

  it('should return fatal error without tracking it', async () => {
    const { localFile, executor } = setup();
    const fatalError = new DriveDesktopError('NOT_ENOUGH_SPACE', 'No space');
    uploadFileToBackupMock.mockResolvedValue({ error: fatalError });

    const result = await executor(localFile, abortController.signal);

    expect(result.error).toBe(fatalError);
    expect(backupErrorsTrackerAddMock).not.toHaveBeenCalled();
    expect(tracker.incrementProcessed).toHaveBeenCalledWith(1);
  });

  it('should track non-fatal error and return success', async () => {
    const { localFile, executor } = setup();
    const nonFatalError = new DriveDesktopError('BAD_RESPONSE', 'Network error');
    uploadFileToBackupMock.mockResolvedValue({ error: nonFatalError });

    const result = await executor(localFile, abortController.signal);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(backupErrorsTrackerAddMock).toHaveBeenCalled();
    expect(tracker.incrementProcessed).toHaveBeenCalledWith(1);
  });

  it('should call uploadFileToBackup with correct params', async () => {
    const { remoteTree, localFile, executor } = setup();
    uploadFileToBackupMock.mockResolvedValue({ data: FileMother.any() });

    await executor(localFile, abortController.signal);

    expect(uploadFileToBackupMock).toHaveBeenCalledWith({
      path: localFile.path,
      size: localFile.size,
      bucket: 'bucket',
      folderId: remoteTree.root.id,
      folderUuid: remoteTree.root.uuid,
      environment: {} as Environment,
      signal: abortController.signal,
    });
  });
  it('should return success without uploading when signal is already aborted', async () => {
    const { localFile, executor } = setup();
    abortController.abort();

    const result = await executor(localFile, abortController.signal);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(uploadFileToBackupMock).not.toHaveBeenCalled();
  });
});
