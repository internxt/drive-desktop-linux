import { mockDeep } from 'vitest-mock-extended';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderMother } from '../../../../../context/virtual-drive/folders/domain/__test-helpers__/FolderMother';
import { LazyVirtualDriveMetadataSynchronizer } from './lazy-virtual-drive-metadata-synchronizer';

const { isFreshMock, synchronizeDirectoryMetadataMock } = vi.hoisted(() => ({
  isFreshMock: vi.fn(),
  synchronizeDirectoryMetadataMock: vi.fn(),
}));

vi.mock('./directory-state-sqlite-repository', () => ({
  DirectoryStateRepository: { isFresh: isFreshMock },
}));

vi.mock('./synchronize-directory-metadata', () => ({
  synchronizeDirectoryMetadata: synchronizeDirectoryMetadataMock,
}));

describe('lazy-virtual-drive-metadata-synchronizer', () => {
  const rootFolder = FolderMother.root();
  const folderRepository = mockDeep<FolderRepository>();
  const fileRepository = mockDeep<FileRepository>();

  beforeEach(() => {
    folderRepository.matchingPartial.mockImplementation((partial) => (partial.path === '/' ? [rootFolder] : []));
    fileRepository.matchingPartial.mockReturnValue([]);
    isFreshMock.mockResolvedValue(true);
    synchronizeDirectoryMetadataMock.mockResolvedValue(undefined);
  });

  it('should list locally cached children when the directory state is fresh', async () => {
    const childFolder = FolderMother.fromPartial({ id: 99, parentId: rootFolder.id, path: '/documents' });
    folderRepository.matchingPartial.mockImplementation((partial) => {
      if (partial.path === '/') return [rootFolder];
      if (partial.parentId === rootFolder.id) return [childFolder];
      return [];
    });

    const entries = await LazyVirtualDriveMetadataSynchronizer.readDirectory({
      path: '/',
      folderRepository,
      fileRepository,
    });

    expect(entries).toStrictEqual({ folders: [childFolder.name], files: [] });
    expect(synchronizeDirectoryMetadataMock).not.toHaveBeenCalled();
  });

  it('should exclude virtual trash folders from directory listings', async () => {
    const childFolder = FolderMother.fromPartial({ id: 99, parentId: rootFolder.id, path: '/documents' });
    const trashFolder = FolderMother.fromPartial({
      id: Number.MAX_SAFE_INTEGER,
      path: '/.Trash',
      parentId: rootFolder.id,
    });
    const trashUidFolder = FolderMother.fromPartial({
      id: Number.MAX_SAFE_INTEGER - 1,
      path: '/.Trash-1000',
      parentId: rootFolder.id,
    });

    folderRepository.matchingPartial.mockImplementation((partial) => {
      if (partial.path === '/') return [rootFolder];
      if (partial.parentId === rootFolder.id) return [childFolder, trashFolder, trashUidFolder];
      return [];
    });

    const entries = await LazyVirtualDriveMetadataSynchronizer.readDirectory({
      path: '/',
      folderRepository,
      fileRepository,
    });

    expect(entries.folders).toStrictEqual([childFolder.name]);
  });

  it('should synchronize a stale directory before returning its children', async () => {
    isFreshMock.mockResolvedValue(false);

    await LazyVirtualDriveMetadataSynchronizer.readDirectory({ path: '/', folderRepository, fileRepository });

    expect(synchronizeDirectoryMetadataMock).toHaveBeenCalledWith({
      folder: rootFolder,
      folderRepository,
      fileRepository,
    });
  });

  it('should synchronize the parent directory metadata before resolving a missing path', async () => {
    isFreshMock.mockResolvedValue(false);

    await LazyVirtualDriveMetadataSynchronizer.ensurePathMetadataSynchronized({
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

  it('should not trigger remote synchronization when reading /.Trash', async () => {
    const trashFolder = FolderMother.fromPartial({
      id: Number.MAX_SAFE_INTEGER,
      path: '/.Trash',
      parentId: rootFolder.id,
    });
    folderRepository.matchingPartial.mockImplementation((partial) => {
      if (partial.path === '/') return [rootFolder];
      if (partial.path === '/.Trash') return [trashFolder];
      return [];
    });

    const entries = await LazyVirtualDriveMetadataSynchronizer.readDirectory({
      path: '/.Trash',
      folderRepository,
      fileRepository,
    });

    expect(entries).toStrictEqual({ folders: [], files: [] });
    expect(synchronizeDirectoryMetadataMock).not.toHaveBeenCalled();
  });

  it('should skip remote synchronization for paths starting with /.Trash', async () => {
    await LazyVirtualDriveMetadataSynchronizer.ensurePathMetadataSynchronized({
      path: '/.Trash/deleted.txt',
      folderRepository,
      fileRepository,
    });

    expect(synchronizeDirectoryMetadataMock).not.toHaveBeenCalled();
  });
});
