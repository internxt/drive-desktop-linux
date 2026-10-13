import { filterStaleRemoteFiles, filterStaleRemoteFolders } from './filter-stale-remote-items';
import { RemoteSyncedFile, RemoteSyncedFolder } from '../../../apps/main/remote-sync/helpers';

describe('filter-stale-remote-items', () => {
  const loadedAt = new Date('2026-01-01T12:00:00.000Z');
  const freshDirectoryStates = new Map<number, Date>([[10, loadedAt]]);

  describe('filterStaleRemoteFiles', () => {
    it('persists files whose parent directory is not in freshDirectoryStates', () => {
      const file: RemoteSyncedFile = {
        id: 1,
        uuid: 'uuid-1',
        fileId: 'fid-1',
        type: 'txt',
        size: 100,
        bucket: 'b',
        folderId: 99,
        userId: 1,
        modificationTime: '2026-01-01T10:00:00.000Z',
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z',
        plainName: 'test',
        status: 'EXISTS',
      };

      const { filesToPersist, foldersToInvalidate } = filterStaleRemoteFiles({
        files: [file],
        freshDirectoryStates,
      });

      expect(filesToPersist).toStrictEqual([file]);
      expect(foldersToInvalidate.size).toBe(0);
    });

    it('skips files whose updatedAt is older than or equal to children_loaded_at', () => {
      const olderFile: RemoteSyncedFile = {
        id: 1,
        uuid: 'uuid-1',
        fileId: 'fid-1',
        type: 'txt',
        size: 100,
        bucket: 'b',
        folderId: 10,
        userId: 1,
        modificationTime: '2026-01-01T11:00:00.000Z',
        createdAt: '2026-01-01T11:00:00.000Z',
        updatedAt: '2026-01-01T11:00:00.000Z',
        plainName: 'older',
        status: 'EXISTS',
      };
      const equalFile: RemoteSyncedFile = {
        ...olderFile,
        id: 2,
        uuid: 'uuid-2',
        updatedAt: '2026-01-01T12:00:00.000Z',
        plainName: 'equal',
      };

      const { filesToPersist, foldersToInvalidate } = filterStaleRemoteFiles({
        files: [olderFile, equalFile],
        freshDirectoryStates,
      });

      expect(filesToPersist).toHaveLength(0);
      expect(foldersToInvalidate.size).toBe(0);
    });

    it('keeps files updated after children_loaded_at and marks folder for invalidation', () => {
      const newerFile: RemoteSyncedFile = {
        id: 3,
        uuid: 'uuid-3',
        fileId: 'fid-3',
        type: 'txt',
        size: 100,
        bucket: 'b',
        folderId: 10,
        userId: 1,
        modificationTime: '2026-01-01T13:00:00.000Z',
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T13:00:00.000Z',
        plainName: 'newer',
        status: 'EXISTS',
      };

      const { filesToPersist, foldersToInvalidate } = filterStaleRemoteFiles({
        files: [newerFile],
        freshDirectoryStates,
      });

      expect(filesToPersist).toStrictEqual([newerFile]);
      expect(foldersToInvalidate.has(10)).toBe(true);
    });
  });

  describe('filterStaleRemoteFolders', () => {
    it('persists root folders and folders whose parent is not in freshDirectoryStates', () => {
      const rootFolder: RemoteSyncedFolder = {
        id: 1,
        parentId: null,
        type: 'folder',
        bucket: 'b',
        userId: 1,
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z',
        uuid: 'root-uuid',
        plainName: 'root',
        status: 'EXISTS',
      };
      const unmanagedFolder: RemoteSyncedFolder = {
        ...rootFolder,
        id: 2,
        parentId: 99,
        plainName: 'unmanaged',
      };

      const { foldersToPersist, foldersToInvalidate } = filterStaleRemoteFolders({
        folders: [rootFolder, unmanagedFolder],
        freshDirectoryStates,
      });

      expect(foldersToPersist).toStrictEqual([rootFolder, unmanagedFolder]);
      expect(foldersToInvalidate.size).toBe(0);
    });

    it('skips folders whose updatedAt is older than or equal to parent loaded_at', () => {
      const staleFolder: RemoteSyncedFolder = {
        id: 20,
        parentId: 10,
        type: 'folder',
        bucket: 'b',
        userId: 1,
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T11:00:00.000Z',
        uuid: 'sub-uuid',
        plainName: 'sub',
        status: 'EXISTS',
      };

      const { foldersToPersist, foldersToInvalidate } = filterStaleRemoteFolders({
        folders: [staleFolder],
        freshDirectoryStates,
      });

      expect(foldersToPersist).toHaveLength(0);
      expect(foldersToInvalidate.size).toBe(0);
    });

    it('keeps folders updated after parent loaded_at and marks parent for invalidation', () => {
      const newerFolder: RemoteSyncedFolder = {
        id: 21,
        parentId: 10,
        type: 'folder',
        bucket: 'b',
        userId: 1,
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T14:00:00.000Z',
        uuid: 'newer-uuid',
        plainName: 'newer-folder',
        status: 'EXISTS',
      };

      const { foldersToPersist, foldersToInvalidate } = filterStaleRemoteFolders({
        folders: [newerFolder],
        freshDirectoryStates,
      });

      expect(foldersToPersist).toStrictEqual([newerFolder]);
      expect(foldersToInvalidate.has(10)).toBe(true);
    });
  });
});
