import Store, { Schema } from 'electron-store';
import { User } from './types';

// Fields to persist between user sessions
export const fieldsToSave = [
  'backupsEnabled',
  'backupInterval',
  'lastBackup',
  'syncRoot',
  'lastSavedListing',
  'lastSync',
] as const;

interface ConfigStore {
  limit: number;
  usage: number;
  autoLaunch: boolean;
  bearerToken: string;
  userData: User;
  mnemonic: string;
  backupsEnabled: boolean;
  backupInterval: number;
  lastBackup: number;
  syncRoot: string;
  lastSavedListing: string;
  lastSync: number;
  savedConfigs: Record<string, Pick<ConfigStore, typeof fieldsToSave[number]>>;
  lastOnboardingShown: string;
}

const schema: Schema<ConfigStore> = {
  limit: {
    type: 'number',
  },
  usage: {
    type: 'number',
  },
  autoLaunch: {
    type: 'boolean',
  },
  bearerToken: {
    type: 'string',
  },
  userData: {
    type: 'object',
  },
  mnemonic: {
    type: 'string',
  },
  backupsEnabled: {
    type: 'boolean',
  },
  backupInterval: {
    type: 'number',
  },
  lastBackup: {
    type: 'number',
  },
  syncRoot: {
    type: 'string',
  },
  lastSavedListing: {
    type: 'string',
  },
  lastSync: {
    type: 'number',
  },
  savedConfigs: {
    type: 'object',
  },
  lastOnboardingShown: {
    type: 'string',
  },
} as const;

export const defaults: ConfigStore = {
  limit: -1,
  usage: -1,
  autoLaunch: true,
  bearerToken: '',
  userData: {} as User,
  mnemonic: '',
  backupsEnabled: false,
  backupInterval: 24 * 3600 * 1000,
  lastBackup: -1,
  syncRoot: '',
  lastSavedListing: '',
  lastSync: -1,
  savedConfigs: {},
  lastOnboardingShown: '',
};

const configStore = new Store({ schema, defaults });

export default configStore;