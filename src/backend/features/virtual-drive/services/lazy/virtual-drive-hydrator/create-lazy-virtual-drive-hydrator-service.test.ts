import * as childrenModule from './children';
import * as ensureFolderMaterializedModule from './ensure-folder-materialized';
import * as refreshChildrenIfNeededModule from './refresh-children-if-needed';
import { createLazyVirtualDriveHydratorService } from './create-lazy-virtual-drive-hydrator-service';
import type { FileRepository } from '../../../../../../context/virtual-drive/files/domain/FileRepository';
import type { Folder } from '../../../../../../context/virtual-drive/folders/domain/Folder';
import type { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { call, calls, partialSpyOn } from '../../../../../../../tests/vitest/utils.helper';
import type { DirectoryStateSqliteRepository } from '../DirectoryStateSqliteRepository';

vi.mock('./ensure-folder-materialized', () => ({
  ensureFolderMaterialized: vi.fn(),
}));

vi.mock('./refresh-children-if-needed', () => ({
  refreshChildrenIfNeeded: vi.fn(),
}));

vi.mock('./children', () => ({
  readLocalDirectory: vi.fn(),
}));

describe('create-lazy-virtual-drive-hydrator-service', () => {
  const folderRepository = {} as FolderRepository;
  const fileRepository = {} as FileRepository;
  const directoryStateRepository = {} as DirectoryStateSqliteRepository;

  const ensureFolderMaterializedMock = partialSpyOn(ensureFolderMaterializedModule, 'ensureFolderMaterialized');
  const refreshChildrenIfNeededMock = partialSpyOn(refreshChildrenIfNeededModule, 'refreshChildrenIfNeeded');
  const readLocalDirectoryMock = partialSpyOn(childrenModule, 'readLocalDirectory');

  function createHydrator() {
    return createLazyVirtualDriveHydratorService({
      folderRepository,
      fileRepository,
      directoryStateRepository,
    });
  }

  function createFolder() {
    return { id: 'folder-id' } as unknown as Folder;
  }

  it('should normalize the path, hydrate the folder and read the local directory', async () => {
    const folder = createFolder();
    const readResult = { folders: ['child'], files: ['file.txt'] };

    ensureFolderMaterializedMock.mockImplementation(async ({ refreshChildrenIfNeeded: refresh }) => {
      await refresh({ folder, statusScope: 'EXISTS' });
      return folder;
    });
    refreshChildrenIfNeededMock.mockResolvedValue(undefined);
    readLocalDirectoryMock.mockReturnValue(readResult as ReturnType<typeof childrenModule.readLocalDirectory>);

    const hydrator = createHydrator();

    const result = await hydrator.readDirectory({ path: '/parent//nested///' });

    call(ensureFolderMaterializedMock).toMatchObject({
      requestedPath: '/parent/nested/',
      statusScope: 'EXISTS',
    });
    calls(refreshChildrenIfNeededMock).toHaveLength(2);
    expect(refreshChildrenIfNeededMock.mock.calls[0]?.[0]).toMatchObject({
      folder,
      statusScope: 'EXISTS',
      directoryStateRepository,
      inflight: expect.any(Map),
      fetchAndStoreChildren: expect.any(Function),
    });
    call(readLocalDirectoryMock).toMatchObject({ folder, folderRepository, fileRepository });
    expect(result).toStrictEqual(readResult);
  });

  it('should load the parent folder for nested paths', async () => {
    const folder = createFolder();

    ensureFolderMaterializedMock.mockResolvedValue(folder);

    const hydrator = createHydrator();

    await hydrator.ensurePathLoaded({ path: '/parent/nested/file.txt' });

    call(ensureFolderMaterializedMock).toMatchObject({
      requestedPath: '/parent/nested',
      statusScope: 'EXISTS',
    });
  });

  it('should keep root paths unchanged when ensuring a path is loaded', async () => {
    const folder = createFolder();

    ensureFolderMaterializedMock.mockResolvedValue(folder);

    const hydrator = createHydrator();

    await hydrator.ensurePathLoaded({ path: '/' });

    call(ensureFolderMaterializedMock).toMatchObject({
      requestedPath: '/',
      statusScope: 'EXISTS',
    });
  });
});
