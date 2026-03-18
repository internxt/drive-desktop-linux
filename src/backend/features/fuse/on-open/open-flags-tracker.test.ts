import {
  isSystemOpen,
  isUserOpen,
  onRelease,
  shouldDownload,
  SYSTEM_OPEN_FLAG,
  trackOpen,
  USER_OPEN_FLAG,
} from './open-flags-tracker';

describe('open-flags-tracker', () => {
  describe('isSystemOpen', () => {
    it('should return true when given the system open flag', () => {
      const result = isSystemOpen(SYSTEM_OPEN_FLAG);

      expect(result).toBe(true);
    });

    it('should return false when given a non-system flag', () => {
      const result = isSystemOpen(USER_OPEN_FLAG);

      expect(result).toBe(false);
    });
  });

  describe('isUserOpen', () => {
    it('should return true when given the user open flag', () => {
      const result = isUserOpen(USER_OPEN_FLAG);

      expect(result).toBe(true);
    });

    it('should return false when given a non-user flag', () => {
      const result = isUserOpen(SYSTEM_OPEN_FLAG);

      expect(result).toBe(false);
    });
  });

  describe('trackOpen', () => {
    afterEach(() => {
      onRelease('/test.mp4');
    });

    it('should store the flag so shouldDownload can use it', () => {
      trackOpen('/test.mp4', SYSTEM_OPEN_FLAG);

      const result = shouldDownload('/test.mp4');

      expect(result).toBe(false);

      trackOpen('/test.png', SYSTEM_OPEN_FLAG);
      
      const result2 = shouldDownload('/test.png');
      expect(result2).toBe(true);
    });
  });

  describe('shouldDownload', () => {
    afterEach(() => {
      onRelease('/test.mp4');
      onRelease('/test.png');
    });

    it('should return true when no flag found for a given path', () => {
      const result = shouldDownload('/test.mp4');

      expect(result).toBe(true);
    });

    it('should return true when given a path extension is in whitelist', () => {
      trackOpen('/test.png', SYSTEM_OPEN_FLAG);

      const result = shouldDownload('/test.png');

      expect(result).toBe(true);
    });

    it('should return false when given a flag is systemOpen', () => {
      trackOpen('/test.mp4', SYSTEM_OPEN_FLAG);

      const result = shouldDownload('/test.mp4');

      expect(result).toBe(false);
    });

    it('should return true when given a flag is not systemOpen', () => {
      trackOpen('/test.mp4', 34816);

      const result = shouldDownload('/test.mp4');

      expect(result).toBe(true);
    });

    it('should return true when given a path extension is not in whitelist and is not systemOpen', () => {
      trackOpen('/test.mp4', USER_OPEN_FLAG);

      const result = shouldDownload('/test.mp4');

      expect(result).toBe(true);
    });
  });

  describe('onRelease', () => {
    it('should clear the flag so shouldDownload returns true', () => {
      trackOpen('/test.mp4', SYSTEM_OPEN_FLAG);

      onRelease('/test.mp4');

      const result = shouldDownload('/test.mp4');
      expect(result).toBe(true);
    });
  });
});
