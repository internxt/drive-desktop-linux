import { nativeTheme } from 'electron';

import { broadcastToWindows } from '../../apps/main/windows';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { electronStore } from '../../apps/main/config';
import { Theme, ThemeData } from './theme.types';

export function getTheme(): ThemeData {
  const configTheme = electronStore.get('preferedTheme') ?? 'system';

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
