import { logger } from '@internxt/drive-desktop-core/build/backend';
import { auth, TokenStatus } from '@internxt/lib';
import nodeSchedule from 'node-schedule';
import { validateToken } from '../../../backend/features/auth/validate-token';
import { validateTokenAndCheckExpiration } from '../../../backend/features/auth/validate-token-and-check-expiration';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

export class TokenScheduler {
  constructor(
    private readonly newToken: string,
    private unauthorized: () => void,
  ) {}

  private getTokenClaims(token?: string) {
    const { data, error } = validateToken({ token });

    if (error || !data.exp) return;

    return {
      exp: data.exp,
      iat: data.iat,
    };
  }

  private calculateRenewDate({ exp, iat }: { exp: number; iat?: number | null }): Date {
    const msToRenew = auth.calculateMillisecondsUntilRefresh(exp, iat);

    if (msToRenew <= 0) {
      return new Date(Date.now() + FIVE_MINUTES_IN_MS);
    }

    return new Date(Date.now() + msToRenew);
  }

  public schedule(refreshCallback: () => void) {
    const tokenStatusResult = validateTokenAndCheckExpiration();

    if (tokenStatusResult.error || tokenStatusResult.data === TokenStatus.INVALID) {
      logger.warn({ msg: '[TOKEN] Refresh token schedule will not be set' });
      return;
    }

    if (tokenStatusResult.data === TokenStatus.EXPIRED) {
      logger.warn({ msg: '[TOKEN] TOKEN IS EXPIRED' });
      this.unauthorized();
      return;
    }

    const tokenClaims = this.getTokenClaims(this.newToken);

    if (!tokenClaims) {
      logger.warn({ msg: '[TOKEN] Refresh token schedule will not be set' });

      return;
    }

    const renewDate = this.calculateRenewDate(tokenClaims);

    logger.debug({
      msg: '[TOKEN] Tokens will be refreshed on ',
      renewDate: renewDate.toLocaleDateString(),
    });

    return nodeSchedule.scheduleJob(renewDate, refreshCallback);
  }

  public cancelAll(): void {
    Object.keys(nodeSchedule.scheduledJobs).forEach((jobName: string) => nodeSchedule.cancelJob(jobName));
  }
}
