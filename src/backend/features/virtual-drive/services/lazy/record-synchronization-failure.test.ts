import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FolderMother } from '../../../../../context/virtual-drive/folders/domain/__test-helpers__/FolderMother';
import { DriveServerError } from '../../../../../infra/drive-server/drive-server.error';
import { recordSynchronizationFailure } from './record-synchronization-failure';

const { markErrorMock } = vi.hoisted(() => ({
  markErrorMock: vi.fn(),
}));

vi.mock('./directory-state-sqlite-repository', () => ({
  DirectoryStateRepository: {
    markError: markErrorMock,
  },
}));

describe('record-synchronization-failure', () => {
  const folder = FolderMother.root();

  beforeEach(() => {
    markErrorMock.mockResolvedValue(undefined);
  });

  it('should record a missing directory as not found without a cached fallback', async () => {
    const result = await recordSynchronizationFailure({
      folder,
      error: new DriveServerError('NOT_FOUND'),
      localMutationStarted: false,
    });

    expect(result.error).toMatchObject({ code: FuseCodes.ENOENT, canUseCachedChildren: false });
    expect(markErrorMock).toHaveBeenCalledWith({
      folderId: folder.id,
      statusScope: 'EXISTS',
      failureState: 'error_not_found',
    });
  });

  it('should allow cached children when the failure happens before local mutation', async () => {
    const result = await recordSynchronizationFailure({
      folder,
      error: new Error('network failure'),
      localMutationStarted: false,
    });

    expect(result.error).toMatchObject({ code: FuseCodes.EIO, canUseCachedChildren: true });
    expect(markErrorMock).toHaveBeenCalledWith({
      folderId: folder.id,
      statusScope: 'EXISTS',
      failureState: 'error_before_mutation',
    });
  });

  it('should forbid cached children after local mutation has started', async () => {
    const result = await recordSynchronizationFailure({
      folder,
      error: new Error('database failure'),
      localMutationStarted: true,
    });

    expect(result.error).toMatchObject({ code: FuseCodes.EIO, canUseCachedChildren: false });
    expect(markErrorMock).toHaveBeenCalledWith({
      folderId: folder.id,
      statusScope: 'EXISTS',
      failureState: 'error',
    });
  });
});
