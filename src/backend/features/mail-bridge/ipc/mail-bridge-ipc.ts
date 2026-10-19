import { ipcMain } from 'electron';
import { toIpcResult } from '../../../../core/electron/ipc/to-ipc-result';
import { getWidget } from '../../../../apps/main/windows/widget';
import { getSettingsWindow } from '../../../../apps/main/windows/settings';
import { isMailBridgeStartOnLoginEnabled } from '../config/is-mail-bridge-start-on-login-enabled';
import { setMailBridgeStartOnLogin } from '../config/set-mail-bridge-start-on-login';
import {
  startMailBridge,
  stopMailBridge,
  resyncMailBridge,
  getMailBridgeStatus,
  getMailBridgeEmail,
  getMailBridgeSyncProgress,
  subscribeToMailBridgeStatus,
  subscribeToMailBridgeSyncProgress,
} from '../services/mail-bridge.service';

let unsubscribe: Array<() => void> = [];

const handlers = {
  /** Prepares and starts the current account's bridge, returning an IPC-safe result. */
  'mail-bridge:start': async () => toIpcResult(await startMailBridge()),
  /** Stops the running or starting bridge, returning an IPC-safe result. */
  'mail-bridge:stop': async () => toIpcResult(await stopMailBridge()),
  /** Requests a resync from the running bridge, returning an IPC-safe result. */
  'mail-bridge:resync': async () => toIpcResult(await resyncMailBridge()),
  /** Returns the current lifecycle status, including connection settings when running. */
  'mail-bridge:get-status': getMailBridgeStatus,
  /** Fetches the current account's Mail address, preserving error details across IPC. */
  'mail-bridge:get-email': async () => toIpcResult(await getMailBridgeEmail()),
  /** Returns the current sync progress, or undefined when no sync progress is available. */
  'mail-bridge:get-sync-progress': getMailBridgeSyncProgress,
  /** Reads whether the bridge should start automatically when the account logs in. */
  'mail-bridge:get-start-on-login': isMailBridgeStartOnLoginEnabled,
  /** Stores the start-on-login preference. */
  'mail-bridge:set-start-on-login': (_event: unknown, enabled: boolean) => {
    setMailBridgeStartOnLogin(enabled);
  },
};

/**
 * Registers renderer-facing bridge commands and forwards status and sync progress
 * updates to the widget and settings windows. Clears previous handlers and
 * subscriptions first so repeated setup does not duplicate them.
 */
export function setupMailBridgeIpc(): void {
  clearMailBridgeIpc();
  unsubscribe = [
    subscribeToMailBridgeStatus((status) => {
      getWidget()?.webContents.send('mail-bridge:status-changed', status);
      getSettingsWindow()?.webContents.send('mail-bridge:status-changed', status);
    }),
    subscribeToMailBridgeSyncProgress((progress) => {
      getWidget()?.webContents.send('mail-bridge:sync-progress-changed', progress);
      getSettingsWindow()?.webContents.send('mail-bridge:sync-progress-changed', progress);
    }),
  ];
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, handler);
  }
}

/**
 * Removes all bridge IPC handlers and event subscriptions owned by this module.
 * This disconnects renderers without stopping the bridge process itself.
 */
export function clearMailBridgeIpc(): void {
  for (const removeListener of unsubscribe) removeListener();
  unsubscribe = [];
  for (const channel of Object.keys(handlers)) ipcMain.removeHandler(channel);
}
