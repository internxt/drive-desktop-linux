import { logger } from '@internxt/drive-desktop-core/build/backend';
import { auth, TokenStatus } from '@internxt/lib';
import { Result } from '../../../context/shared/domain/Result';

type Props = {
  token: string;
};

export function validateTokenAndCheckExpiration({ token }: Props): Result<TokenStatus, Error> {
  try {
    return { data: auth.validateTokenAndCheckExpiration(token) };
  } catch (error) {
    const tokenError = error instanceof Error ? error : new Error('Error getting token', { cause: error });
    logger.error({ tag: 'AUTH', msg: 'Error getting token', error: tokenError });
    return { error: tokenError };
  }
}
