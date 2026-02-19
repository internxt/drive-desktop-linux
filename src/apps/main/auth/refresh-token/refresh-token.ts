import { onUserUnauthorized } from '../handlers';
import { updateCredentials } from '../update-credentials';
import { Either, left, right } from '../../../../context/shared/domain/Either';
import { driveServerModule } from '../../../../infra/drive-server/drive-server.module';
import { logger } from '@internxt/drive-desktop-core/build/backend';

export async function refreshToken(): Promise<Either<Error, string>> {
  const result = await driveServerModule.auth.refresh();
  if (result.isLeft()) {
    const error = result.getLeft();
    logger.error({
      tag: 'AUTH',
      msg: '[TOKEN] Could not refresh token, unauthorized user',
      error,
    });
    onUserUnauthorized();
    return left(error);
  }

  const { newToken } = result.getRight();

  updateCredentials({ newToken });

  return right(newToken);
}
