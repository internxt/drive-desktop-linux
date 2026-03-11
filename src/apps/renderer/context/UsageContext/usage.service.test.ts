import { describe, it, expect, beforeEach } from 'vitest';
import { fetchUsage } from './usage.service';
import { Usage } from '../../../../backend/features/usage/usage.types';

describe('fetchUsage', () => {
  const isUserLoggedInMock = vi.mocked(window.electron.isUserLoggedIn);
  const getUsageMock = vi.mocked(window.electron.getUsage);
  const loggerErrorMock = vi.mocked(window.electron.logger.error);

  const usage: Usage = {
    usageInBytes: 100,
    limitInBytes: 50,
    isInfinite: false,
    offerUpgrade: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return usage data when user is logged in and getUsage succeeds', async () => {
    isUserLoggedInMock.mockResolvedValue(true);
    getUsageMock.mockResolvedValue({ data: usage });

    const result = await fetchUsage();

    expect(result.data).toMatchObject(usage);
  });

  it('should return error when user is not logged in', async () => {
    isUserLoggedInMock.mockResolvedValue(false);

    const result = await fetchUsage();

    expect(result.error).toMatchObject({ message: 'User is not logged in' });
  });

  it('should return error when getUsage fails', async () => {
    isUserLoggedInMock.mockResolvedValue(true);
    getUsageMock.mockResolvedValue({ error: new Error('API error') });

    const result = await fetchUsage();

    expect(result.error).toMatchObject({ message: 'API error' });
  });

  it('should return unexpected errors and logs them', async () => {
    const error = new Error('unexpected');
    isUserLoggedInMock.mockRejectedValue(error);

    const result = await fetchUsage();

    expect(result.error).toBe(error);
    expect(loggerErrorMock).toHaveBeenCalledWith({
      msg: 'unexpected',
      error,
    });
  });

  it('should return a default error when caught value is not an Error', async () => {
    isUserLoggedInMock.mockRejectedValue('string error');

    const result = await fetchUsage();

    expect(result.error).toMatchObject({ message: 'Error getting usage in UsageContext' });
    expect(loggerErrorMock).toHaveBeenCalledWith({
      msg: 'Error getting usage in UsageContext',
      error: result.error,
    });
  });
});
