import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { mockDeep } from 'vitest-mock-extended';
import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import { FuseCodes } from '../../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { FileRepository } from '../../../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderMother } from '../../../../../../context/virtual-drive/folders/domain/__test-helpers__/FolderMother';
import { DirectoryStateRepository } from '../directory-state-sqlite-repository';
import { DIRECTORY_STATE_ERROR_COOLDOWN_MS } from '../constants';
import * as synchronization from '../synchronize-directory-metadata';
import { refreshChildren } from './refresh-children';

describe('refresh-children', () => {
  const getStateMock = partialSpyOn(DirectoryStateRepository, 'getState');
  const isFreshMock = partialSpyOn(DirectoryStateRepository, 'isFresh');
  const synchronizeMock = partialSpyOn(synchronization, 'synchronizeDirectoryMetadata');
  const props = {
    folder: FolderMother.root(),
    folderRepository: mockDeep<FolderRepository>(),
    fileRepository: mockDeep<FileRepository>(),
  };

  beforeEach(() => {
    getStateMock.mockResolvedValue(undefined);
    isFreshMock.mockResolvedValue(false);
    synchronizeMock.mockResolvedValue(Result.ok(undefined));
  });

  it('should refresh stale children', async () => {
    await refreshChildren(props);

    call(synchronizeMock).toStrictEqual(props);
  });

  it('should skip fresh children', async () => {
    isFreshMock.mockResolvedValue(true);

    await refreshChildren(props);

    expect(synchronizeMock).not.toHaveBeenCalled();
  });

  it.each([
    { fetch_state: 'error_before_mutation', code: FuseCodes.EIO, canUseCachedChildren: true },
    { fetch_state: 'error', code: FuseCodes.EIO, canUseCachedChildren: false },
    { fetch_state: 'error_not_found', code: FuseCodes.ENOENT, canUseCachedChildren: false },
  ])('should preserve $fetch_state during cooldown before checking freshness', async (failure) => {
    getStateMock.mockResolvedValue({
      children_last_error_at: new Date().toISOString(),
      fetch_state: failure.fetch_state,
    });

    const result = await refreshChildren(props);

    expect(result.error).toMatchObject({
      code: failure.code,
      canUseCachedChildren: failure.canUseCachedChildren,
    });
    expect(isFreshMock).not.toHaveBeenCalled();
    expect(synchronizeMock).not.toHaveBeenCalled();
  });

  it('should retry exactly at the cooldown boundary', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    getStateMock.mockResolvedValue({
      children_last_error_at: new Date(now - DIRECTORY_STATE_ERROR_COOLDOWN_MS).toISOString(),
      fetch_state: 'error',
    });

    await refreshChildren(props);

    call(synchronizeMock).toStrictEqual(props);
  });

  it('should propagate refresh failures', async () => {
    const error = new Error('refresh failed');
    synchronizeMock.mockResolvedValue(Result.err(error));

    const result = await refreshChildren(props);

    expect(result.error).toBe(error);
  });
});
