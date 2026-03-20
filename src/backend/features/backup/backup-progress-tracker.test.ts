import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackupProgressTracker } from './backup-progress-tracker';
import {
  createInitialState,
  initializeWeights,
  setCurrentBackupId,
  incrementProcessed,
  markBackupAsCompleted,
  getPercentage,
  resetState,
} from './backup-progress-state';
import { broadcastToWindows } from '../../../apps/main/windows';

vi.mock('../../../apps/main/windows', () => ({
  broadcastToWindows: vi.fn(),
}));

describe('BackupProgressTracker - Functional approach', () => {
  let tracker: BackupProgressTracker;

  beforeEach(() => {
    tracker = new BackupProgressTracker();
    vi.clearAllMocks();
  });

  describe('initializeWeights', () => {
    it('should initialize weights for multiple backups', () => {
      const backupIds = ['backup-a', 'backup-b', 'backup-c'];
      const fileCounts = new Map([
        ['backup-a', 100],
        ['backup-b', 200],
        ['backup-c', 200],
      ]);

      tracker.initializeWeights(backupIds, fileCounts);

      // After initialization, percentages should still be 0
      expect(tracker.getPercentage()).toBe(0);
    });

    it('should handle single backup', () => {
      const backupIds = ['backup-a'];
      const fileCounts = new Map([['backup-a', 100]]);

      tracker.initializeWeights(backupIds, fileCounts);

      expect(tracker.getPercentage()).toBe(0);
    });

    it('should handle empty file counts gracefully', () => {
      const backupIds = ['backup-a'];
      const fileCounts = new Map([['backup-a', 0]]);

      tracker.initializeWeights(backupIds, fileCounts);

      expect(tracker.getPercentage()).toBe(0);
    });
  });

  describe('setCurrentBackupId', () => {
    it('should set current backup id', () => {
      const backupIds = ['backup-a', 'backup-b'];
      const fileCounts = new Map([
        ['backup-a', 100],
        ['backup-b', 50],
      ]);

      tracker.initializeWeights(backupIds, fileCounts);
      tracker.setCurrentBackupId('backup-a');

      // Should still be 0 initially
      expect(tracker.getPercentage()).toBe(0);
    });

    it('should reset processed items when setting new backup', () => {
      const backupIds = ['backup-a', 'backup-b'];
      const fileCounts = new Map([
        ['backup-a', 100],
        ['backup-b', 50],
      ]);

      tracker.initializeWeights(backupIds, fileCounts);
      tracker.setCurrentBackupId('backup-a');
      tracker.incrementProcessed(50);

      expect(tracker.getPercentage()).toBeGreaterThan(0);

      tracker.setCurrentBackupId('backup-b');
      // Processed should reset to 0 for new backup
      expect(tracker.getPercentage()).toBeLessThan(50); // Should be backup-a (67%) * 50% = ~33%
    });
  });

  describe('incrementProcessed with weighted calculation', () => {
    it('should calculate weighted progress for single backup', () => {
      const backupIds = ['backup-a'];
      const fileCounts = new Map([['backup-a', 100]]);

      tracker.initializeWeights(backupIds, fileCounts);
      tracker.setCurrentBackupId('backup-a');
      tracker.incrementProcessed(25);

      // 25/100 * 100% = 25%
      expect(tracker.getPercentage()).toBe(25);
    });

    it('should calculate weighted progress for multiple backups', () => {
      const backupIds = ['backup-a', 'backup-b'];
      const fileCounts = new Map([
        ['backup-a', 100],  // 66.7% weight
        ['backup-b', 50],   // 33.3% weight
      ]);

      tracker.initializeWeights(backupIds, fileCounts);

      // Process backup-a halfway
      tracker.setCurrentBackupId('backup-a');
      tracker.incrementProcessed(50);

      // Should be around 33% (50/100 * 0.667 = 0.333)
      expect(tracker.getPercentage()).toBe(33);
    });

    it('should accumulate progress correctly across backups', () => {
      const backupIds = ['backup-a', 'backup-b'];
      const fileCounts = new Map([
        ['backup-a', 100],  // 66.7% weight
        ['backup-b', 50],   // 33.3% weight
      ]);

      tracker.initializeWeights(backupIds, fileCounts);

      // Complete backup-a
      tracker.setCurrentBackupId('backup-a');
      tracker.incrementProcessed(100);
      expect(tracker.getPercentage()).toBe(67);

      // Mark backup-a as completed
      tracker.markBackupAsCompleted('backup-a');

      // Start backup-b
      tracker.setCurrentBackupId('backup-b');
      tracker.incrementProcessed(25);

      // Should be 67% (completed a) + 25/50 * 33% = 67% + 16% = 83%
      expect(tracker.getPercentage()).toBe(83);
    });

    it('should emit progress after incrementing', () => {
      const backupIds = ['backup-a'];
      const fileCounts = new Map([['backup-a', 100]]);

      tracker.initializeWeights(backupIds, fileCounts);
      tracker.setCurrentBackupId('backup-a');
      tracker.incrementProcessed(50);

      expect(broadcastToWindows).toHaveBeenCalledWith('backup-progress', 50);
    });

    it('should handle increments accumulating', () => {
      const backupIds = ['backup-a'];
      const fileCounts = new Map([['backup-a', 100]]);

      tracker.initializeWeights(backupIds, fileCounts);
      tracker.setCurrentBackupId('backup-a');

      tracker.incrementProcessed(25);
      expect(tracker.getPercentage()).toBe(25);

      tracker.incrementProcessed(25);
      expect(tracker.getPercentage()).toBe(50);

      tracker.incrementProcessed(50);
      expect(tracker.getPercentage()).toBe(100);
    });
  });

  describe('markBackupAsCompleted', () => {
    it('should mark backup as completed', () => {
      const backupIds = ['backup-a', 'backup-b'];
      const fileCounts = new Map([
        ['backup-a', 10],
        ['backup-b', 5],
      ]);

      tracker.initializeWeights(backupIds, fileCounts);
      tracker.setCurrentBackupId('backup-a');
      tracker.incrementProcessed(10);

      // At 66% (10/15 items)
      expect(tracker.getPercentage()).toBe(67);

      tracker.markBackupAsCompleted('backup-a');

      // Should stay at 67%
      expect(tracker.getPercentage()).toBe(67);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const backupIds = ['backup-a'];
      const fileCounts = new Map([['backup-a', 100]]);

      tracker.initializeWeights(backupIds, fileCounts);
      tracker.setCurrentBackupId('backup-a');
      tracker.incrementProcessed(50);

      expect(tracker.getPercentage()).toBe(50);

      tracker.reset();

      expect(tracker.getPercentage()).toBe(0);
    });
  });
});

