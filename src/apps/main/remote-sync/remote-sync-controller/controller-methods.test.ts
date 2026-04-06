import { createControllerState } from './create-controller-state';
import { getSyncStatus, getTotalFilesSynced, onStatusChange } from './controller-methods';

describe('controller-methods.test', () => {
  it('should return the status and total files from state', () => {
    // Given
    const state = createControllerState();
    state.status = 'SYNCED';
    state.totalFilesSynced = 12;

    // Then
    expect(getSyncStatus({ state })).toBe('SYNCED');
    expect(getTotalFilesSynced({ state })).toBe(12);
  });

  it('should register status change callbacks', () => {
    // Given
    const state = createControllerState();
    const callback = vi.fn();

    // When
    onStatusChange({ state, callback });

    // Then
    expect(state.onStatusChangeCallbacks).toStrictEqual([callback]);
  });

  it('should ignore invalid callbacks', () => {
    // Given
    const state = createControllerState();

    // When
    onStatusChange({ state, callback: undefined as never });

    // Then
    expect(state.onStatusChangeCallbacks).toHaveLength(0);
  });
});