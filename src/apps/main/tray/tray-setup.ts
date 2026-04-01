import { app } from 'electron';
import path from 'node:path';
import { TrayMenu } from './tray-menu';
import { getOrCreateWidged, setBoundsOfWidgetByPath, toggleWidgetVisibility } from '../windows/widget';
import { getIsLoggedIn } from '../auth/handlers';
import { getAuthWindow } from '../windows/auth';
import { TrayMenuState } from './types';

let tray: TrayMenu | null = null;

export function getTray() {
  return tray;
}

export function setTrayStatus(status: TrayMenuState) {
  tray?.setState(status);
}

export function setupTrayIcon() {
  if (tray) return tray;

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../../../assets');

  const iconsPath = path.join(RESOURCES_PATH, 'tray');

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

  tray = new TrayMenu(iconsPath, onTrayClick, onQuitClick);

  return tray;
}