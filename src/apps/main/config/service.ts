import { AppStore } from '../../../core/electron/store/app-store.interface';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { electronStore } from '../config';
import { broadcastTheme } from './theme';
import { broadcastLanguage } from './language';
import { Language } from './language.types';
import { ConfigTheme } from './theme.types';

export type StoredValues = keyof AppStore;

type SetConfigKeyProps =
  | { key: 'preferedLanguage'; value: Language }
  | { key: 'preferedTheme'; value: ConfigTheme };

export type { SetConfigKeyProps };

export const getConfigKey = <T extends StoredValues>(key: T): AppStore[T] => {
  return electronStore.get(key);
};

export const setConfigKey = ({ key, value }: SetConfigKeyProps): void => {
  logger.debug({ msg: 'Config key updated', key, value });

  electronStore.set(key, value);

  if (key === 'preferedLanguage') broadcastLanguage();
  else if (key === 'preferedTheme') broadcastTheme();
};
