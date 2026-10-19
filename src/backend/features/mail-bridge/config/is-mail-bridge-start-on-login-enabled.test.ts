import { isMailBridgeStartOnLoginEnabled } from './is-mail-bridge-start-on-login-enabled';
import configStore from '../../../../apps/main/config';

vi.mock('../../../../apps/main/config', () => ({ default: { get: vi.fn(), set: vi.fn() } }));

describe('isMailBridgeStartOnLoginEnabled', () => {
  beforeEach(() => {
    vi.mocked(configStore.get).mockReset();
    vi.mocked(configStore.set).mockReset();
  });

  it.each([true, false])('returns the stored start-on-login preference (%s)', (enabled) => {
    vi.mocked(configStore.get).mockReturnValue(enabled);

    expect(isMailBridgeStartOnLoginEnabled()).toBe(enabled);
    expect(configStore.get).toHaveBeenCalledWith('mailBridgeStartOnLogin');
    expect(configStore.set).not.toHaveBeenCalled();
  });
});
