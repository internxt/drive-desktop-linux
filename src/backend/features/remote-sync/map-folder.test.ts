import { resolveFolderStatus, mapFolder } from './map-folder';
import type { FolderSyncMappingDto } from './types';

const createFolderSyncDtoFixture = (payload: Partial<FolderSyncMappingDto> = {}): FolderSyncMappingDto => ({
  uuid: 'folder-uuid',
  type: 'folder',
  bucket: 'bucket-1',
  userId: 1,
  parentUuid: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  plainName: 'My Folder',
  status: 'EXISTS',
  ...payload,
});

describe('map-folder', () => {
  describe('resolveFolderStatus', () => {
    it('should return EXISTS when status is EXISTS', () => {
      // When
      const result = resolveFolderStatus({ status: 'EXISTS' });

      // Then
      expect(result).toBe('EXISTS');
    });

    it('should return TRASHED when status is TRASHED', () => {
      // When
      const result = resolveFolderStatus({ status: 'TRASHED' });

      // Then
      expect(result).toBe('TRASHED');
    });

    it('should return DELETED when status is DELETED', () => {
      // When
      const result = resolveFolderStatus({ status: 'DELETED' });

      // Then
      expect(result).toBe('DELETED');
    });
  });

  describe('mapFolder', () => {
    it('should map all folder properties with resolved status', () => {
      // Given
      const folder = createFolderSyncDtoFixture({
        uuid: 'folder-uuid',
        plainName: 'My Folder',
        status: 'EXISTS',
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
