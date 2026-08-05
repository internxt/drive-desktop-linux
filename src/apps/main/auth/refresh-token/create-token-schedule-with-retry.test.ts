import { createTokenScheduleWithRetry } from './create-token-schedule-with-retry';
import * as getCredentialsModule from '../get-credentials';
import { call, calls, partialSpyOn } from 'tests/vitest/utils.helper';
import { loggerMock } from 'tests/vitest/mocks.helper';
import { TokenScheduler } from '../../token-scheduler/TokenScheduler';
import { Job } from 'node-schedule';

describe('createTokenScheduleWithRetry', () => {
  const obtainTokensMock = partialSpyOn(getCredentialsModule, 'getCredentials');
  const scheduleMock = partialSpyOn(TokenScheduler.prototype, 'schedule');

  const jobMock: Partial<Job> = {
    cancel: vi.fn(),
  };
  const scheduledResult = {
    isRetryable: false,
    job: jobMock as Job,
  };
  const validTokens = { newToken: 'token-1', mnemonic: 'mnemonic-1' };

  beforeEach(() => {
    scheduleMock.mockReturnValue(scheduledResult);
  });

  it('should create token schedule using obtainStoredTokens when no parameter provided', async () => {
    obtainTokensMock.mockReturnValue(validTokens);

    await createTokenScheduleWithRetry();

    calls(obtainTokensMock).toHaveLength(1);
    calls(scheduleMock).toHaveLength(1);
  });

  it('should attempt to schedule only once when schedule() succeeds immediately', async () => {
    scheduleMock.mockReturnValue(scheduledResult);

    await createTokenScheduleWithRetry();

    calls(scheduleMock).toHaveLength(1);
    calls(loggerMock.debug).toHaveLength(0);
  });

  it('should retry when schedule() fails and succeed on second attempt', async () => {
    scheduleMock.mockReturnValueOnce({ isRetryable: true }).mockReturnValueOnce(scheduledResult);

    await createTokenScheduleWithRetry();

    calls(scheduleMock).toHaveLength(2);
    calls(loggerMock.debug).toHaveLength(1);
    call(loggerMock.debug).toMatchObject({
      msg: '[TOKEN] Failed to create token schedule, retrying...',
      tag: 'AUTH',
    });
  });

  it('should not retry when schedule() reports a non-retryable outcome', async () => {
    scheduleMock.mockReturnValue({ isRetryable: false });

    await createTokenScheduleWithRetry();

    calls(scheduleMock).toHaveLength(1);
    calls(loggerMock.debug).toHaveLength(0);
  });

  it('should not retry when schedule() returns a job even if retryable is true', async () => {
    scheduleMock.mockReturnValue({ isRetryable: true, job: jobMock as Job });

    await createTokenScheduleWithRetry();

    calls(scheduleMock).toHaveLength(1);
    calls(loggerMock.debug).toHaveLength(0);
  });
});
