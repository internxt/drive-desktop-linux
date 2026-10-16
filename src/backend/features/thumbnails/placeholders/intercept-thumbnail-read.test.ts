import { interceptThumbnailRead } from './intercept-thumbnail-read';

vi.mock('@internxt/drive-desktop-core/build/backend');

describe('intercept-thumbnail-read', () => {
  it('should return placeholder chunk when reading thumbnail of uncached image', () => {
    const result = interceptThumbnailRead({
      processName: 'gnome-thumbnail',
      fileName: 'photo.jpg',
      isCachedLocally: false,
      offset: 0,
      length: 100,
    });

    expect(result).toBeDefined();
    expect(result?.data).toBeDefined();
    expect(result?.data.length).toBeGreaterThan(0);
  });

  it('should return undefined when process is not a thumbnailer', () => {
    const result = interceptThumbnailRead({
      processName: 'vlc',
      fileName: 'photo.jpg',
      isCachedLocally: false,
      offset: 0,
      length: 100,
    });

    expect(result).toBeUndefined();
  });

  it('should return undefined when file is already cached locally', () => {
    const result = interceptThumbnailRead({
      processName: 'gnome-thumbnail',
      fileName: 'photo.jpg',
      isCachedLocally: true,
      offset: 0,
      length: 100,
    });

    expect(result).toBeUndefined();
  });
});
