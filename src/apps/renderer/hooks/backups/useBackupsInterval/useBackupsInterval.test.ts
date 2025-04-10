import { useBackupsInterval } from './useBackupsInterval';
import { act, renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
const mockGetBackupsInterval = jest.fn();
const mockSetBackupsInterval = jest.fn();

declare global {
  interface Window {
    electron: {
      getBackupsInterval: () => Promise<number>;
      setBackupsInterval: (value: number) => Promise<void>;
    };
  }
}

beforeAll(() => {
  window.electron = {
    getBackupsInterval: mockGetBackupsInterval,
    setBackupsInterval: mockSetBackupsInterval,
  };
});

describe('useBackupsInterval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have the default state of backupsInterval as BACKUP_MANUAL_INTERVAL value', () => {
    const { result } = renderHook(() => useBackupsInterval());
    expect(result.current.backupsInterval).toBe(-1);
  });

  it('should properly retrieve the backupsInterval and set it to the state', async () => {
    mockGetBackupsInterval.mockResolvedValue(3600000); // 1h

    const { result, waitForNextUpdate } = renderHook(() => useBackupsInterval());

    await waitForNextUpdate();

    expect(mockGetBackupsInterval).toHaveBeenCalled();
    expect(result.current.backupsInterval).toBe(3600000);
  });

  it('should properly update the backupsInterval and call the electron function to set the interval', async () => {
    const { result } = renderHook(() => useBackupsInterval());

    await waitFor(() => {
      expect(result.current.backupsInterval).toBe(-1);
    });


    await act(async () => {
      await result.current.updateBackupsInterval(7200000);
    });

    expect(result.current.backupsInterval).toBe(7200000);
    expect(mockSetBackupsInterval).toHaveBeenCalledWith(7200000);
  });
});
