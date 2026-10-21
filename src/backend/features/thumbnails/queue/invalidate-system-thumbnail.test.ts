import { createHash } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS } from '../../../../core/electron/paths';
import { invalidateSystemThumbnail } from './invalidate-system-thumbnail';

vi.mock('node:fs/promises');
vi.mock('@internxt/drive-desktop-core/build/backend');

describe('invalidate-system-thumbnail', () => {
  it('should remove all standard Freedesktop cache variants for the file URI', async () => {
    const filePath = '/home/user/Internxt Drive/photo.jpg';
    const key = createHash('md5').update(pathToFileURL(filePath).href).digest('hex');
    vi.mocked(unlink).mockResolvedValue(undefined);

    await invalidateSystemThumbnail({ filePath });

    expect(unlink).toHaveBeenCalledTimes(3);
    expect(unlink).toHaveBeenCalledWith(join(PATHS.THUMBNAILS_FOLDER, 'normal', `${key}.png`));
    expect(unlink).toHaveBeenCalledWith(join(PATHS.THUMBNAILS_FOLDER, 'large', `${key}.png`));
    expect(unlink).toHaveBeenCalledWith(join(PATHS.THUMBNAILS_FOLDER, 'fail', `${key}.png`));
  });

  it('should ignore a cache entry that does not exist yet', async () => {
    vi.mocked(unlink).mockRejectedValue({ code: 'ENOENT' });

    await expect(
      invalidateSystemThumbnail({ filePath: '/home/user/Internxt Drive/photo.jpg' }),
    ).resolves.toBeUndefined();
  });
});
