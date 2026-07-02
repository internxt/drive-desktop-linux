import { TokenScheduler } from '../../token-scheduler/TokenScheduler';
import { closeUserSession } from '../handlers';
import { getCredentials } from '../get-credentials';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { refreshToken } from './refresh-token';

const CREATE_SCHEDULE_RETRY_LIMIT = 3;
const TOKEN_EXPIRATION_HOURS = 12;
const TOKEN_RENEW_INTERVAL_HOURS = 4;
const TOKEN_RENEW_BEFORE_EXPIRATION_DAYS = (TOKEN_EXPIRATION_HOURS - TOKEN_RENEW_INTERVAL_HOURS) / 24;

export async function createTokenScheduleWithRetry() {
  const { newToken } = getCredentials();
  const tokenScheduler = new TokenScheduler(TOKEN_RENEW_BEFORE_EXPIRATION_DAYS, newToken, closeUserSession);

  let attempt = 0;
  while (attempt < CREATE_SCHEDULE_RETRY_LIMIT) {
    const schedule = tokenScheduler.schedule(() => refreshToken());
    if (schedule) break;

    attempt++;
    logger.debug({
      tag: 'AUTH',
      msg: '[TOKEN] Failed to create token schedule, retrying...',
    });
  }
}
