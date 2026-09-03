import { File } from './File';
import { FileStatuses } from './FileStatus';

describe('File', () => {
  const fileMock = {
    id: 1,
    uuid: 'f654a669-094f-43cc-9b6a-a819cfeee74c',
    contentsId: '21e5ac20-4d87-4458-9cb5-',
    folderId: 100,
    createdAt: '2025-01-01T00:00:00.000Z',
    modificationTime: '2025-01-01T00:00:00.000Z',
    path: '/documents/file.txt',
    size: 1000,
    updatedAt: '2025-01-01T00:00:00.000Z',
    status: FileStatuses.EXISTS,
  };

  describe('modificationTime', () => {
    // The two times are deliberately DIFFERENT in every case below. When the
    // fixture gives them the same value, an assertion cannot tell which field
    // was read and passes whichever one the code uses.
    const CONTENT_TIME = '2024-03-04T05:06:07.000Z';
    const ROW_TIME = '2025-01-01T00:00:00.000Z';

    it('should keep the modification time it was built with, not the row time', () => {
      const file = File.from({ ...fileMock, modificationTime: CONTENT_TIME, updatedAt: ROW_TIME });

      expect(file.modificationTime.toISOString()).toBe(CONTENT_TIME);
      expect(file.updatedAt.toISOString()).toBe(ROW_TIME);
    });

    it('should fall back to the row time when there is no modification time', () => {
      const file = File.from({ ...fileMock, modificationTime: '', updatedAt: ROW_TIME });

      expect(file.modificationTime.toISOString()).toBe(ROW_TIME);
    });

    it('should fall back to the row time when the modification time cannot be parsed', () => {
      const file = File.from({ ...fileMock, modificationTime: 'not a date', updatedAt: ROW_TIME });

      expect(file.modificationTime.toISOString()).toBe(ROW_TIME);
    });

    it('should emit the modification time in its attributes rather than the row time', () => {
      const file = File.from({ ...fileMock, modificationTime: CONTENT_TIME, updatedAt: ROW_TIME });

      expect(file.attributes().modificationTime).toBe(CONTENT_TIME);
    });

    it('should not write the fallback into its attributes, so unknown stays unknown', () => {
      // The getter falls back to updatedAt for stat's benefit. Persisting that
      // fallback would record a guess as though the server had supplied it, and
      // a legacy record would lose "unknown" the first time it was saved.
      const file = File.from({ ...fileMock, modificationTime: '', updatedAt: ROW_TIME });

      expect(file.modificationTime.toISOString()).toBe(ROW_TIME);
      expect(file.attributes().modificationTime).toBeUndefined();
    });

    it('should update the modification time when provided', () => {
      const file = File.from({ ...fileMock, modificationTime: CONTENT_TIME, updatedAt: ROW_TIME });

      file.update({ modificationTime: '2021-02-03T04:05:06.000Z' });

      expect(file.modificationTime.toISOString()).toBe('2021-02-03T04:05:06.000Z');
    });

    it('should let a known modification time be cleared back to unknown', () => {
      // A truthiness check here could never carry an empty value back: once a
      // file had a time, nothing could tell it the server no longer has one.
      const file = File.from({ ...fileMock, modificationTime: CONTENT_TIME, updatedAt: ROW_TIME });

      file.update({ modificationTime: '' });

      expect(file.attributes().modificationTime).toBeUndefined();
      expect(file.modificationTime.toISOString()).toBe(ROW_TIME);
    });
  });

  describe('update', () => {
    it('should update the path when provided', () => {
      const file = File.from(fileMock);
      const newPath = '/documents/updated/file.txt';

      file.update({ path: newPath });

      expect(file.path).toBe(newPath);
    });

    it('should update the folderId when provided', () => {
      const file = File.from(fileMock);
      const newFolderId = 200;

      file.update({ folderId: newFolderId });

      expect(file.folderId).toBe(newFolderId);
    });

    it('should update the size when provided', () => {
      const file = File.from(fileMock);
      const newSize = 2000;

      file.update({ size: newSize });

      expect(file.size).toBe(newSize);
    });

    it('should update the contentsId when provided', () => {
      const file = File.from(fileMock);
      const newContentsId = 'new-contents-id-12345678';

      file.update({ contentsId: newContentsId });

      expect(file.contentsId).toBe(newContentsId);
    });

    it('should update the status when provided', () => {
      const file = File.from(fileMock);

      file.update({ status: FileStatuses.TRASHED });

      expect(file.status.value).toBe(FileStatuses.TRASHED);
    });

    it('should update the updatedAt when provided', () => {
      const file = File.from(fileMock);
      const newUpdatedAt = '2025-12-31T23:59:59.000Z';

      file.update({ updatedAt: newUpdatedAt });

      expect(file.updatedAt.toISOString()).toBe(newUpdatedAt);
    });

    it('should update the createdAt when provided', () => {
      const file = File.from(fileMock);
      const newCreatedAt = '2025-06-15T12:00:00.000Z';

      file.update({ createdAt: newCreatedAt });

      expect(file.createdAt.toISOString()).toBe(newCreatedAt);
    });

    it('should update multiple attributes at once', () => {
      const file = File.from(fileMock);
      const updates = {
        path: '/new/path/file.txt',
        folderId: 300,
        size: 3000,
        contentsId: 'new-contents-id-12345678',
        status: FileStatuses.TRASHED,
      };

      file.update(updates);

      expect(file.path).toBe(updates.path);
      expect(file.folderId).toBe(updates.folderId);
      expect(file.size).toBe(updates.size);
      expect(file.contentsId).toBe(updates.contentsId);
      expect(file.status.value).toBe(updates.status);
    });
  });
});
