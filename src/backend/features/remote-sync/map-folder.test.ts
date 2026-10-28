import { resolveFolderStatus, mapFolder } from './map-folder';
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

describe('map-folder', () => {
  describe('resolveFolderStatus', () => {
    it('should return existing status when valid string', () => {
      // When
      const result = resolveFolderStatus({ status: 'TRASHED' });

      // Then
      expect(result).toBe('TRASHED');
    });

    it('should return DELETED when removed is true and status is empty', () => {
      // When
      const result = resolveFolderStatus({ removed: true });

      // Then
      expect(result).toBe('DELETED');
    });

    it('should return TRASHED when deleted is true and status is empty', () => {
      // When
      const result = resolveFolderStatus({ deleted: true });

      // Then
      expect(result).toBe('TRASHED');
    });

    it('should default to EXISTS when no status, removed or deleted flags are present', () => {
      // When
      const result = resolveFolderStatus({});

      // Then
      expect(result).toBe('EXISTS');
    });
  });

  describe('mapFolder', () => {
    it('should map all folder properties with resolved status', () => {
      // Given
      const folder = createFolderSyncDtoFixture({
        id: 1,
        uuid: 'folder-uuid',
        name: 'My Folder',
        status: 'EXISTS',
        removed: true,
      });

      // When
      const result = mapFolder(folder);

      // Then
      expect(result).toStrictEqual({
        id: 1,
        uuid: 'folder-uuid',
        name: 'My Folder',
        status: 'EXISTS',
        type: 'folder',
        parentId: 0,
        bucket: 'bucket-1',
        userId: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        plainName: 'My Folder',
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
      const result = mapFolder(folder);

      // Then
      expect(result.name).toBeUndefined();
      expect(result.status).toBe('EXISTS');
    });

    it('should default missing parentId and bucket to null', () => {
      // Given
      const folder = createFolderSyncDtoFixture({
        parentId: undefined,
        bucket: undefined,
      });

      // When
      const result = mapFolder(folder);

      // Then
      expect(result.parentId).toBe(null);
      expect(result.bucket).toBe(null);
    });
  });
});
