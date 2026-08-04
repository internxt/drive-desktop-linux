import { auth, TokenStatus } from '@internxt/lib';
import * as getCredentialModel from '../../../apps/main/auth/get-credentials';
import { partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { validateTokenAndCheckExpiration } from './validate-token-and-check-expiration';
import { loggerMock } from '../../../../tests/vitest/mocks.helper';

describe('validateTokenAndCheckExpiration', () => {
  const obtainTokenMock = partialSpyOn(getCredentialModel, 'getCredentials');
  const validateTokenAndCheckExpirationMock = vi.spyOn(auth, 'validateTokenAndCheckExpiration');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the token status for the stored token', () => {
    const token = 'valid-token';
    obtainTokenMock.mockReturnValue({ newToken: token });
    validateTokenAndCheckExpirationMock.mockReturnValue(TokenStatus.REFRESH_REQUIRED);

    expect(validateTokenAndCheckExpiration()).toEqual({ data: TokenStatus.REFRESH_REQUIRED });
    expect(validateTokenAndCheckExpirationMock).toHaveBeenCalledWith(token);
  });

  it('returns the token-read error', () => {
    const error = new Error('Unable to decrypt token');
    obtainTokenMock.mockImplementation(() => {
      throw error;
    });

    expect(validateTokenAndCheckExpiration()).toEqual({ error });
    expect(loggerMock.error).toHaveBeenCalledWith({ tag: 'AUTH', msg: 'Error getting token', error });
  });

  it('returns an error when the library validation throws', () => {
    const error = new Error('Unable to validate token');
    obtainTokenMock.mockReturnValue({ newToken: 'token' });
    validateTokenAndCheckExpirationMock.mockImplementation(() => {
      throw error;
    });

    expect(validateTokenAndCheckExpiration()).toEqual({ error });
    expect(loggerMock.error).toHaveBeenCalledWith({ tag: 'AUTH', msg: 'Error getting token', error });
  });
});
