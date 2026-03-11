import { AppStore } from '../../../core/electron/store/app-store.interface';
import { Language } from './language.types';
import { ConfigTheme } from '../../../core/theme';

export type StoredValues = keyof AppStore;

export type SetConfigKeyProps =
  | { key: 'preferedLanguage'; value: Language }
  | { key: 'preferedTheme'; value: ConfigTheme };
