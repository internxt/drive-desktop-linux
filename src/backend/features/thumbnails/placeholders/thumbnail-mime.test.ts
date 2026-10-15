import { getMediaCategory, requiresThumbnail } from './thumbnail-mime';

describe('thumbnail-mime', () => {
  describe('getMediaCategory', () => {
    it('should return image category for image files', () => {
      expect(getMediaCategory({ fileName: 'photo.jpg' })).toBe('image');
      expect(getMediaCategory({ fileName: 'graphic.PNG' })).toBe('image');
      expect(getMediaCategory({ fileName: 'vector.svg' })).toBe('image');
    });

    it('should return video category for video files', () => {
      expect(getMediaCategory({ fileName: 'clip.mp4' })).toBe('video');
      expect(getMediaCategory({ fileName: 'movie.MKV' })).toBe('video');
    });

    it('should return unknown category for document files', () => {
      expect(getMediaCategory({ fileName: 'manual.pdf' })).toBe('unknown');
    });

    it('should return unknown category for unrecognized extensions', () => {
      expect(getMediaCategory({ fileName: 'data.bin' })).toBe('unknown');
      expect(getMediaCategory({ fileName: 'archive.tar.gz' })).toBe('unknown');
    });
  });

  describe('requiresThumbnail', () => {
    it('should return true for supported images and videos', () => {
      expect(requiresThumbnail({ fileName: 'photo.jpeg' })).toBe(true);
      expect(requiresThumbnail({ fileName: 'video.mov' })).toBe(true);
    });

    it('should support explicit extension parameter', () => {
      expect(requiresThumbnail({ fileName: 'file-without-ext', extension: '.png' })).toBe(true);
    });

    it('should return false for unsupported files', () => {
      expect(requiresThumbnail({ fileName: 'notes.txt' })).toBe(false);
      expect(requiresThumbnail({ fileName: 'code.ts' })).toBe(false);
      expect(requiresThumbnail({ fileName: 'installer.exe' })).toBe(false);
      expect(requiresThumbnail({ fileName: 'document.pdf' })).toBe(false);
    });
  });
});
