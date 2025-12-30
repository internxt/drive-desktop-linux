import { Either, left, right } from '../../../../context/shared/domain/Either';
import { obtainTokens } from './refresh-token';
import { RefreshTokenResponse } from '../../../../infra/drive-server/services/auth/auth.types';
import { driveServerModule } from '../../../../infra/drive-server/drive-server.module';
import { calls, partialSpyOn } from 'tests/vitest/utils.helper';
import * as handlers from '../handlers';

describe('obtainTokens', () => {
  const authRefreshMock = partialSpyOn(driveServerModule.auth, 'refresh');
  const onUserUnauthorizedMock = partialSpyOn(handlers, 'onUserUnauthorized');

  const refreshResult: Either<Error, RefreshTokenResponse> = right({
    token: 'abc',
    newToken: 'xyz',
    user: {
      email: 'user@example.com',
      userId: 'user-id',
      uuid: 'user-uuid',
    } as RefreshTokenResponse['user'],
  });

  it('should properly return the user refresh token and the old token if the refresh was successful', async () => {
    authRefreshMock.mockResolvedValue(refreshResult);
    const result = await obtainTokens();

    expect(result.isRight()).toBe(true);
    expect(result.getRight()).toMatchObject({ token: 'abc', newToken: 'xyz' });
    expect(onUserUnauthorizedMock).not.toHaveBeenCalled();
  });

  it('should return an error if the token is not obtained', async () => {
    const mockError = new Error('Refresh request was not successful');
    const leftResult: Either<Error, RefreshTokenResponse> = left(mockError);
    authRefreshMock.mockResolvedValue(leftResult);

    const result = await obtainTokens();

    expect(result.isLeft()).toBe(true);
    expect(result.getLeft()).toStrictEqual(mockError);
    calls(onUserUnauthorizedMock).toHaveLength(1);
  });
});
