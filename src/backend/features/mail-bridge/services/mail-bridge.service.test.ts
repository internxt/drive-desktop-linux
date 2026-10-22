import * as core from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { getCredentials } from '../../../../apps/main/auth/get-credentials';
import type { UserDto } from '../../../../infra/drive-server/out/dto';
import { getUser } from '../../auth/user-session';
import { getMailBridgeClientConfig } from '../config/get-mail-bridge-client-config';
import { isMailBridgeStartOnLoginEnabled } from '../config/is-mail-bridge-start-on-login-enabled';
import { mailBridgeCredentialsStore } from '../config/mail-bridge-credentials-store';
import * as service from './mail-bridge.service';

const { runtime } = vi.hoisted(() => ({
  runtime: {
    startMailBridge: vi.fn(),
    stopMailBridge: vi.fn(),
    resyncMailBridge: vi.fn(),
    updateMailBridgeAccessToken: vi.fn(),
    getMailBridgeStatus: vi.fn(),
    getMailBridgeSyncProgress: vi.fn(),
    subscribeToMailBridgeStatus: vi.fn(),
    subscribeToMailBridgeSyncProgress: vi.fn(),
  },
}));
vi.mock('@internxt/drive-desktop-core/build/backend/features/mail-bridge', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@internxt/drive-desktop-core/build/backend/features/mail-bridge')>();
  return {
    ...actual,
    createMailBridgeService: vi.fn(() => runtime),
    createMailBridgeSession: vi.fn(),
    getMailBridgeEmail: vi.fn(),
  };
});
vi.mock('../../../../apps/main/auth/get-credentials', () => ({ getCredentials: vi.fn() }));
vi.mock('../../auth/user-session', () => ({ getUser: vi.fn() }));
vi.mock('../config/get-mail-bridge-client-config', () => ({ getMailBridgeClientConfig: vi.fn() }));
vi.mock('../config/is-mail-bridge-start-on-login-enabled', () => ({ isMailBridgeStartOnLoginEnabled: vi.fn() }));
vi.mock('../config/mail-bridge-credentials-store', () => ({
  mailBridgeCredentialsStore: { read: vi.fn(), write: vi.fn() },
}));
vi.mock('./mail-bridge-platform', () => ({ linuxMailBridgePlatform: {} }));

describe('Linux Mail Bridge service', () => {
  const user = { uuid: 'account-id', email: 'user@example.test' } as UserDto;
  const config: core.MailBridgeClientConfig = {
    gatewayUrl: 'https://gateway.example.test/drive',
    clientName: 'linux-test',
    clientVersion: '1',
    desktopHeader: 'test-header',
    token: 'test-token',
  };
  const session: core.MailBridgeSession = {
    account_id: user.uuid,
    addresses: ['user@inxt.me'],
    mail_client: { username: 'user@inxt.me', password: 'test-password' },
    backend_session: {
      token: config.token,
      encryption_private_key: 'private-key',
      encryption_public_key: 'public-key',
    },
  };
  const connection: core.MailBridgeConnectionSettings = {
    hostname: '127.0.0.1',
    imapPort: 1143,
    smtpPort: 2025,
    username: 'user@inxt.me',
    password: 'test-password',
    imapSecurity: 'STARTTLS',
    smtpSecurity: 'None',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockReturnValue(user);
    vi.mocked(getCredentials).mockReturnValue({ newToken: config.token, mnemonic: 'test-mnemonic' });
    vi.mocked(getMailBridgeClientConfig).mockReturnValue(config);
    vi.mocked(isMailBridgeStartOnLoginEnabled).mockReturnValue(false);
    vi.mocked(core.createMailBridgeSession).mockReset().mockResolvedValue(Result.ok(session));
    vi.mocked(core.getMailBridgeEmail).mockReset().mockResolvedValue(Result.ok('user@inxt.me'));
    runtime.startMailBridge.mockReset().mockResolvedValue(Result.ok(connection));
    runtime.stopMailBridge.mockReset().mockResolvedValue(Result.ok(undefined));
  });

  it('rejects an unauthenticated start before preparing credentials', async () => {
    vi.mocked(getUser).mockReturnValue(null);
    expect((await service.startMailBridge()).error?.code).toBe('not-authenticated');
    expect(core.createMailBridgeSession).not.toHaveBeenCalled();
    expect(runtime.startMailBridge).not.toHaveBeenCalled();
  });

  it('prepares one authentication snapshot and starts the shared runtime', async () => {
    expect(await service.startMailBridge()).toEqual(Result.ok(connection));
    expect(getCredentials).toHaveBeenCalledTimes(1);
    expect(getMailBridgeClientConfig).toHaveBeenCalledWith(config.token);
    expect(core.createMailBridgeSession).toHaveBeenCalledWith({
      accountId: user.uuid,
      email: user.email,
      mnemonic: 'test-mnemonic',
      clientConfig: config,
      credentialsStore: mailBridgeCredentialsStore,
    });
    expect(runtime.startMailBridge).toHaveBeenCalledWith(session);
  });

  it('preserves missing-mailbox codes from preparation', async () => {
    const error = new core.MailBridgeSessionPreparationError('mail-not-setup', 'Mailbox not configured');
    vi.mocked(core.createMailBridgeSession).mockResolvedValue(Result.err(error));
    expect((await service.startMailBridge()).error).toMatchObject({ code: 'mail-not-setup', message: error.message });
    expect(runtime.startMailBridge).not.toHaveBeenCalled();
  });

  it('assigns a preparation code to generic credential or client failures', async () => {
    vi.mocked(core.createMailBridgeSession).mockResolvedValue(Result.err(new Error('Keyring locked')));
    expect((await service.startMailBridge()).error).toMatchObject({
      code: 'session-creation-failed',
      message: 'Keyring locked',
    });
  });

  it('discards preparation when the signed-in account changes', async () => {
    vi.mocked(getUser).mockReturnValueOnce(user).mockReturnValue(null);
    expect((await service.startMailBridge()).error?.code).toBe('session-changed');
    expect(runtime.startMailBridge).not.toHaveBeenCalled();
  });

  it('reports runtime startup failures with a stable IPC code', async () => {
    runtime.startMailBridge.mockResolvedValue(Result.err(new Error('Port in use')));
    expect((await service.startMailBridge()).error).toMatchObject({ code: 'start-failed', message: 'Port in use' });
  });

  it('starts on login only when the account preference is enabled', async () => {
    await service.startMailBridgeOnLogin();
    expect(core.createMailBridgeSession).not.toHaveBeenCalled();
    vi.mocked(isMailBridgeStartOnLoginEnabled).mockReturnValue(true);
    await service.startMailBridgeOnLogin();
    expect(runtime.startMailBridge).toHaveBeenCalledTimes(1);
  });

  it('keeps automatic-start failures from rejecting login', async () => {
    vi.mocked(isMailBridgeStartOnLoginEnabled).mockReturnValue(true);
    runtime.startMailBridge.mockResolvedValue(Result.err(new Error('Unavailable')));
    await expect(service.startMailBridgeOnLogin()).resolves.toBeUndefined();
  });

  it('uses the current token for account email lookup', async () => {
    expect(await service.getMailBridgeEmail()).toEqual(Result.ok('user@inxt.me'));
    expect(core.getMailBridgeEmail).toHaveBeenCalledWith(config);
  });

  it('returns core shutdown errors unchanged', async () => {
    const error = new Error('Shutdown failed');
    runtime.stopMailBridge.mockResolvedValue(Result.err(error));
    expect((await service.stopMailBridge()).error).toBe(error);
  });
});
