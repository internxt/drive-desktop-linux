import { calls, partialSpyOn } from '../../../../tests/vitest/utils.helper';
import * as getRawUsageAndLimitModule from './get-raw-usage-and-limit';
import { getCachedRawUsageAndLimit, USAGE_AND_LIMIT_CACHE_TTL_MS } from './get-cached-raw-usage-and-limit';
import { RawUsage } from './usage.types';

const usage: RawUsage = {
  driveUsage: 1024,
  limitInBytes: 5120,
};

describe('get-cached-raw-usage-and-limit', () => {
  const getRawUsageAndLimitMock = partialSpyOn(getRawUsageAndLimitModule, 'getRawUsageAndLimit');

  let clock = new Date('2026-01-01T00:00:00.000Z').getTime();

  beforeEach(() => {
    getRawUsageAndLimitMock.mockClear();
    // Jump past the TTL so a reading stored by the previous test is stale.
    clock += USAGE_AND_LIMIT_CACHE_TTL_MS;
    vi.useFakeTimers();
    vi.setSystemTime(clock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should reuse a fresh reading instead of calling usage and limit again', async () => {
    getRawUsageAndLimitMock.mockResolvedValue({ data: usage });

    const first = await getCachedRawUsageAndLimit();
    const second = await getCachedRawUsageAndLimit();

    expect(first.data).toStrictEqual(usage);
    expect(second.data).toStrictEqual(usage);
    calls(getRawUsageAndLimitMock).toHaveLength(1);
  });

  it('should read again once the cached reading is older than the ttl', async () => {
    getRawUsageAndLimitMock.mockResolvedValue({ data: usage });

    await getCachedRawUsageAndLimit();
    clock += USAGE_AND_LIMIT_CACHE_TTL_MS;
    vi.setSystemTime(clock);
    await getCachedRawUsageAndLimit();

    calls(getRawUsageAndLimitMock).toHaveLength(2);
  });

  it('should share one in-flight reading across overlapping checks', async () => {
    let resolveReading: (value: { data: RawUsage }) => void = () => undefined;
    getRawUsageAndLimitMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReading = resolve;
        }),
    );

    const first = getCachedRawUsageAndLimit();
    const second = getCachedRawUsageAndLimit();
    resolveReading({ data: usage });

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.data).toStrictEqual(usage);
    expect(secondResult.data).toStrictEqual(usage);
    calls(getRawUsageAndLimitMock).toHaveLength(1);
  });

  it('should not reuse a failed reading', async () => {
    getRawUsageAndLimitMock.mockResolvedValueOnce({ error: new Error('rate limited') });
    getRawUsageAndLimitMock.mockResolvedValueOnce({ data: usage });

    const failed = await getCachedRawUsageAndLimit();
    const recovered = await getCachedRawUsageAndLimit();

    expect(failed.error?.message).toBe('rate limited');
    expect(recovered.data).toStrictEqual(usage);
    calls(getRawUsageAndLimitMock).toHaveLength(2);
  });
});
