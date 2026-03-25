import { renderHook, act } from '@testing-library/react-hooks';
import { useOnSyncRunning } from './useOnSyncRunning';
import { SyncProvider } from '../context/SyncContext';
import { RemoteSyncStatus } from '../../main/remote-sync/helpers';
import { partialSpyOn } from '../../../../tests/vitest/utils.helper';

describe('useOnSyncRunning', () => {
  void window.electron.getRemoteSyncStatus;
  void window.electron.onRemoteSyncStatusChange;

  const getRemoteSyncStatusMock = partialSpyOn(window.electron, 'getRemoteSyncStatus', false);
  const onRemoteSyncStatusChangeMock = partialSpyOn(window.electron, 'onRemoteSyncStatusChange', false);

  beforeEach(() => {
    onRemoteSyncStatusChangeMock.mockReturnValue(vi.fn());
  });

  function renderOnSyncRunningHook(fn: () => void) {
    return renderHook(() => useOnSyncRunning(fn), {
      wrapper: ({ children }) => <SyncProvider>{children}</SyncProvider>,
    });
  }

  it('should call callback when sync status changes to RUNNING', async () => {
    getRemoteSyncStatusMock.mockResolvedValue('SYNCING' as RemoteSyncStatus);
    const callback = vi.fn();

    const { waitForNextUpdate } = renderOnSyncRunningHook(callback);

    await waitForNextUpdate();

    expect(callback).toHaveBeenCalledOnce();
  });

  it('should not call callback when sync status is STANDBY', async () => {
    getRemoteSyncStatusMock.mockResolvedValue('SYNCED' as RemoteSyncStatus);
    const callback = vi.fn();

    renderOnSyncRunningHook(callback);

    await vi.waitFor(() => {
      expect(getRemoteSyncStatusMock).toHaveBeenCalledOnce();
    });

    expect(callback).not.toBeCalled();
  });

  it('should not call callback when sync status is FAILED', async () => {
    getRemoteSyncStatusMock.mockResolvedValue('SYNC_FAILED' as RemoteSyncStatus);
    const callback = vi.fn();

    const { waitForNextUpdate } = renderOnSyncRunningHook(callback);

    await waitForNextUpdate();

    expect(callback).not.toBeCalled();
  });

  it('should call callback when status changes to RUNNING via event', () => {
    getRemoteSyncStatusMock.mockReturnValue(new Promise(() => {}));
    const callback = vi.fn();

    renderOnSyncRunningHook(callback);

    const changeCallback = onRemoteSyncStatusChangeMock.mock.calls[0][0];

    act(() => {
      changeCallback('SYNCING' as RemoteSyncStatus);
    });

    expect(callback).toHaveBeenCalledOnce();
  });

  it('should not call callback when status changes to non-RUNNING via event', () => {
    getRemoteSyncStatusMock.mockReturnValue(new Promise(() => {}));
    const callback = vi.fn();

    renderOnSyncRunningHook(callback);

    const changeCallback = onRemoteSyncStatusChangeMock.mock.calls[0][0];

    act(() => {
      changeCallback('SYNCED' as RemoteSyncStatus);
    });

    expect(callback).not.toBeCalled();
  });
});
