vi.mock('@internxt/drive-desktop-core/build/backend');

import { logger } from '@internxt/drive-desktop-core/build/backend';
import { createControllerState } from './create-controller-state';
import { changeStatus } from './change-status';

describe('change-status.test', () => {
  it('should update the status and notify callbacks', () => {
    // Given
    const state = createControllerState();
    const callback = vi.fn();
    state.onStatusChangeCallbacks.push(callback);

    // When
    changeStatus({ state, newStatus: 'SYNCING' });

    // Then
    expect(state.status).toBe('SYNCING');
    expect(callback).toHaveBeenCalledWith('SYNCING');
    expect(logger.debug).toHaveBeenCalledTimes(1);
  });

  it('should do nothing when the status is unchanged', () => {
    // Given
    const state = createControllerState();

    // When
    changeStatus({ state, newStatus: 'IDLE' });

    // Then
    expect(logger.debug).not.toHaveBeenCalled();
  });
});