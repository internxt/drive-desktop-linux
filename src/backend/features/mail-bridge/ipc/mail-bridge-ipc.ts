import { MailBridgeSessionPreparationError } from '@internxt/drive-desktop-core/build/backend';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { ipcMain } from 'electron';
import { getUser } from '../../auth/user-session';
import { getSettingsWindow } from '../../../../apps/main/windows/settings';
import { createMailBridgeSession } from '../create-mail-bridge-session';
import { isMailBridgeStartOnLoginEnabled, setMailBridgeStartOnLogin } from '../mail-bridge-start-on-login.service';
import { getMailBridgeEmail } from '../services/get-mail-bridge-email.service';
import {
  getMailBridgeStatus as getLifecycleMailBridgeStatus,
  getMailBridgeSyncProgress as getLifecycleMailBridgeSyncProgress,
  resyncMailBridge as resyncLifecycleMailBridge,
  startMailBridge as startLifecycleMailBridge,
  stopMailBridge as stopLifecycleMailBridge,
  subscribeToMailBridgeSyncProgress,
  subscribeToMailBridgeStatus,
} from '../services/mail-bridge.service';
import { getWidget } from '../../../../apps/main/windows/widget';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import type { MailBridgeConnectionSettings, MailBridgeStatus } from '../mail-bridge.types';

let unsubscribeFromMailBridgeStatus: (() => void) | undefined;
let unsubscribeFromMailBridgeSyncProgress: (() => void) | undefined;

export function getMailBridgeStatus(): MailBridgeStatus {
  return getLifecycleMailBridgeStatus();
}

export function getMailBridgeStartOnLogin(): boolean {
  return isMailBridgeStartOnLoginEnabled();
}

export function setMailBridgeStartOnLoginPreference({ enabled }: { enabled: boolean }): void {
  setMailBridgeStartOnLogin({ enabled });
  logger.debug({ tag: 'MAIL-BRIDGE', msg: 'Mail Bridge start-on-login preference changed', enabled });
}

export async function startMailBridge(): Promise<Result<MailBridgeConnectionSettings, Error & { code: string }>> {
  const user = getUser();
  if (!user) {
    return Result.err({ name: 'Error', code: 'not-authenticated', message: 'Please log in to start Mail Bridge' });
  }
  const session = await createMailBridgeSession(user);
  if (getUser()?.uuid !== user.uuid) {
    return Result.err({ name: 'Error', code: 'session-changed', message: 'Mail Bridge session was cancelled' });
  }

  if (session.error) {
    const code =
      session.error instanceof MailBridgeSessionPreparationError ? session.error.code : 'session-creation-failed';
    logger.error({ tag: 'MAIL-BRIDGE', msg: 'Mail Bridge session could not be prepared', code, error: session.error });
    return Result.err({ name: session.error.name, code, message: session.error.message });
  }

  const result = await startLifecycleMailBridge(session.data);
  return result.error
    ? Result.err({ name: result.error.name, code: 'start-failed', message: result.error.message })
    : Result.ok(result.data);
}

export async function startMailBridgeOnLogin(): Promise<void> {
  if (isMailBridgeStartOnLoginEnabled()) {
    logger.debug({ tag: 'MAIL-BRIDGE', msg: 'Starting Mail Bridge on login' });

    const result = await startMailBridge();
    if (result.error) {
      logger.warn({
        tag: 'MAIL-BRIDGE',
        msg: 'Mail Bridge could not start automatically',
        code: result.error.code,
      });
    }
  }
}

export async function stopMailBridge(): Promise<Result<undefined, Error>> {
  const result = await stopLifecycleMailBridge();
  if (result.error) {
    logger.error({ tag: 'MAIL-BRIDGE', msg: 'Mail Bridge stop request failed', error: result.error });
  }
  return result.error ? Result.err({ name: result.error.name, message: result.error.message }) : Result.ok(undefined);
}

export async function resyncMailBridge(): Promise<Result<undefined, Error>> {
  const result = await resyncLifecycleMailBridge();
  return result.error ? Result.err({ name: result.error.name, message: result.error.message }) : Result.ok(undefined);
}

export async function getMailBridgeEmailForRenderer(): Promise<
  Result<string, Error & Pick<MailBridgeSessionPreparationError, 'code'>>
> {
  const result = await getMailBridgeEmail();
  return result.error
    ? Result.err({ name: result.error.name, code: result.error.code, message: result.error.message })
    : Result.ok(result.data);
}

export function setupMailBridgeIpc(): void {
  clearMailBridgeIpc();
  unsubscribeFromMailBridgeStatus?.();
  unsubscribeFromMailBridgeStatus = subscribeToMailBridgeStatus((status) => {
    getWidget()?.webContents.send('mail-bridge:status-changed', status);
    getSettingsWindow()?.webContents.send('mail-bridge:status-changed', status);
  });
  unsubscribeFromMailBridgeSyncProgress?.();
  unsubscribeFromMailBridgeSyncProgress = subscribeToMailBridgeSyncProgress((progress) => {
    getWidget()?.webContents.send('mail-bridge:sync-progress-changed', progress);
    getSettingsWindow()?.webContents.send('mail-bridge:sync-progress-changed', progress);
  });
  ipcMain.handle('mail-bridge:start', () => startMailBridge());
  ipcMain.handle('mail-bridge:get-status', () => getMailBridgeStatus());
  ipcMain.handle('mail-bridge:get-email', () => getMailBridgeEmailForRenderer());
  ipcMain.handle('mail-bridge:get-start-on-login', () => getMailBridgeStartOnLogin());
  ipcMain.handle('mail-bridge:set-start-on-login', (_, enabled: boolean) =>
    setMailBridgeStartOnLoginPreference({ enabled }),
  );
  ipcMain.handle('mail-bridge:stop', () => stopMailBridge());
  ipcMain.handle('mail-bridge:resync', () => resyncMailBridge());
  ipcMain.handle('mail-bridge:get-sync-progress', () => getLifecycleMailBridgeSyncProgress());
}

export function clearMailBridgeIpc(): void {
  unsubscribeFromMailBridgeStatus?.();
  unsubscribeFromMailBridgeStatus = undefined;
  unsubscribeFromMailBridgeSyncProgress?.();
  unsubscribeFromMailBridgeSyncProgress = undefined;
  ipcMain.removeHandler('mail-bridge:start');
  ipcMain.removeHandler('mail-bridge:get-status');
  ipcMain.removeHandler('mail-bridge:get-email');
  ipcMain.removeHandler('mail-bridge:get-start-on-login');
  ipcMain.removeHandler('mail-bridge:set-start-on-login');
  ipcMain.removeHandler('mail-bridge:stop');
  ipcMain.removeHandler('mail-bridge:resync');
  ipcMain.removeHandler('mail-bridge:get-sync-progress');
}
