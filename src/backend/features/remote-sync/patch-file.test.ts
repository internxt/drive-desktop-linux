import { patchFile } from './patch-file';
import type { FileSyncDto } from './types';

const createFileSyncDtoFixture = (payload: Partial<FileSyncDto> = {}): FileSyncDto => ({
  id: 1,
  uuid: 'file-uuid-1',
  fileId: 'file-id-123',
  name: 'test.jpg',
  size: '2048',
  type: 'jpg',
  bucket: 'bucket-1',
  folderId: 10,
  folderUuid: 'folder-1',
  encryptVersion: '1',
  userId: 1,
  creationTime: '2026-01-01T00:00:00.000Z',
  modificationTime: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  plainName: 'test.jpg',
  status: 'EXISTS',
  ...payload,
});

describe('patch-file', () => {
  it('should normalize file payload with parsed integer size and string fileId', () => {
    // Given
    const file = createFileSyncDtoFixture({
      id: 1,
      uuid: 'file-uuid-1',
      fileId: 'file-id-123',
      name: 'test.jpg',
      size: '2048',
      type: 'jpg',
    });

    // When
    const result = patchFile(file);

    // Then
    expect(result).toMatchObject({
      id: 1,
      uuid: 'file-uuid-1',
      fileId: 'file-id-123',
      name: 'test.jpg',
      size: 2048,
      type: 'jpg',
    });
  });

  it('should handle empty fileId and undefined name when name is empty', () => {
    // Given
    const file = createFileSyncDtoFixture({
      id: 2,
      uuid: 'file-uuid-2',
      fileId: null,
      name: '',
      size: '4096',
    });

    // When
    const result = patchFile(file);

    // Then
    expect(result.fileId).toBe('');
    expect(result.size).toBe(4096);
    expect(result.name).toBeUndefined();
  });
});
