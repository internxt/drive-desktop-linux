import { getMailBridgeClientConfig } from './get-mail-bridge-client-config';
import { appInfo } from '../../../../apps/main/app-info/app-info';

describe('getMailBridgeClientConfig', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses explicit build values with the token supplied by the caller', () => {
    vi.stubEnv('NEW_DRIVE_URL', 'https://gateway.example.test/drive');
    vi.stubEnv('INTERNXT_DESKTOP_HEADER_KEY', 'test-header');
    expect(getMailBridgeClientConfig('current-token')).toEqual({
      gatewayUrl: 'https://gateway.example.test/drive',
      desktopHeader: 'test-header',
      clientName: appInfo.name,
      clientVersion: appInfo.version,
      token: 'current-token',
    });
  });
});
