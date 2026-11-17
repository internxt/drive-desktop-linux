import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { mockDeep } from 'vitest-mock-extended';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderMother } from '../../../../../context/virtual-drive/folders/domain/__test-helpers__/FolderMother';
import { readDirectory, ensurePathMetadataSynchronized } from './metadata-synchronizer';
import { call, calls, partialSpyOn } from 'tests/vitest/utils.helper';
import { DirectoryStateRepository } from './directory-state-sqlite-repository';
import * as synchronization from './synchronize-directory-metadata';
import { DirectoryMetadataSyncError } from './directory-metadata-sync.error';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { DIRECTORY_STATE_ERROR_COOLDOWN_MS } from './constants';
import { DirectoryStateRow } from './types';

describe('lazy-virtual-drive-metadata-synchronizer', () => {
  const isFreshMock = partialSpyOn(DirectoryStateRepository, 'isFresh');
  const getStateMock = partialSpyOn(DirectoryStateRepository, 'getState');
  const synchronizeDirectoryMetadataMock = partialSpyOn(synchronization, 'synchronizeDirectoryMetadata');
  const rootFolder = FolderMother.root();
  const folderRepository = mockDeep<FolderRepository>();
  const fileRepository = mockDeep<FileRepository>();

  beforeEach(() => {
    folderRepository.matchingPartial.mockImplementation((partial) => (partial.path === '/' ? [rootFolder] : []));
    fileRepository.matchingPartial.mockReturnValue([]);
    isFreshMock.mockResolvedValue(true);
    getStateMock.mockResolvedValue(undefined);
    synchronizeDirectoryMetadataMock.mockResolvedValue(Result.ok(undefined));
  });

  it('should list locally cached children when the directory state is fresh', async () => {
    const childFolder = FolderMother.fromPartial({
      parentUuid: rootFolder.uuid,
      path: '/documents',
    });
    folderRepository.matchingPartial.mockImplementation((partial) => {
      if (partial.path === '/') return [rootFolder];
      if (partial.parentUuid === rootFolder.uuid) return [childFolder];
      return [];
    });

    const entries = await readDirectory({
      path: '/',
      folderRepository,
      fileRepository,
    });

    expect(entries).toStrictEqual({ data: { folders: [childFolder.name], files: [] } });
    expect(synchronizeDirectoryMetadataMock).not.toHaveBeenCalled();
  });

  it('should synchronize a stale directory before returning its children', async () => {
    isFreshMock.mockResolvedValue(false);

    await readDirectory({ path: '/', folderRepository, fileRepository });

    expect(synchronizeDirectoryMetadataMock).toHaveBeenCalledWith({
      folder: rootFolder,
      folderRepository,
      fileRepository,
    });
  });

  it('should synchronize the parent directory metadata before resolving a missing path', async () => {
    isFreshMock.mockResolvedValue(false);

    await ensurePathMetadataSynchronized({
      path: '/missing-file.txt',
      folderRepository,
      fileRepository,
    });

    expect(synchronizeDirectoryMetadataMock).toHaveBeenCalledWith({
      folder: rootFolder,
      folderRepository,
      fileRepository,
    });
  });

  it('should return cached children after a failed refresh before local mutation', async () => {
    const child = FolderMother.fromPartial({
      parentUuid: rootFolder.uuid,
      path: '/documents',
    });
    folderRepository.matchingPartial.mockImplementation((partial) =>
      partial.path === '/' ? [rootFolder] : partial.parentUuid === rootFolder.uuid ? [child] : [],
    );
    isFreshMock.mockResolvedValue(false);
    getStateMock.mockResolvedValue({ children_loaded_at: new Date(0).toISOString() });
    synchronizeDirectoryMetadataMock.mockResolvedValue(
      Result.err(
        new DirectoryMetadataSyncError({
          code: FuseCodes.EIO,
          folderPath: '/',
          canUseCachedChildren: true,
        }),
      ),
    );

    const entries = await readDirectory({
      path: '/',
      folderRepository,
      fileRepository,
    });

    expect(entries).toStrictEqual({ data: { folders: [child.name], files: [] } });
  });

  it.each([
    { loaded: false, canUseCachedChildren: true, code: FuseCodes.EIO },
    { loaded: true, canUseCachedChildren: false, code: FuseCodes.EIO },
    { loaded: true, canUseCachedChildren: false, code: FuseCodes.ENOENT },
  ])('should propagate unsafe refresh failures: %j', async ({ loaded, canUseCachedChildren, code }) => {
    isFreshMock.mockResolvedValue(false);
    getStateMock.mockResolvedValue({ children_loaded_at: loaded ? new Date(0).toISOString() : null });
    const error = new DirectoryMetadataSyncError({ code, folderPath: '/', canUseCachedChildren });
    synchronizeDirectoryMetadataMock.mockResolvedValue(Result.err(error));

    const result = await readDirectory({ path: '/', folderRepository, fileRepository });

    expect(result.error).toBe(error);
    calls(fileRepository.matchingPartial).toHaveLength(0);
  });

  it.each([
    { loaded: true, failureState: 'error_before_mutation', code: undefined },
    { loaded: false, failureState: 'error_before_mutation', code: FuseCodes.EIO },
    { loaded: true, failureState: 'error', code: FuseCodes.EIO },
    { loaded: true, failureState: 'error_not_found', code: FuseCodes.ENOENT },
  ])('should suppress retries during cooldown: %j', async ({ loaded, failureState, code }) => {
    getStateMock.mockResolvedValue({
      children_loaded_at: loaded ? new Date(0).toISOString() : null,
      children_last_error_at: new Date().toISOString(),
      fetch_state: failureState,
    });

    for (let attempt = 0; attempt < 2; attempt++) {
      const listing = await readDirectory({
        path: '/',
        folderRepository,
        fileRepository,
      });
      if (code === undefined) {
        expect(listing.data).toStrictEqual({ folders: [], files: [] });
      } else {
        expect(listing.error).toMatchObject({ code });
      }
    }

    calls(synchronizeDirectoryMetadataMock).toHaveLength(0);
  });

  it('should retry at the cooldown boundary and clear the failure after success', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const state: DirectoryStateRow = {
      children_loaded_at: new Date(0).toISOString(),
      children_last_error_at: new Date(now - DIRECTORY_STATE_ERROR_COOLDOWN_MS + 1).toISOString(),
      fetch_state: 'error_before_mutation',
    };
    getStateMock.mockResolvedValue(state);
    isFreshMock.mockResolvedValue(false);
    synchronizeDirectoryMetadataMock.mockImplementation(async () => {
      state.children_last_error_at = null;
      state.fetch_state = 'idle';
      isFreshMock.mockResolvedValue(true);
      return Result.ok(undefined);
    });

    await readDirectory({ path: '/', folderRepository, fileRepository });
    calls(synchronizeDirectoryMetadataMock).toHaveLength(0);
    vi.spyOn(Date, 'now').mockReturnValue(now + 1);
    await readDirectory({ path: '/', folderRepository, fileRepository });
    await readDirectory({ path: '/', folderRepository, fileRepository });

    call(synchronizeDirectoryMetadataMock).toMatchObject({ folder: rootFolder });
  });

  it('should share a refresh between concurrent directory reads', async () => {
    isFreshMock.mockResolvedValue(false);
    const refresh = Promise.withResolvers<Awaited<ReturnType<typeof synchronization.synchronizeDirectoryMetadata>>>();
    synchronizeDirectoryMetadataMock.mockReturnValue(refresh.promise);
    const props = { path: '/', folderRepository, fileRepository };
    const listings = Promise.all([readDirectory(props), readDirectory(props)]);
    await vi.waitFor(() => calls(synchronizeDirectoryMetadataMock).toHaveLength(1));
    refresh.resolve(Result.ok(undefined));

    expect(await listings).toStrictEqual([{ data: { folders: [], files: [] } }, { data: { folders: [], files: [] } }]);
  });

  it('should not hide cached refresh failures from metadata synchronization', async () => {
    getStateMock.mockResolvedValue({
      children_loaded_at: new Date(0).toISOString(),
      children_last_error_at: new Date().toISOString(),
      fetch_state: 'error_before_mutation',
    });

    const result = await ensurePathMetadataSynchronized({
      path: '/file.txt',
      folderRepository,
      fileRepository,
    });

    expect(result.error).toMatchObject({ code: FuseCodes.EIO });
    calls(synchronizeDirectoryMetadataMock).toHaveLength(0);
  });
});
