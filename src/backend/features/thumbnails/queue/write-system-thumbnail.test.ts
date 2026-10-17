import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS } from '../../../../core/electron/paths';
import { writeSystemThumbnail } from './write-system-thumbnail';

vi.mock('node:fs/promises');

describe('write-system-thumbnail', () => {
  const filePath = '/home/user/Internxt Drive/photo.jpg';
  const thumbnail = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  );
  const thumbnails = { normal: thumbnail, large: thumbnail };

  beforeEach(() => {
    vi.mocked(mkdir).mockResolvedValue(undefined);
    vi.mocked(writeFile).mockResolvedValue(undefined);
    vi.mocked(rename).mockResolvedValue(undefined);
    vi.mocked(unlink).mockResolvedValue(undefined);
  });

  it('should write metadata-bearing PNG thumbnails atomically to normal and large caches', async () => {
    await writeSystemThumbnail({
      filePath,
      fileSize: 4096,
      modificationTime: new Date('2025-01-01T00:00:00.000Z'),
      thumbnails,
    });

    const key = createHash('md5').update(pathToFileURL(filePath).href).digest('hex');
    expect(mkdir).toHaveBeenCalledWith(join(PATHS.THUMBNAILS_FOLDER, 'normal'), { recursive: true, mode: 0o700 });
    expect(mkdir).toHaveBeenCalledWith(join(PATHS.THUMBNAILS_FOLDER, 'large'), { recursive: true, mode: 0o700 });
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining('.tmp'), expect.any(Buffer), { mode: 0o600 });
    expect(rename).toHaveBeenCalledWith(
      expect.stringContaining('.tmp'),
      join(PATHS.THUMBNAILS_FOLDER, 'normal', `${key}.png`),
    );
    expect(rename).toHaveBeenCalledWith(
      expect.stringContaining('.tmp'),
      join(PATHS.THUMBNAILS_FOLDER, 'large', `${key}.png`),
    );

    const metadataPng = vi.mocked(writeFile).mock.calls[0][1];
    if (!Buffer.isBuffer(metadataPng)) throw new Error('Thumbnail cache data should be a buffer');
    const metadataText = metadataPng.toString('latin1');
    expect(metadataText).toContain(`Thumb::URI\0${pathToFileURL(filePath).href}`);
    expect(metadataText).toContain(
      `Thumb::MTime\0${Math.floor(new Date('2025-01-01T00:00:00.000Z').getTime() / 1000)}`,
    );
    expect(metadataText).toContain(`Thumb::Size\0${4096}`);
    expect(metadataText).toContain('Thumb::Mimetype\0image/jpeg');
  });

  it('should reject incomplete PNG data instead of writing an invalid cache entry', async () => {
    const result = await writeSystemThumbnail({
      filePath,
      fileSize: 10,
      modificationTime: new Date(),
      thumbnails: { normal: Buffer.from('not-png'), large: Buffer.from('not-png') },
    });

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Generated thumbnail is not a complete PNG');
    expect(writeFile).not.toHaveBeenCalled();
  });
});
