import { auth, TokenStatus } from '@internxt/lib';
import { validateTokenAndCheckExpiration } from './validate-token-and-check-expiration';
import { loggerMock } from '../../../../tests/vitest/mocks.helper';

describe('validateTokenAndCheckExpiration', () => {
  const validateTokenAndCheckExpirationMock = vi.spyOn(auth, 'validateTokenAndCheckExpiration');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the token status for the provided token', () => {
    const token = 'valid-token';
    validateTokenAndCheckExpirationMock.mockReturnValue(TokenStatus.REFRESH_REQUIRED);

    expect(validateTokenAndCheckExpiration({ token })).toEqual({ data: TokenStatus.REFRESH_REQUIRED });
    expect(validateTokenAndCheckExpirationMock).toHaveBeenCalledWith(token);
  });

  it('returns an error when the library validation throws', () => {
    const error = new Error('Unable to validate token');
    validateTokenAndCheckExpirationMock.mockImplementation(() => {
      throw error;
    });

    expect(validateTokenAndCheckExpiration({ token: 'token' })).toEqual({ error });
    expect(loggerMock.error).toHaveBeenCalledWith({ tag: 'AUTH', msg: 'Error getting token', error });
  });
});
