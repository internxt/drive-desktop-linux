import { authClient } from './auth.client';
import { getNewApiHeaders } from '../../../../apps/main/auth/service';
import { logger } from '../../../../core/LoggerService/LoggerService';
import { Either, left, right } from '../../../../context/shared/domain/Either';
import { RefreshTokenResponse } from './auth.types';

export class AuthService {
  constructor() {}

  async refresh(): Promise<Either<Error,RefreshTokenResponse>> {
    const response = await authClient.GET('/users/refresh', {
      headers: await getNewApiHeaders(),
    });

    if (!response.data) {
      logger.error({
        msg: 'Refresh request was not successful',
        tag: 'AUTH',
        attributes: {
          endpoint: '/users/refresh',
        },
      });
      return left(new Error('Refresh request was not successful'));
    }
    return right(response.data);
  }
}
