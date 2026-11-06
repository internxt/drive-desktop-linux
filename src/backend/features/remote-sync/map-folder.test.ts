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

    it('should return TRASHED when removed is true and status is empty', () => {
      // When
      const result = resolveFolderStatus({ removed: true });

      // Then
      expect(result).toBe('TRASHED');
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
        uuid: 'folder-uuid',
        status: 'EXISTS',
        type: 'folder',
        parentUuid: undefined,
        bucket: 'bucket-1',
        userId: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        plainName: 'My Folder',
      });
    });

    it('should map parentUuid when provided by the sync dto', () => {
      const folder = createFolderSyncDtoFixture({
        parentUuid: 'parent-folder-uuid',
      });

      const result = mapFolder(folder);

      expect(result.parentUuid).toBe('parent-folder-uuid');
    });

    it('should default missing parentUuid and bucket to null', () => {
      // Given
      const folder = createFolderSyncDtoFixture({
        parentUuid: undefined,
        bucket: undefined,
      });

      // When
      const result = mapFolder(folder);

      // Then
      expect(result.parentUuid).toBeUndefined();
      expect(result.bucket).toBe(null);
    });
  });
});
