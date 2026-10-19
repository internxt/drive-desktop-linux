import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { MailBridgeSessionPreparationError } from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { getWidget } from '../../../../apps/main/windows/widget';
import { getSettingsWindow } from '../../../../apps/main/windows/settings';
import { setMailBridgeStartOnLogin } from '../config/set-mail-bridge-start-on-login';
import * as service from '../services/mail-bridge.service';
import { clearMailBridgeIpc, setupMailBridgeIpc } from './mail-bridge-ipc';

vi.mock('../../../../apps/main/windows/widget', () => ({ getWidget: vi.fn() }));
vi.mock('../../../../apps/main/windows/settings', () => ({ getSettingsWindow: vi.fn() }));
vi.mock('../config/is-mail-bridge-start-on-login-enabled', () => ({ isMailBridgeStartOnLoginEnabled: vi.fn() }));
vi.mock('../config/set-mail-bridge-start-on-login', () => ({ setMailBridgeStartOnLogin: vi.fn() }));
vi.mock('../services/mail-bridge.service', () => ({
  startMailBridge: vi.fn(),
  stopMailBridge: vi.fn(),
  resyncMailBridge: vi.fn(),
  getMailBridgeStatus: vi.fn(),
  getMailBridgeEmail: vi.fn(),
  getMailBridgeSyncProgress: vi.fn(),
  subscribeToMailBridgeStatus: vi.fn(),
  subscribeToMailBridgeSyncProgress: vi.fn(),
}));

describe('Mail Bridge IPC', () => {
  const unsubscribeStatus = vi.fn();
  const unsubscribeProgress = vi.fn();
  const event = {} as IpcMainInvokeEvent;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(service.subscribeToMailBridgeStatus).mockReturnValue(unsubscribeStatus);
    vi.mocked(service.subscribeToMailBridgeSyncProgress).mockReturnValue(unsubscribeProgress);
    vi.mocked(getWidget).mockReturnValue(null);
    vi.mocked(getSettingsWindow).mockReturnValue(null);
  });
  afterEach(() => clearMailBridgeIpc());

  function handler(channel: string) {
    const registered = vi.mocked(ipcMain.handle).mock.calls.find(([name]) => name === channel);
    if (!registered) throw new Error(`No IPC handler registered for ${channel}`);
    return registered[1];
  }

  it('replaces handlers and subscriptions when setup runs again', () => {
    setupMailBridgeIpc();
    expect(ipcMain.handle).toHaveBeenCalledTimes(8);
    setupMailBridgeIpc();
    expect(unsubscribeStatus).toHaveBeenCalledTimes(1);
    expect(unsubscribeProgress).toHaveBeenCalledTimes(1);
    expect(ipcMain.handle).toHaveBeenCalledTimes(16);
    expect(ipcMain.removeHandler).toHaveBeenCalledTimes(16);
    expect(service.startMailBridge).not.toHaveBeenCalled();
  });

  it('removes every registered handler and listener during teardown', () => {
    setupMailBridgeIpc();
    vi.mocked(ipcMain.removeHandler).mockClear();
    clearMailBridgeIpc();
    for (const [channel] of vi.mocked(ipcMain.handle).mock.calls) {
      expect(ipcMain.removeHandler).toHaveBeenCalledWith(channel);
    }
    expect(unsubscribeStatus).toHaveBeenCalledTimes(1);
    expect(unsubscribeProgress).toHaveBeenCalledTimes(1);
    clearMailBridgeIpc();
    expect(unsubscribeStatus).toHaveBeenCalledTimes(1);
  });

  it('keeps custom error codes when crossing Electron IPC', async () => {
    const error = Object.assign(new Error('Mailbox not configured'), { code: 'mail-not-setup' });
    vi.mocked(service.startMailBridge).mockResolvedValue(Result.err(error));
    setupMailBridgeIpc();

    const result: unknown = await handler('mail-bridge:start')(event);

    expect(result).toEqual(Result.err({ name: 'Error', message: error.message, code: error.code }));
    expect(structuredClone(result)).toEqual(result);
    expect(result).not.toHaveProperty('error', expect.any(Error));
  });

  it('serializes account lookup errors without dropping mailbox error codes', async () => {
    const error = new MailBridgeSessionPreparationError('mail-not-setup', 'Mailbox not configured');
    vi.mocked(service.getMailBridgeEmail).mockResolvedValue(Result.err(error));
    setupMailBridgeIpc();
    expect(await handler('mail-bridge:get-email')(event)).toEqual(
      Result.err({ name: 'Error', message: error.message, code: error.code }),
    );
  });

  it.each(['stop', 'resync'] as const)('serializes %s errors with their messages', async (action) => {
    const mock = action === 'stop' ? service.stopMailBridge : service.resyncMailBridge;
    vi.mocked(mock).mockResolvedValue(Result.err(new Error('Control channel failed')));
    setupMailBridgeIpc();
    expect(await handler(`mail-bridge:${action}`)(event)).toEqual(
      Result.err({ name: 'Error', message: 'Control channel failed' }),
    );
  });

  it('passes successful results through without altering their data', async () => {
    const result = Result.ok('user@inxt.me');
    vi.mocked(service.getMailBridgeEmail).mockResolvedValue(result);
    setupMailBridgeIpc();
    expect(await handler('mail-bridge:get-email')(event)).toBe(result);
  });

  it('sends live updates to both the widget and settings window', () => {
    const widget = { webContents: { send: vi.fn() } };
    const settings = { webContents: { send: vi.fn() } };
    vi.mocked(getWidget).mockReturnValue(widget as never);
    vi.mocked(getSettingsWindow).mockReturnValue(settings as never);
    setupMailBridgeIpc();
    const status = { status: 'starting' as const, error: undefined };
    const progress = { percentage: 40, completedMessages: 4, totalMessages: 10 };
    vi.mocked(service.subscribeToMailBridgeStatus).mock.calls[0][0](status);
    vi.mocked(service.subscribeToMailBridgeSyncProgress).mock.calls[0][0](progress);
    for (const window of [widget, settings]) {
      expect(window.webContents.send).toHaveBeenCalledWith('mail-bridge:status-changed', status);
      expect(window.webContents.send).toHaveBeenCalledWith('mail-bridge:sync-progress-changed', progress);
    }
  });

  it('handles updates while neither window exists', () => {
    setupMailBridgeIpc();
    expect(() =>
      vi.mocked(service.subscribeToMailBridgeStatus).mock.calls[0][0]({ status: 'stopped', error: undefined }),
    ).not.toThrow();
  });

  it.each([true, false])('forwards preference changes to the config adapter (%s)', async (enabled) => {
    setupMailBridgeIpc();
    await handler('mail-bridge:set-start-on-login')(event, enabled);
    expect(setMailBridgeStartOnLogin).toHaveBeenCalledWith(enabled);
  });
});
