import { safeStorage } from 'electron';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { mailBridgeCredentialsStore } from './mail-bridge-credentials-store';
import configStore from '../../../../apps/main/config';

vi.mock('../../../../apps/main/config', () => ({ default: { get: vi.fn(), set: vi.fn() } }));

describe('mailBridgeCredentialsStore', () => {
  beforeEach(() => {
    vi.mocked(configStore.get).mockReset();
    vi.mocked(configStore.set).mockReset();
  });

  it('reads the encrypted account value without decrypting it', () => {
    vi.mocked(configStore.get).mockReturnValue('encrypted-credentials');
    expect(mailBridgeCredentialsStore.read()).toEqual(Result.ok('encrypted-credentials'));
    expect(configStore.get).toHaveBeenCalledWith('mailBridgeCredentials');
    expect(safeStorage.decryptString).not.toHaveBeenCalled();
  });

  it('represents missing credentials as a successful empty result', () => {
    vi.mocked(configStore.get).mockReturnValue('');
    expect(mailBridgeCredentialsStore.read()).toEqual(Result.ok(undefined));
  });

  it('returns config-read errors as Results for core to handle', () => {
    const cause = new Error('Config unreadable');
    vi.mocked(configStore.get).mockImplementationOnce(() => {
      throw cause;
    });
    const result = mailBridgeCredentialsStore.read();
    expect(result.error?.message).toBe('Could not read Mail Bridge credentials');
    expect(result.error?.cause).toBe(cause);
  });

  it('writes encrypted values and lets core handle write failures', () => {
    mailBridgeCredentialsStore.write('encrypted-credentials');
    expect(configStore.set).toHaveBeenCalledWith('mailBridgeCredentials', 'encrypted-credentials');
    const error = new Error('Config unwritable');
    vi.mocked(configStore.set).mockImplementationOnce(() => {
      throw error;
    });
    expect(() => mailBridgeCredentialsStore.write('encrypted-credentials')).toThrow(error);
  });
});
