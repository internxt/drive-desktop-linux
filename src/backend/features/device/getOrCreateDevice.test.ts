import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import configStore from '../../../apps/main/config';
import * as addUnknownDeviceIssueModule from './addUnknownDeviceIssue';
import * as fetchDeviceModule from './fetchDevice';
import * as getDeviceIdentifierModule from './getDeviceIdentifier';
import { getOrCreateDevice } from './getOrCreateDevice';

vi.mock('./getDeviceIdentifier');
vi.mock('./addUnknownDeviceIssue');
vi.mock('./fetchDevice');
vi.mock('./fetchDeviceLegacyAndMigrate');
vi.mock('./createAndSetupNewDevice');

describe('getOrCreateDevice', () => {
  const getDeviceIdentifierMock = partialSpyOn(getDeviceIdentifierModule, 'getDeviceIdentifier');
  const addUnknownDeviceIssueMock = partialSpyOn(addUnknownDeviceIssueModule, 'addUnknownDeviceIssue');
  const fetchDeviceMock = partialSpyOn(fetchDeviceModule, 'fetchDevice');
  const configGetMock = partialSpyOn(configStore, 'get');

  beforeEach(() => {
    configGetMock.mockImplementation((key: string) => {
      if (key === 'deviceId') return -1;
      if (key === 'deviceUUID') return '';
      return undefined;
    });
  });

  describe('when getDeviceIdentifier throws', () => {
    it('should return the error and notify the issue tracker', async () => {
      const unexpectedError = new Error('Unexpected failure');
      getDeviceIdentifierMock.mockImplementation(() => {
        throw unexpectedError;
      });

      const result = await getOrCreateDevice();

      expect(result.error).toBe(unexpectedError);
      call(addUnknownDeviceIssueMock).toBe(unexpectedError);
    });

    it('should wrap non-Error throws in an Error instance', async () => {
      getDeviceIdentifierMock.mockImplementation(() => {
        throw 'something went wrong';
      });

      const result = await getOrCreateDevice();

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Unexpected error in getOrCreateDevice');
      call(addUnknownDeviceIssueMock).toStrictEqual(result.error);
    });
  });

  describe('when fetchDevice throws', () => {
    it('should return the error and notify the issue tracker', async () => {
      getDeviceIdentifierMock.mockReturnValue({
        data: { key: 'key', platform: 'linux', hostname: 'host' },
      });
      const fetchError = new Error('Network error');
      fetchDeviceMock.mockRejectedValue(fetchError);

      const result = await getOrCreateDevice();

      expect(result.error).toBe(fetchError);
      call(addUnknownDeviceIssueMock).toBe(fetchError);
    });
  });
});
