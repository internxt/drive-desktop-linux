import * as getCredentialsModule from '../../../apps/main/auth/get-credentials';
import * as packageConfig from '../../../../package.json';
import { getBaseApiHeaders, getNewApiHeaders } from './headers';
import { calls, partialSpyOn } from '../../../../tests/vitest/utils.helper';

describe('headers', () => {
  const getCredentialsMock = partialSpyOn(getCredentialsModule, 'getCredentials');

  beforeEach(() => {
    getCredentialsMock.mockReturnValue({ newToken: 'token-123', mnemonic: 'mnemonic-abc' });
  });

  describe('getBaseApiHeaders', () => {
    it('should return base headers with correct static values', () => {
      // When
      const headers = getBaseApiHeaders();

      // Then
      expect(headers).toMatchObject({
        'content-type': 'application/json; charset=utf-8',
        'internxt-client': 'drive-desktop-linux',
        'internxt-version': packageConfig.version,
      });
    });
  });

  describe('getNewApiHeaders', () => {
    it('should include Authorization header with the new token', () => {
      // When
      const headers = getNewApiHeaders();

      // Then
      expect(headers).toMatchObject({
        Authorization: 'Bearer token-123',
      });
    });

    it('should include all base headers', () => {
      // When
      const headers = getNewApiHeaders();

      // Then
      expect(headers).toMatchObject({
        'content-type': 'application/json; charset=utf-8',
        'internxt-client': 'drive-desktop-linux',
        'internxt-version': packageConfig.version,
      });
    });

    it('should call getCredentials once', () => {
      // When
      getNewApiHeaders();

      // Then
      calls(getCredentialsMock).toHaveLength(1);
    });
  });
});
