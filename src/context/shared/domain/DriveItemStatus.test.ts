import { DriveItemStatus, isDriveItemStatus, toDriveItemStatus } from './DriveItemStatus';

describe('DriveItemStatus', () => {
  describe('isDriveItemStatus', () => {
    it('should return true for known status values', () => {
      expect(isDriveItemStatus('EXISTS')).toBe(true);
      expect(isDriveItemStatus('TRASHED')).toBe(true);
      expect(isDriveItemStatus('DELETED')).toBe(true);
    });

    it('should return false for unknown values', () => {
      expect(isDriveItemStatus('REMOVED')).toBe(false);
      expect(isDriveItemStatus('')).toBe(false);
    });
  });

  describe('toDriveItemStatus', () => {
    it('should return the status when value is valid', () => {
      expect(toDriveItemStatus('EXISTS')).toBe(DriveItemStatus.EXISTS);
    });

    it('should throw when value is invalid', () => {
      expect(() => toDriveItemStatus('REMOVED')).toThrow('Invalid drive item status: REMOVED');
    });
  });
});
