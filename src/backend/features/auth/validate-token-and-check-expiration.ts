import { logger } from '@internxt/drive-desktop-core/build/backend';
import { auth, TokenStatus } from '@internxt/lib';
import { getCredentials } from '../../../apps/main/auth/get-credentials';
import { Result } from '../../..//context/shared/domain/Result';

export function validateTokenAndCheckExpiration(): Result<TokenStatus, Error> {
  try {
    const { newToken: token } = getCredentials();
    return { data: auth.validateTokenAndCheckExpiration(token) };
  } catch (error) {
    const tokenError = error instanceof Error ? error : new Error('Error getting token', { cause: error });
    logger.error({ tag: 'AUTH', msg: 'Error getting token', error: tokenError });
    return { error: tokenError };
  }
}