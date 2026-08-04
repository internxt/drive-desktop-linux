import { auth } from '@internxt/lib';
import * as getCredentialsModule from '../../../apps/main/auth/get-credentials';
import { partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { validateToken } from './validate-token';
import { loggerMock } from '../../../../tests/vitest/mocks.helper';

describe('validateToken', () => {
  const getCredentialsMock = partialSpyOn(getCredentialsModule, 'getCredentials');
  const validateJwtMock = partialSpyOn(auth, 'validateJwt');

  it('returns the decoded claims for a valid stored token', () => {
    const token = 'valid-token';
    const claims = { exp: 1_800_000_000, iat: 1_700_000_000 };
    getCredentialsMock.mockReturnValue({ newToken: token });
    validateJwtMock.mockReturnValue(claims);

    expect(validateToken()).toEqual({ data: claims });
    expect(validateJwtMock).toHaveBeenCalledWith(token);
  });

  it('returns an error when the stored token is invalid', () => {
    getCredentialsMock.mockReturnValue({ newToken: 'invalid-token' });
    validateJwtMock.mockReturnValue(null);

    const result = validateToken();

    expect(result.error).toEqual(new Error('Token could not be validated'));
    expect(loggerMock.error).toHaveBeenCalledWith({
      tag: 'AUTH',
      msg: 'Token could not be validated',
      error: result.error,
    });
  });

  it('returns the token-read error', () => {
    const error = new Error('Unable to decrypt token');
    getCredentialsMock.mockImplementation(() => {
      throw error;
    });

    expect(validateToken()).toEqual({ error });
    expect(loggerMock.error).toHaveBeenCalledWith({ tag: 'AUTH', msg: 'Error while validating token', error });
  });
});