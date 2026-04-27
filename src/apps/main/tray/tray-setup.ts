import { app } from 'electron';
import path from 'node:path';
import { TrayMenu } from './tray-menu';
import { getOrCreateWidged, setBoundsOfWidgetByPath, toggleWidgetVisibility } from '../windows/widget';
import { getIsLoggedIn } from '../auth/handlers';
import { getAuthWindow } from '../windows/auth';
import { TrayMenuState } from './types';
import { PATHS } from '../../../core/electron/paths';

let tray: TrayMenu | null = null;

export function getTray() {
  return tray;
}

export function setTrayStatus(status: TrayMenuState) {
  tray?.setState(status);
}

async function onTrayClick() {
  const isLoggedIn = getIsLoggedIn();
  if (!isLoggedIn) {
    getAuthWindow()?.show();
    return;
  }

  const widgetWindow = await getOrCreateWidged();
  if (tray && widgetWindow) {
    setBoundsOfWidgetByPath(widgetWindow, tray);
  }

  if (widgetWindow) toggleWidgetVisibility();
}

async function onQuitClick() {
  app.quit();
}

export function setupTrayIcon() {
  if (tray) return tray;

  const iconsPath = path.join(PATHS.RESOURCES_PATH, 'tray');

  tray = new TrayMenu(iconsPath, onTrayClick, onQuitClick);

  return tray;
}
