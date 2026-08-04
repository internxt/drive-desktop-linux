import { logger } from '@internxt/drive-desktop-core/build/backend';
import { auth } from '@internxt/lib';
import { getCredentials } from '../../../apps/main/auth/get-credentials';

type Props = {
  token?: string;
};

export function validateToken({ token }: Props = {}) {
  try {
    const tokenToValidate = token ?? getCredentials().newToken;
    const decodedJwtClaims = auth.validateJwt(tokenToValidate);
    if (decodedJwtClaims) {
      return { data: decodedJwtClaims };
    }
    const error = new Error('Token could not be validated');
    logger.error({ tag: 'AUTH', msg: 'Token could not be validated', error });
    return { error };
  } catch (error) {
    const validationError =
      error instanceof Error ? error : new Error('Error while validating token', { cause: error });
    logger.error({ tag: 'AUTH', msg: 'Error while validating token', error: validationError });
    return { error: validationError };
  }
}
