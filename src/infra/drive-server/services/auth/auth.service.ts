import { authClient } from './auth.client';
import { getNewApiHeaders } from '../../../../apps/main/auth/service';
import { logger } from '../../../../core/LoggerService/LoggerService';
import { Either, left, right } from '../../../../context/shared/domain/Either';
import { RefreshTokenResponse } from './auth.types';

export class AuthService {
  constructor() {
  }

  async refresh(): Promise<Either<Error, RefreshTokenResponse>> {
    try {
      const response = await authClient.GET('/users/refresh', {
        headers: await getNewApiHeaders()
      });

      if (!response.data) {
        logger.error({
          msg: 'Refresh request was not successful',
          tag: 'AUTH',
          attributes: {
            endpoint: '/users/refresh'
          }
        });
        return left(new Error('Refresh request was not successful'));
      }
      return right(response.data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error({
        msg: 'Login request threw an exception',
        tag: 'AUTH',
        error: error,
        attributes: {
          endpoint: '/auth/login'
        }
      });
      return left(error);
    }
  }
}
