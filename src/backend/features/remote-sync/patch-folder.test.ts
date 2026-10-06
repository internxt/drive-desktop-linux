import { resolveFolderStatus, patchFolder } from './patch-folder';
import type { FolderSyncDto } from './types';

const createFolderSyncDtoFixture = (payload: Partial<FolderSyncDto> = {}): FolderSyncDto => ({
  id: 1,
  uuid: 'folder-uuid',
  type: 'folder',
  bucket: 'bucket-1',
  userId: 1,
  parentId: 0,
  parentUuid: '',
  parent: {},
  encryptVersion: '1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  plainName: 'My Folder',
  size: 0,
  creationTime: '2026-01-01T00:00:00.000Z',
  modificationTime: '2026-01-01T00:00:00.000Z',
  status: 'EXISTS',
  removed: false,
  deleted: false,
  name: 'My Folder',
  ...payload,
});

describe('patch-folder', () => {
  describe('resolveFolderStatus', () => {
    it('should return existing status when valid string', () => {
      // When
      const result = resolveFolderStatus({ status: 'TRASHED' });

      // Then
      expect(result).toBe('TRASHED');
    });

    it('should return REMOVED when removed is true and status is empty', () => {
      // When
      const result = resolveFolderStatus({ removed: true });

      // Then
      expect(result).toBe('REMOVED');
    });

    it('should return DELETED when deleted is true and status is empty', () => {
      // When
      const result = resolveFolderStatus({ deleted: true });

      // Then
      expect(result).toBe('DELETED');
    });

    it('should default to EXISTS when no status, removed or deleted flags are present', () => {
      // When
      const result = resolveFolderStatus({});

      // Then
      expect(result).toBe('EXISTS');
    });
  });

  describe('patchFolder', () => {
    it('should normalize folder payload with resolved status and string name', () => {
      // Given
      const folder = createFolderSyncDtoFixture({
        id: 1,
        uuid: 'folder-uuid',
        name: 'My Folder',
        status: 'EXISTS',
        removed: true,
      });

      // When
      const result = patchFolder(folder);

      // Then
      expect(result).toMatchObject({
        id: 1,
        uuid: 'folder-uuid',
        name: 'My Folder',
        status: 'EXISTS',
      });
    });

    it('should set name to undefined when name is an empty string', () => {
      // Given
      const folder = createFolderSyncDtoFixture({
        id: 2,
        uuid: 'folder-uuid-2',
        name: '',
      });

      // When
      const result = patchFolder(folder);

      // Then
      expect(result.name).toBeUndefined();
      expect(result.status).toBe('EXISTS');
    });
  });
});