describe('Pure functional backup progress state', () => {
  describe('createInitialState', () => {
    it('should create empty state', () => {
      const state = createInitialState();

      expect(state.processedItems).toBe(0);
      expect(state.backupWeights.size).toBe(0);
      expect(state.backupTotals.size).toBe(0);
      expect(state.currentBackupId).toBe('');
      expect(state.completedBackups.size).toBe(0);
    });
  });

  describe('initializeWeights', () => {
    it('should calculate correct weights', () => {
      const state = createInitialState();
      const backupIds = ['a', 'b'];
      const fileCounts = new Map([
        ['a', 100],
        ['b', 100],
      ]);

      const newState = initializeWeights(state, backupIds, fileCounts);

      expect(newState.backupWeights.get('a')).toBe(0.5);
      expect(newState.backupWeights.get('b')).toBe(0.5);
    });

    it('should handle unequal weights', () => {
      const state = createInitialState();
      const backupIds = ['a', 'b'];
      const fileCounts = new Map([
        ['a', 100],
        ['b', 50],
      ]);

      const newState = initializeWeights(state, backupIds, fileCounts);

      expect(newState.backupWeights.get('a')).toBeCloseTo(0.667, 2);
      expect(newState.backupWeights.get('b')).toBeCloseTo(0.333, 2);
    });
  });

  describe('getPercentage', () => {
    it('should calculate percentage with weights', () => {
      let state = createInitialState();

      const backupIds = ['a', 'b'];
      const fileCounts = new Map([
        ['a', 100],
        ['b', 50],
      ]);

      state = initializeWeights(state, backupIds, fileCounts);
      state = setCurrentBackupId(state, 'a');
      state = incrementProcessed(state, 50);

      // 50/100 * 0.667 = 33.35% ≈ 33%
      expect(getPercentage(state)).toBe(33);
    });

    it('should accumulate completed backups', () => {
      let state = createInitialState();

      const backupIds = ['a', 'b'];
      const fileCounts = new Map([
        ['a', 100],
        ['b', 50],
      ]);

      state = initializeWeights(state, backupIds, fileCounts);
      state = setCurrentBackupId(state, 'a');
      state = incrementProcessed(state, 100);
      state = markBackupAsCompleted(state, 'a');

      expect(getPercentage(state)).toBeCloseTo(67, 0);

      state = setCurrentBackupId(state, 'b');
      state = incrementProcessed(state, 50);

      // 67% (completed a) + 100/50 * 33% = 100%
      expect(getPercentage(state)).toBe(100);
    });
  });

  describe('resetState', () => {
    it('should return initial state', () => {
      const state = resetState();

      expect(state.processedItems).toBe(0);
      expect(state.backupWeights.size).toBe(0);
      expect(state.completedBackups.size).toBe(0);
    });
  });
});
