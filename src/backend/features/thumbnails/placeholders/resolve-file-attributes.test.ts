import { resolveFileAttributes } from './resolve-file-attributes';
import { FILE_MODE } from '../../virtual-drive/constants';
import type { File } from '../../../../context/virtual-drive/files/domain/File';

describe('resolve-file-attributes', () => {
  const file = {
    nameWithExtension: 'sample.png',
    size: 50_000,
    createdAt: new Date('2025-01-01'),
    modificationTime: new Date('2025-01-02'),
  } as unknown as File;

  it('should return placeholder size when inspected by thumbnailer and not cached locally', () => {
    const attrs = resolveFileAttributes({
      file,
      isCachedLocally: false,
      processName: 'gnome-thumbnail',
    });

    expect(attrs.mode).toBe(FILE_MODE);
    expect(attrs.size).toBeLessThan(50_000);
    expect(attrs.size).toBeGreaterThan(0);
  });

  it('should return real file size when inspected by normal application', () => {
    const attrs = resolveFileAttributes({
      file,
      isCachedLocally: false,
      processName: 'vlc',
    });

    expect(attrs.mode).toBe(FILE_MODE);
    expect(attrs.size).toBe(50_000);
  });

  it('should return real file size when file is already cached locally', () => {
    const attrs = resolveFileAttributes({
      file,
      isCachedLocally: true,
      processName: 'gnome-thumbnail',
    });

    expect(attrs.mode).toBe(FILE_MODE);
    expect(attrs.size).toBe(50_000);
  });
});
