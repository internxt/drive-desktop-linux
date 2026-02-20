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
  const validTokens = { newToken: 'token-1', mnemonic: 'mnemonic-1' };

  beforeEach(() => {
    scheduleMock.mockReturnValue(jobMock as Job);
  });

  it('should create token schedule using obtainStoredTokens when no parameter provided', async () => {
    obtainTokensMock.mockReturnValue(validTokens);

    await createTokenScheduleWithRetry();

    calls(obtainTokensMock).toHaveLength(1);
    calls(scheduleMock).toHaveLength(1);
  });

  it('should attempt to schedule only once when schedule() succeeds immediately', async () => {
    scheduleMock.mockReturnValue(jobMock);

    await createTokenScheduleWithRetry();

    calls(scheduleMock).toHaveLength(1);
    calls(loggerMock.debug).toHaveLength(0);
  });

  it('should retry when schedule() fails and succeed on second attempt', async () => {
    scheduleMock.mockReturnValueOnce(undefined).mockReturnValueOnce(jobMock);

    await createTokenScheduleWithRetry();

    calls(scheduleMock).toHaveLength(2);
    calls(loggerMock.debug).toHaveLength(1);
    call(loggerMock.debug).toMatchObject({
      msg: '[TOKEN] Failed to create token schedule, retrying...',
      tag: 'AUTH',
    });
  });
});
