import { shouldServePlaceholder } from './should-serve-placeholder';

describe('should-serve-placeholder', () => {
  it('should return true for thumbnailer process when file needs thumbnail and is not cached', () => {
    expect(
      shouldServePlaceholder({
        processName: 'gnome-thumbnail',
        isCachedLocally: false,
        needsThumbnail: true,
      }),
    ).toBe(true);

    expect(
      shouldServePlaceholder({
        processName: 'pool-org.gnome.',
        isCachedLocally: false,
        needsThumbnail: true,
      }),
    ).toBe(true);
  });

  it('should return false if file is already cached locally', () => {
    expect(
      shouldServePlaceholder({
        processName: 'gnome-thumbnail',
        isCachedLocally: true,
        needsThumbnail: true,
      }),
    ).toBe(false);
  });

  it('should return false if file does not need a thumbnail', () => {
    expect(
      shouldServePlaceholder({
        processName: 'gnome-thumbnail',
        isCachedLocally: false,
        needsThumbnail: false,
      }),
    ).toBe(false);
  });

  it('should return false for normal applications (e.g. vlc, gimp)', () => {
    expect(
      shouldServePlaceholder({
        processName: 'vlc',
        isCachedLocally: false,
        needsThumbnail: true,
      }),
    ).toBe(false);
  });
});
