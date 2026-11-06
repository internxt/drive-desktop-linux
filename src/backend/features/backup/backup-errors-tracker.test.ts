import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackupErrorsTracker } from './backup-errors-tracker';
import { broadcastToWindows } from '../../../apps/main/windows';

vi.mock('../../../apps/main/windows', () => ({
  broadcastToWindows: vi.fn(),
}));

describe('BackupErrorsTracker', () => {
  let tracker: BackupErrorsTracker;

  beforeEach(() => {
    tracker = new BackupErrorsTracker();
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(tracker).toBeDefined();
  });

  describe('clear', () => {
    it('should create a new empty errors map and broadcast it', () => {
      tracker.add('uuid-1', { name: 'folder1', error: 'BAD_RESPONSE' });
      tracker.add('uuid-2', { name: 'folder2', error: 'EMPTY_FILE' });

      tracker.clear();

      expect(tracker.getAll()).toEqual([]);
      expect(broadcastToWindows).toHaveBeenLastCalledWith('backup-fatal-errors-changed', []);
    });
  });

  describe('add', () => {
    it('should add the error to the map and broadcast it', () => {
      const error = { name: 'test-folder', error: 'BAD_RESPONSE' as const };

      tracker.add('folder-uuid-123', error);

      expect(tracker.get('folder-uuid-123')).toEqual(error);
      expect(broadcastToWindows).toHaveBeenCalledWith('backup-fatal-errors-changed', [error]);
    });

    it('should not set duplicate errors for the same folderUuid', () => {
      const firstError = { name: 'folder1', error: 'BAD_RESPONSE' as const };
      const secondError = { name: 'folder1-updated', error: 'EMPTY_FILE' as const };

      tracker.add('folder-uuid-1', firstError);
      tracker.add('folder-uuid-1', secondError);

      expect(tracker.getAll()).toHaveLength(1);
      expect(tracker.get('folder-uuid-1')).toEqual(secondError);
    });
  });

  describe('get', () => {
    it('should return the error for the given folderUuid', () => {
      const error = { name: 'test-folder', error: 'BAD_RESPONSE' as const };
      tracker.add('folder-uuid-42', error);

      const result = tracker.get('folder-uuid-42');

      expect(result).toEqual(error);
    });

    it('should return undefined if there is no error for the given folderUuid', () => {
      const result = tracker.get('missing-uuid');

      expect(result).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all error records as an array', () => {
      const error1 = { name: 'folder1', error: 'BAD_RESPONSE' as const };
      const error2 = { name: 'folder2', error: 'EMPTY_FILE' as const };
      const error3 = { name: 'folder3', error: 'NO_INTERNET' as const };

      tracker.add('uuid-1', error1);
      tracker.add('uuid-2', error2);
      tracker.add('uuid-3', error3);

      const result = tracker.getAll();

      expect(result).toEqual([error1, error2, error3]);
    });

    it('should return an empty array if there are no errors', () => {
      const result = tracker.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('lastBackupHadFatalIssue', () => {
    it('should return true if the last error is fatal', () => {
      tracker.add('uuid-1', { name: 'folder1', error: 'BAD_RESPONSE' });
      tracker.add('uuid-2', { name: 'folder2', error: 'NO_INTERNET' });

      const result = tracker.lastBackupHadFatalIssue();

      expect(result).toBe(true);
    });

    it('should return false if the last error is not fatal', () => {
      tracker.add('uuid-1', { name: 'folder1', error: 'NO_INTERNET' });
      tracker.add('uuid-2', { name: 'folder2', error: 'BAD_RESPONSE' });

      const result = tracker.lastBackupHadFatalIssue();

      expect(result).toBe(false);
    });

    it('should return false if there are no errors', () => {
      const result = tracker.lastBackupHadFatalIssue();

      expect(result).toBe(false);
    });
  });
});
