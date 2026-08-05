import jwt from 'jsonwebtoken';
import ms, { StringValue } from 'ms';
import { TokenStatus } from '@internxt/lib';
import { TokenScheduler } from './TokenScheduler';
import { calls, partialSpyOn } from 'tests/vitest/utils.helper';
import * as validateTokenAndCheckExpirationModule from '../../../backend/features/auth/validate-token-and-check-expiration';

function createTokenExpiringIn(expiresIn: StringValue): string {
  const email = 'test@internxt.com';
  const milliseconds = ms(expiresIn);
  return jwt.sign({ email }, 'JWT_SECRET', { expiresIn: milliseconds / 1000 });
}

function createExpiredToken(): string {
  const email = 'test@internxt.com';
  return jwt.sign({ email }, 'JWT_SECRET', { expiresIn: -1 });
}

function createTokenWithoutIssuedAtExpiringIn(expiresIn: StringValue): string {
  const email = 'test@internxt.com';
  const milliseconds = ms(expiresIn);
  return jwt.sign({ email }, 'JWT_SECRET', { expiresIn: milliseconds / 1000, noTimestamp: true });
}

describe('token-scheduler', () => {
  let scheduler: TokenScheduler;
  const unauthorizedCallbackMock = vi.fn();
  const refreshCallback = vi.fn();
  const validateTokenAndCheckExpirationMock = partialSpyOn(
    validateTokenAndCheckExpirationModule,
    'validateTokenAndCheckExpiration',
  );

  const jwtWithoutExpiration =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjp7InV1aWQiOiIzMjE2YzUzNi1kZDJjLTVhNjEtOGM3Ni0yMmU0ZDQ4ZjY4OWUiLCJlbWFpbCI6InRlc3RAaW50ZXJueHQuY29tIiwibmFtZSI6InRlc3QiLCJsYXN0bmFtZSI6InRlc3QiLCJ1c2VybmFtZSI6InRlc3RAaW50ZXJueHQuY29tIiwic2hhcmVkV29ya3NwYWNlIjp0cnVlLCJuZXR3b3JrQ3JlZGVudGlhbHMiOnsidXNlciI6InRlc3RAaW50ZXJueHQuY29tIiwicGFzcyI6IiQyYSQwOCQ2QmhjZkRxaDE4c0kwN25kb2x0N29PNEtaTkpVQmpXSzYvZTRxMWppclR2SzdOTWE4dmZpLiJ9fSwiaWF0IjoxNjY3ODI4MDA2fQ.ckwjRsdNu9UUKUtdO3G32SwUUoMj7FAAOuBqVsIemo0';

  const invalidToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.am9hbnZpY2Vuc0Bwcm90b24ubWU.REeEpym9y3IoqMNjyuAGCnhWX7YHH9nA8DREqEqCU5Q';

  beforeEach(() => {
    vi.useRealTimers();
    validateTokenAndCheckExpirationMock.mockReturnValue({ data: TokenStatus.VALID });
  });

  afterEach(() => {
    scheduler?.cancelAll();
  });

  describe('schedule()', () => {
    it('schedules refresh at half of the token lifetime when iat is present', () => {
      vi.useFakeTimers();

      const tokenExpiringInFourHours = createTokenExpiringIn('4h');
      const beforeSchedule = Date.now();

      scheduler = new TokenScheduler(tokenExpiringInFourHours, unauthorizedCallbackMock);

      const scheduleResult = scheduler.schedule(vi.fn());
      const nextInvocation = scheduleResult.job?.nextInvocation();
      const afterSchedule = Date.now();
      const expectedMinTime = beforeSchedule + 2 * 60 * 60 * 1000 - 2000;
      const expectedMaxTime = afterSchedule + 2 * 60 * 60 * 1000 + 1000;
      const invocationTime = nextInvocation?.getTime() ?? 0;

      expect(scheduleResult).toMatchObject({ isRetryable: false, job: expect.any(Object) });
      expect(invocationTime).toBeGreaterThanOrEqual(expectedMinTime);
      expect(invocationTime).toBeLessThanOrEqual(expectedMaxTime);
    });

    it('executes the refresh callback when the scheduled time arrives', () => {
      vi.useFakeTimers();

      const tokenExpiringInFourHours = createTokenExpiringIn('4h');

      scheduler = new TokenScheduler(tokenExpiringInFourHours, unauthorizedCallbackMock);
      scheduler.schedule(refreshCallback);

      calls(refreshCallback).toHaveLength(0);
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);
      calls(refreshCallback).toHaveLength(1);
    });

    it('schedules fallback for 5 minutes from now when renewal date is in the past', () => {
      vi.useFakeTimers();

      const tokenExpiringInThirtyMinutesWithoutIssuedAt = createTokenWithoutIssuedAtExpiringIn('30m');
      const beforeSchedule = Date.now();

      scheduler = new TokenScheduler(tokenExpiringInThirtyMinutesWithoutIssuedAt, unauthorizedCallbackMock);
      const scheduleResult = scheduler.schedule(vi.fn());

      const afterSchedule = Date.now();
      const nextInvocation = scheduleResult.job?.nextInvocation();
      const invocationTime = nextInvocation?.getTime() || 0;

      const expectedMinTime = beforeSchedule + 5 * 60 * 1000;
      const expectedMaxTime = afterSchedule + 5 * 60 * 1000 + 1000;

      expect(scheduleResult).toMatchObject({ isRetryable: false, job: expect.any(Object) });
      expect(invocationTime).toBeGreaterThanOrEqual(expectedMinTime);
      expect(invocationTime).toBeLessThanOrEqual(expectedMaxTime);
    });

    it('calls unauthorized callback and does not schedule when token is already expired', () => {
      const expiredToken = createExpiredToken();
      validateTokenAndCheckExpirationMock.mockReturnValue({ data: TokenStatus.EXPIRED });

      scheduler = new TokenScheduler(expiredToken, unauthorizedCallbackMock);

      const scheduleResult = scheduler.schedule(vi.fn());

      expect(scheduleResult).toMatchObject({ isRetryable: false });
      expect(scheduleResult.job).toBeUndefined();
      calls(unauthorizedCallbackMock).toHaveLength(1);
    });

    it('does not schedule when token is invalid', () => {
      validateTokenAndCheckExpirationMock.mockReturnValue({ data: TokenStatus.INVALID });
      scheduler = new TokenScheduler(invalidToken, unauthorizedCallbackMock);

      const scheduleResult = scheduler.schedule(vi.fn());

      expect(scheduleResult).toMatchObject({ isRetryable: false });
      expect(scheduleResult.job).toBeUndefined();
      calls(unauthorizedCallbackMock).toHaveLength(0);
    });

    it('does not schedule when token has no expiration field', () => {
      scheduler = new TokenScheduler(jwtWithoutExpiration, unauthorizedCallbackMock);

      const scheduleResult = scheduler.schedule(vi.fn());

      expect(scheduleResult).toMatchObject({ isRetryable: false });
      expect(scheduleResult.job).toBeUndefined();
      calls(unauthorizedCallbackMock).toHaveLength(0);
    });
  });

  describe('cancelAll()', () => {
    it('cancels all scheduled jobs', () => {
      const token30Days = createTokenExpiringIn('30d');
      const refreshCallback = vi.fn();

      scheduler = new TokenScheduler(token30Days, unauthorizedCallbackMock);

      const schedule1 = scheduler.schedule(refreshCallback);
      const schedule2 = scheduler.schedule(refreshCallback);

      expect(schedule1).toMatchObject({ isRetryable: false, job: expect.any(Object) });
      expect(schedule2).toMatchObject({ isRetryable: false, job: expect.any(Object) });

      if (!schedule1.job || !schedule2.job) {
        throw new Error('Expected scheduled jobs');
      }

      scheduler.cancelAll();

      expect(schedule1.job.nextInvocation()).toBeNull();
      expect(schedule2.job.nextInvocation()).toBeNull();
    });
  });
});
