import { isEmptyBackupFileWithoutFileId } from './is-empty-backup-file-without-file-id';

describe('is-empty-backup-file-without-file-id', () => {
  it('should return true when size is 0 and fileId is null', () => {
    // When
    const result = isEmptyBackupFileWithoutFileId({ size: 0, fileId: null });
    // Then
    expect(result).toBe(true);
  });

  it('should return true when size is string 0 and fileId is empty', () => {
    // When
    const result = isEmptyBackupFileWithoutFileId({ size: '0', fileId: '' });
    // Then
    expect(result).toBe(true);
  });

  it('should return false when size is greater than 0', () => {
    // When
    const result = isEmptyBackupFileWithoutFileId({ size: 1, fileId: null });
    // Then
    expect(result).toBe(false);
  });

  it('should return false when fileId exists', () => {
    // When
    const result = isEmptyBackupFileWithoutFileId({ size: 0, fileId: 'file-id' });
    // Then
    expect(result).toBe(false);
  });
});
