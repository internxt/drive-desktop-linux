import type { File } from '../../../../context/virtual-drive/files/domain/File';
import { getThumbnailHydrationTargetBytes } from './thumbnail-hydration-target';
import { MAX_VIDEO_THUMBNAIL_HYDRATION_BYTES } from '../thumbnail.constants';

describe('thumbnail-hydration-target', () => {
  it('should hydrate images completely', () => {
    const file = {
      nameWithExtension: 'photo.jpg',
      size: 50 * 1024 * 1024,
    } as unknown as File;

    const targetBytes = getThumbnailHydrationTargetBytes({ file });

    expect(targetBytes).toBe(50 * 1024 * 1024);
  });

  it('should cap video hydration at MAX_VIDEO_THUMBNAIL_HYDRATION_BYTES if larger', () => {
    const file = {
      nameWithExtension: 'movie.mp4',
      size: 500 * 1024 * 1024,
    } as unknown as File;

    const targetBytes = getThumbnailHydrationTargetBytes({ file });

    expect(targetBytes).toBe(MAX_VIDEO_THUMBNAIL_HYDRATION_BYTES);
  });

  it('should not exceed file size for small videos', () => {
    const file = {
      nameWithExtension: 'clip.mp4',
      size: 5 * 1024 * 1024,
    } as unknown as File;

    const targetBytes = getThumbnailHydrationTargetBytes({ file });

    expect(targetBytes).toBe(5 * 1024 * 1024);
  });
});
