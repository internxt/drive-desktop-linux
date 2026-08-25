import { mockDeep } from 'vitest-mock-extended';
import { left, right } from '../../../../shared/domain/Either';
import { DriveDesktopError } from '../../../../shared/domain/errors/DriveDesktopError';
import { FolderPath } from '../../domain/FolderPath';
import { FolderPersistedDto, RemoteFileSystem } from '../../domain/file-systems/RemoteFileSystem';
import { persistFolderWithRetry } from './persist-folder-with-retry';

describe('persist-folder-with-retry', () => {
  let remoteFileSystem: RemoteFileSystem;

  const folderPath = new FolderPath('/root/child');
  const folderDto: FolderPersistedDto = {
    id: 321,
    uuid: '5f8f4d5f-7989-48d1-bf84-18bcaf7e37b9',
    parentId: 123,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    remoteFileSystem = mockDeep<RemoteFileSystem>();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns data when remote persist succeeds', async () => {
    vi.mocked(remoteFileSystem.persist).mockResolvedValueOnce(right(folderDto));

    const result = await persistFolderWithRetry({
      remoteFileSystem,
      folderPath,
      parentUuid: 'parent-uuid',
      tag: 'BACKUPS',
      context: 'TEST',
    });

    expect(result).toStrictEqual({ data: folderDto });
    expect(remoteFileSystem.persist).toHaveBeenCalledTimes(1);
    expect(remoteFileSystem.persist).toHaveBeenCalledWith('child', 'parent-uuid');
  });

  it('retries when parent folder is not found and eventually succeeds', async () => {
    vi.useFakeTimers();

    vi.mocked(remoteFileSystem.persist)
      .mockResolvedValueOnce(left(new DriveDesktopError('PARENT_FOLDER_NOT_FOUND')))
      .mockResolvedValueOnce(right(folderDto));

    const runPromise = persistFolderWithRetry({
      remoteFileSystem,
      folderPath,
      parentUuid: 'parent-uuid',
      tag: 'BACKUPS',
      context: 'TEST',
    });

    await vi.runAllTimersAsync();
    const result = await runPromise;

    expect(result).toStrictEqual({ data: folderDto });
    expect(remoteFileSystem.persist).toHaveBeenCalledTimes(2);
  });

  it('returns the original error when error is not retryable', async () => {
    const unknownError = new DriveDesktopError('UNKNOWN', 'error');
    vi.mocked(remoteFileSystem.persist).mockResolvedValueOnce(left(unknownError));

    const result = await persistFolderWithRetry({
      remoteFileSystem,
      folderPath,
      parentUuid: 'parent-uuid',
      tag: 'BACKUPS',
      context: 'TEST',
    });

    expect(result).toStrictEqual({ error: unknownError });
    expect(remoteFileSystem.persist).toHaveBeenCalledTimes(1);
  });

  it('returns ABORTED when signal is already aborted', async () => {
    const abortController = new AbortController();
    abortController.abort();

    const result = await persistFolderWithRetry({
      remoteFileSystem,
      folderPath,
      parentUuid: 'parent-uuid',
      tag: 'BACKUPS',
      context: 'TEST',
      signal: abortController.signal,
    });

    expect(result.error?.cause).toBe('ABORTED');
    expect(remoteFileSystem.persist).not.toHaveBeenCalled();
  });
});
