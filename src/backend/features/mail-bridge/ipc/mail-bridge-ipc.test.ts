import {
  createMailBridgeSession,
  getMailBridgeEmail,
  MailBridgeSessionPreparationError,
  type MailBridgeSession,
  type MailBridgeConnectionSettings,
} from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { ipcMain } from 'electron';
import { getCredentials } from '../../../../apps/main/auth/get-credentials';
import type { User } from '../../../../apps/main/types';
import { getUser } from '../../auth/user-session';
import { getMailBridgeClientConfig } from '../config/get-mail-bridge-client-config';
import { mailBridgeCredentialsStore } from '../config/mail-bridge-credentials-store';
import * as lifecycle from '../services/mail-bridge.service';
import {
  clearMailBridgeIpc,
  getMailBridgeEmailForRenderer,
  setupMailBridgeIpc,
  startMailBridge,
} from './mail-bridge-ipc';

vi.mock('@internxt/drive-desktop-core/build/backend/features/mail-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@internxt/drive-desktop-core/build/backend/features/mail-bridge')>()),
  createMailBridgeSession: vi.fn(),
  getMailBridgeEmail: vi.fn(),
}));
vi.mock('../../../../apps/main/auth/get-credentials', () => ({ getCredentials: vi.fn() }));
vi.mock('../../auth/user-session', () => ({ getUser: vi.fn() }));
vi.mock('../../../../apps/main/windows/settings', () => ({ getSettingsWindow: vi.fn() }));
vi.mock('../../../../apps/main/windows/widget', () => ({ getWidget: vi.fn() }));
vi.mock('../services/mail-bridge.service', () => ({
  startMailBridge: vi.fn(),
  stopMailBridge: vi.fn(),
  getMailBridgeStatus: vi.fn(),
  getMailBridgeSyncProgress: vi.fn(),
  resyncMailBridge: vi.fn(),
  subscribeToMailBridgeStatus: vi.fn(),
  subscribeToMailBridgeSyncProgress: vi.fn(),
}));

describe('Mail Bridge session IPC', () => {
  const user = { uuid: 'account-id', email: 'account@example.test' } as User;
  const session: MailBridgeSession = {
    account_id: user.uuid,
    addresses: [user.email],
    backend_session: {
      token: 'access-token',
      encryption_private_key: 'private-key',
      encryption_public_key: 'public-key',
    },
    mail_client: { username: user.email, password: 'client-credential' },
  };
  const connection: MailBridgeConnectionSettings = {
    hostname: '127.0.0.1',
    imapPort: 1143,
    smtpPort: 1025,
    imapSecurity: 'None',
    smtpSecurity: 'None',
    ...session.mail_client,
  };

  beforeEach(() => {
    vi.mocked(getUser).mockReturnValue(user);
    vi.mocked(getCredentials).mockReturnValue({ newToken: 'access-token', mnemonic: 'stored-mnemonic' });
    vi.mocked(createMailBridgeSession).mockResolvedValue(Result.ok(session));
    vi.mocked(lifecycle.startMailBridge).mockResolvedValue(Result.ok(connection));
  });

  afterEach(() => clearMailBridgeIpc());

  it('passes one authentication snapshot and account-scoped storage to core before starting the shared lifecycle', async () => {
    await expect(startMailBridge()).resolves.toEqual(Result.ok(connection));

    expect(getCredentials).toHaveBeenCalledTimes(1);
    expect(createMailBridgeSession).toHaveBeenCalledWith({
      accountId: user.uuid,
      email: user.email,
      mnemonic: 'stored-mnemonic',
      clientConfig: getMailBridgeClientConfig('access-token'),
      credentialsStore: mailBridgeCredentialsStore,
    });
    expect(lifecycle.startMailBridge).toHaveBeenCalledWith(session);
  });

  it('rejects unauthenticated starts before preparing credentials', async () => {
    vi.mocked(getUser).mockReturnValue(null);

    expect((await startMailBridge()).error?.code).toBe('not-authenticated');
    expect(createMailBridgeSession).not.toHaveBeenCalled();
    expect(lifecycle.startMailBridge).not.toHaveBeenCalled();
  });

  it('preserves actionable core preparation errors as plain IPC data', async () => {
    vi.mocked(createMailBridgeSession).mockResolvedValue(
      Result.err(new MailBridgeSessionPreparationError('mail-not-setup', 'Mailbox is not configured')),
    );

    const result = await startMailBridge();

    expect(result.error).toMatchObject({ code: 'mail-not-setup', message: 'Mailbox is not configured' });
    expect(result.error).not.toBeInstanceOf(Error);
    expect(lifecycle.startMailBridge).not.toHaveBeenCalled();
  });

  it('discards a prepared session when the signed-in account changes', async () => {
    vi.mocked(getUser).mockReturnValueOnce(user).mockReturnValue(null);

    expect((await startMailBridge()).error?.code).toBe('session-changed');
    expect(lifecycle.startMailBridge).not.toHaveBeenCalled();
  });

  it('serializes lifecycle startup errors without exposing the prepared session', async () => {
    vi.mocked(lifecycle.startMailBridge).mockResolvedValue(Result.err(new Error('Port is in use')));

    expect(await startMailBridge()).toEqual(
      Result.err({ name: 'Error', code: 'start-failed', message: 'Port is in use' }),
    );
  });

  it('uses the current token for core email lookup and preserves its error code across IPC', async () => {
    vi.mocked(getMailBridgeEmail).mockResolvedValue(
      Result.err(new MailBridgeSessionPreparationError('mail-not-setup', 'Mailbox is not configured')),
    );

    const result = await getMailBridgeEmailForRenderer();

    expect(getMailBridgeEmail).toHaveBeenCalledWith(getMailBridgeClientConfig('access-token'));
    expect(result.error).toMatchObject({ code: 'mail-not-setup', message: 'Mailbox is not configured' });
    expect(result.error).not.toBeInstanceOf(Error);
  });

  it('removes previous subscriptions when IPC handlers are registered again', () => {
    const unsubscribeStatus = vi.fn();
    const unsubscribeProgress = vi.fn();
    vi.mocked(lifecycle.subscribeToMailBridgeStatus).mockReturnValueOnce(unsubscribeStatus);
    vi.mocked(lifecycle.subscribeToMailBridgeSyncProgress).mockReturnValueOnce(unsubscribeProgress);

    setupMailBridgeIpc();
    setupMailBridgeIpc();

    expect(unsubscribeStatus).toHaveBeenCalledTimes(1);
    expect(unsubscribeProgress).toHaveBeenCalledTimes(1);
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('mail-bridge:start');
  });
});
