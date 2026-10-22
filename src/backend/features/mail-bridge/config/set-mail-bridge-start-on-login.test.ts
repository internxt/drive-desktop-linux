import { setMailBridgeStartOnLogin } from './set-mail-bridge-start-on-login';
import configStore from '../../../../apps/main/config';

vi.mock('../../../../apps/main/config', () => ({ default: { get: vi.fn(), set: vi.fn() } }));

describe('setMailBridgeStartOnLogin', () => {
  beforeEach(() => {
    vi.mocked(configStore.get).mockReset();
    vi.mocked(configStore.set).mockReset();
  });

  it.each([true, false])('writes the start-on-login preference (%s)', (enabled) => {
    setMailBridgeStartOnLogin(enabled);

    expect(configStore.set).toHaveBeenCalledWith('mailBridgeStartOnLogin', enabled);
  });
});
