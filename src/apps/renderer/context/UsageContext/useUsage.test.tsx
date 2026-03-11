import { renderHook } from '@testing-library/react-hooks';
import { useUsage } from './useUsage';
import { UsageProvider } from './usage-provider';
import * as usageService from './usage.service';
import { partialSpyOn } from '../../../../../tests/vitest/utils.helper';

describe('useUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.electron.onRemoteChanges).mockReturnValue(vi.fn());
  });

  it('should throw when used outside of UsageProvider', () => {
    const { result } = renderHook(() => useUsage());

    expect(result.error).toMatchObject({ message: 'useUsage must be used within a UsageProvider' });
  });

  it('should return context when used within UsageProvider', () => {
    partialSpyOn(usageService, 'fetchUsage').mockResolvedValue({
      data: { usageInBytes: 0, limitInBytes: 0, isInfinite: false, offerUpgrade: false },
    });

    const { result } = renderHook(() => useUsage(), {
      wrapper: ({ children }) => <UsageProvider>{children}</UsageProvider>,
    });

    expect(result.current).toBeDefined();
    expect(result.current.status).toBe('loading');
    expect(result.current.refreshUsage).toBeDefined();
  });
});
