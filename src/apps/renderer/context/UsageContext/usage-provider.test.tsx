import { renderHook, act } from '@testing-library/react-hooks';
import { UsageProvider } from './usage-provider';
import { useUsage } from './useUsage';
import * as usageService from './usage.service';
import { partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import { Usage } from '../../../../backend/features/usage/usage.types';

describe('UsageProvider', () => {
  const fetchUsageMock = partialSpyOn(usageService, 'fetchUsage');
  const onRemoteChangesMock = vi.mocked(window.electron.onRemoteChanges);
  const unsubscribeMock = vi.fn();

  const usage: Usage = {
    usageInBytes: 100,
    limitInBytes: 1000,
    isInfinite: false,
    offerUpgrade: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    onRemoteChangesMock.mockReturnValue(unsubscribeMock);
  });

  function renderUsageHook() {
    return renderHook(() => useUsage(), {
      wrapper: ({ children }) => <UsageProvider>{children}</UsageProvider>,
    });
  }

  it('shoukd fetch usage on mount and set status to ready', async () => {
    fetchUsageMock.mockResolvedValue({ data: usage });

    const { result, waitForNextUpdate } = renderUsageHook();

    await waitForNextUpdate();

    expect(result.current.status).toBe('ready');
    expect(result.current.usage).toMatchObject(usage);
  });

  it('shpuld set status to error when fetchUsage fails', async () => {
    fetchUsageMock.mockResolvedValue({ error: new Error('fail') });

    const { result, waitForNextUpdate } = renderUsageHook();

    await waitForNextUpdate();

    expect(result.current.status).toBe('error');
  });

  it('should register onRemoteChanges listener on mount', () => {
    fetchUsageMock.mockResolvedValue({ data: usage });

    renderUsageHook();

    expect(onRemoteChangesMock).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should unsubscribe from onRemoteChanges on unmount', () => {
    fetchUsageMock.mockResolvedValue({ data: usage });

    const { unmount } = renderUsageHook();

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('should trigger a new fetch on refreshUsage', async () => {
    fetchUsageMock.mockResolvedValue({ data: usage });

    const { result, waitForNextUpdate } = renderUsageHook();

    await waitForNextUpdate();

    const updatedUsage: Usage = { ...usage, usageInBytes: 500 };
    fetchUsageMock.mockResolvedValue({ data: updatedUsage });

    await act(async () => {
      result.current.refreshUsage();
    });

    expect(result.current.usage).toMatchObject(updatedUsage);
  });
});
