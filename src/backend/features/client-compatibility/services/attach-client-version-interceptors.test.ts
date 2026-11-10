import { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import * as state from './client-compatibility-state';
import { detectUnsupportedClientVersion, rejectRequestIfClientUnsupported } from './attach-client-version-interceptors';

vi.unmock('axios');

describe('attach-client-version-interceptors', () => {
  const isClientUnsupportedMock = partialSpyOn(state, 'isClientUnsupported');
  const setClientCompatibilityMock = partialSpyOn(state, 'setClientCompatibility');
  const config = { url: '/files', headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

  function errorWith(data: unknown) {
    const error = new AxiosError('Forbidden', AxiosError.ERR_BAD_REQUEST, config);
    error.response = { status: 403, statusText: 'Forbidden', headers: new AxiosHeaders(), config, data };
    return error;
  }

  beforeEach(() => {
    isClientUnsupportedMock.mockReturnValue(false);
  });

  describe('rejectRequestIfClientUnsupported', () => {
    it('should let the request through when the version is supported', () => {
      // When
      const result = rejectRequestIfClientUnsupported(config);
      // Then
      expect(result).toBe(config);
    });

    it('should reject the request locally with the unsupported version error code', () => {
      // Given
      isClientUnsupportedMock.mockReturnValue(true);
      // When
      const run = () => rejectRequestIfClientUnsupported(config);
      // Then
      expect(run).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            status: 403,
            data: expect.objectContaining({ errorCode: 'CLIENT_VERSION_UNSUPPORTED' }),
          }),
        }),
      );
    });
  });

  describe('detectUnsupportedClientVersion', () => {
    it('should mark the version as unsupported when the backend rejects it', async () => {
      // Given
      const error = errorWith({ statusCode: 403, errorCode: 'CLIENT_VERSION_UNSUPPORTED' });
      // When
      const result = detectUnsupportedClientVersion(error);
      // Then
      await expect(result).rejects.toBe(error);
      call(setClientCompatibilityMock).toStrictEqual({ state: { status: 'unsupported' } });
    });

    it('should ignore other errors', async () => {
      // Given
      const error = errorWith({ statusCode: 403, message: 'Forbidden' });
      // When
      const result = detectUnsupportedClientVersion(error);
      // Then
      await expect(result).rejects.toBe(error);
      expect(setClientCompatibilityMock).not.toHaveBeenCalled();
    });
  });
});
