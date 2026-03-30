import { renderHook, act } from '@testing-library/react-hooks';
import { SyncProvider, useSyncContext } from './SyncContext';
import { RemoteSyncStatus } from '../../main/remote-sync/helpers';
import { partialSpyOn } from '../../../../tests/vitest/utils.helper';

describe('SyncContext', () => {
  void window.electron.getRemoteSyncStatus;
  void window.electron.onRemoteSyncStatusChange;

  const getRemoteSyncStatusMock = partialSpyOn(window.electron, 'getRemoteSyncStatus', false);
  const onRemoteSyncStatusChangeMock = partialSpyOn(window.electron, 'onRemoteSyncStatusChange', false);
  const unsubscribeMock = vi.fn();

  beforeEach(() => {
    onRemoteSyncStatusChangeMock.mockReturnValue(unsubscribeMock);
  });

  function renderSyncHook() {
    return renderHook(() => useSyncContext(), {
      wrapper: ({ children }) => <SyncProvider>{children}</SyncProvider>,
    });
  }

  it('should have STANDBY as default status', () => {
    getRemoteSyncStatusMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderSyncHook();

    expect(result.current.syncStatus).toBe('STANDBY');
  });

  it('should fetch remote sync status on mount', () => {
    getRemoteSyncStatusMock.mockReturnValue(new Promise(() => {}));

    renderSyncHook();

    expect(getRemoteSyncStatusMock).toHaveBeenCalledOnce();
  });

  it('should subscribe to remote sync status changes on mount', () => {
    getRemoteSyncStatusMock.mockReturnValue(new Promise(() => {}));

    renderSyncHook();

    expect(onRemoteSyncStatusChangeMock).toBeCalledWith(expect.any(Function));
  });

  it('should unsubscribe from remote sync status changes on unmount', () => {
    getRemoteSyncStatusMock.mockReturnValue(new Promise(() => {}));

    const { unmount } = renderSyncHook();

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledOnce();
  });

  it.each([
    ['SYNCING', 'RUNNING'],
    ['SYNC_FAILED', 'FAILED'],
  ] as [RemoteSyncStatus, string][])(
    'should map remote status %s to %s on initial fetch',
    async (remoteStatus, expectedStatus) => {
      getRemoteSyncStatusMock.mockResolvedValue(remoteStatus);

      const { result, waitForNextUpdate } = renderSyncHook();

      await waitForNextUpdate();

      expect(result.current.syncStatus).toBe(expectedStatus);
    },
  );

  it.each([
    ['IDLE', 'STANDBY'],
    ['SYNCED', 'STANDBY'],
  ] as [RemoteSyncStatus, string][])(
    'should keep STANDBY when remote status %s resolves (same as default)',
    async (remoteStatus, expectedStatus) => {
      getRemoteSyncStatusMock.mockResolvedValue(remoteStatus);

      const { result } = renderSyncHook();

      await vi.waitFor(() => {
        expect(getRemoteSyncStatusMock).toHaveBeenCalledOnce();
      });

      expect(result.current.syncStatus).toBe(expectedStatus);
    },
  );

  it.each([
    ['SYNCING', 'RUNNING'],
    ['IDLE', 'STANDBY'],
    ['SYNCED', 'STANDBY'],
    ['SYNC_FAILED', 'FAILED'],
  ] as [RemoteSyncStatus, string][])(
    'should map remote status %s to %s on status change event',
    async (remoteStatus, expectedStatus) => {
      getRemoteSyncStatusMock.mockReturnValue(new Promise(() => {}));

      const { result } = renderSyncHook();

      const changeCallback = onRemoteSyncStatusChangeMock.mock.calls[0][0];

      act(() => {
        changeCallback(remoteStatus);
      });

      expect(result.current.syncStatus).toBe(expectedStatus);
    },
  );
});
