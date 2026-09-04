import { TemporalFile } from './TemporalFile';

describe('TemporalFile', () => {
  describe('isEmpty', () => {
    it('should detect zero-byte temporal files', () => {
      const temporalFile = TemporalFile.from({
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        path: '/empty-file.txt',
        size: 0,
      });

      expect(temporalFile.isEmpty()).toBe(true);
    });

    it('should not mark files with content as empty', () => {
      const temporalFile = TemporalFile.from({
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        path: '/filled-file.txt',
        size: 12,
      });

      expect(temporalFile.isEmpty()).toBe(false);
    });
  });

  describe('isTemporaryPath', () => {
    it('should detect vim swap files', () => {
      expect(TemporalFile.isTemporaryPath('/Documents/.test-file.txt.swp')).toBe(true);
      expect(TemporalFile.isTemporaryPath('/Documents/.test-file.txt.swx')).toBe(true);
    });

    it('should detect vim backup files', () => {
      expect(TemporalFile.isTemporaryPath('/Documents/test-file.txt~')).toBe(true);
    });

    it('should detect vim probe files', () => {
      expect(TemporalFile.isTemporaryPath('/Documents/4913')).toBe(true);
    });

    it('should not classify regular files as auxiliary', () => {
      expect(TemporalFile.isTemporaryPath('/Documents/test-file.txt')).toBe(false);
    });
  });
  it('round-trips the revision through attributes(), so a copy is not silently unversioned', () => {
    const file = TemporalFile.from({
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      modifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      path: '/Documents/report.pdf',
      size: 10,
      revision: 9,
    });

    expect(TemporalFile.from(file.attributes()).revision).toBe(9);
  });
});
