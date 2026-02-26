import { nativeTheme } from 'electron';

import { broadcastToWindows } from '../windows';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { electronStore } from '../config';
import { Theme, ConfigTheme, ThemeData } from './theme.types';

export function getTheme(): ThemeData {
  const configTheme = electronStore.get('preferedTheme') as ConfigTheme;

  nativeTheme.themeSource = configTheme;

  const theme: Theme = configTheme === 'system' ? (nativeTheme.shouldUseDarkColors ? 'dark' : 'light') : configTheme;

  return { configTheme, theme };
}

export function broadcastTheme(): void {
  broadcastToWindows('preferedTheme-updated', getTheme());
}

export function setupThemeListener(): void {
  nativeTheme.on('updated', () => {
    logger.debug({ msg: 'System theme changed' });
    broadcastTheme();
  });
}
