import { BackupProgressTracker } from './backup-progress-tracker';
import {
  createInitialState,
  initializeBackupProgressWeights,
  setCurrentBackupId,
  incrementProcessed,
  markBackupAsCompleted,
  getPercentage,
  resetState,
} from './initializeBackupProgressWeights';
import { broadcastToWindows } from '../../../apps/main/windows';

vi.mock('../../../apps/main/windows', () => ({
  broadcastToWindows: vi.fn(),
}));

describe('BackupProgressTracker', () => {
  let tracker: BackupProgressTracker;

  beforeEach(() => {
    tracker = new BackupProgressTracker();
  });

  describe('initializeBackupProgressWeights', () => {
    it('should initialize weights for multiple backups', () => {
      const backupIds = ['backup-a', 'backup-b', 'backup-c'];
      const fileCounts = new Map([
        ['backup-a', 100],
        ['backup-b', 200],
        ['backup-c', 200],
      ]);

      tracker.initializeBackupProgressWeights(backupIds, fileCounts);

      expect(tracker.getPercentage()).toBe(0);
    });
  });

  describe('setCurrentBackupId', () => {
    beforeEach(() => {
      const backupIds = ['backup-a', 'backup-b'];
      const fileCounts = new Map([
        ['backup-a', 100],
        ['backup-b', 100],
      ]);

      tracker.initializeBackupProgressWeights(backupIds, fileCounts);
      tracker.setCurrentBackupId('backup-a');
    });

    it('should set current backup id', () => {
      // Should still be 0 initially
      expect(tracker.getPercentage()).toBe(0);
    });

    it('should reset processed items when setting new backup', () => {
      tracker.incrementProcessed(50);

      // 50/100 * 50% weight = 25%
      expect(tracker.getPercentage()).toBe(25);

      tracker.setCurrentBackupId('backup-b');
      // processed items reset, backup-a not marked as completed so contribution is lost
      expect(tracker.getPercentage()).toBe(0);
    });
  });

  describe('incrementProcessed with weighted calculation', () => {
    describe('single backup', () => {
      beforeEach(() => {
        tracker.initializeBackupProgressWeights(['backup-a'], new Map([['backup-a', 100]]));
        tracker.setCurrentBackupId('backup-a');
      });

      it('should calculate weighted progress', () => {
        tracker.incrementProcessed(25);

        // 25/100 * 100% = 25%
        expect(tracker.getPercentage()).toBe(25);
      });

      it('should emit progress after incrementing', () => {
        tracker.incrementProcessed(50);

        expect(broadcastToWindows).toHaveBeenCalledWith('backup-progress', 50);
      });

      it('should handle increments accumulating', () => {
        tracker.incrementProcessed(25);
        expect(tracker.getPercentage()).toBe(25);

        tracker.incrementProcessed(25);
        expect(tracker.getPercentage()).toBe(50);

        tracker.incrementProcessed(50);
        expect(tracker.getPercentage()).toBe(100);
      });
    });

    describe('multiple backups', () => {
      beforeEach(() => {
        const fileCounts = new Map([
          ['backup-a', 100], // 66.7% weight
          ['backup-b', 50], // 33.3% weight
        ]);
        tracker.initializeBackupProgressWeights(['backup-a', 'backup-b'], fileCounts);
        tracker.setCurrentBackupId('backup-a');
      });

      it('should calculate weighted progress', () => {
        tracker.incrementProcessed(50);

        // Should be around 33% (50/100 * 0.667 = 0.333)
        expect(tracker.getPercentage()).toBe(33);
      });

      it('should accumulate progress correctly across backups', () => {
        tracker.incrementProcessed(100);
        expect(tracker.getPercentage()).toBe(67);

        tracker.markBackupAsCompleted('backup-a');

        tracker.setCurrentBackupId('backup-b');
        tracker.incrementProcessed(25);

        // Should be 67% (completed a) + 25/50 * 33% = 67% + 16% = 83%
        expect(tracker.getPercentage()).toBe(83);
      });
    });
  });

  describe('markBackupAsCompleted', () => {
    it('should mark backup as completed', () => {
      const backupIds = ['backup-a', 'backup-b'];
      const fileCounts = new Map([
        ['backup-a', 10],
        ['backup-b', 5],
      ]);

      tracker.initializeBackupProgressWeights(backupIds, fileCounts);
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

      tracker.initializeBackupProgressWeights(backupIds, fileCounts);
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

  describe('initializeBackupProgressWeights', () => {
    it('should calculate correct weights', () => {
      const state = createInitialState();
      const backupIds = ['a', 'b'];
      const fileCounts = new Map([
        ['a', 100],
        ['b', 100],
      ]);

      const newState = initializeBackupProgressWeights(state, backupIds, fileCounts);

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

      const newState = initializeBackupProgressWeights(state, backupIds, fileCounts);

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

      state = initializeBackupProgressWeights(state, backupIds, fileCounts);
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

      state = initializeBackupProgressWeights(state, backupIds, fileCounts);
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
