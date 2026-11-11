import { act, renderHook } from '@testing-library/react-hooks';
import type { ClientCompatibilityState } from '@internxt/drive-desktop-core/build/backend';
import { useClientCompatibility } from './useClientCompatibility';

describe('useClientCompatibility', () => {
  let onChange: (state: ClientCompatibilityState) => void = () => undefined;
  const unsubscribe = vi.fn();

  beforeEach(() => {
    vi.mocked(window.electron.onClientCompatibilityChange).mockImplementation((callback) => {
      onChange = callback;
      return unsubscribe;
    });
  });

  it('should load the current state from the main process', async () => {
    // Given
    vi.mocked(window.electron.getClientCompatibility).mockResolvedValue({ status: 'deprecated' });
    // When
    const { result, waitForNextUpdate } = renderHook(() => useClientCompatibility());
    await waitForNextUpdate();
    // Then
    expect(result.current.state).toStrictEqual({ status: 'deprecated' });
  });

  it('should follow the changes the main process broadcasts', async () => {
    // Given
    vi.mocked(window.electron.getClientCompatibility).mockResolvedValue({ status: 'up_to_date' });
    const { result, unmount } = renderHook(() => useClientCompatibility());
    // When
    act(() => onChange({ status: 'unsupported' }));
    // Then
    expect(result.current.state).toStrictEqual({ status: 'unsupported' });
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
