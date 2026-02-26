import { User } from '../../../apps/main/types';
import { AppStore } from './app-store.interface';
import { DEFAULT_LANGUAGE } from '../../../apps/shared/Locale/Language';

export const defaults: AppStore = {
  // Credentials
  newToken: '',
  newTokenEncrypted: false,
  mnemonic: '',
  mnemonicEncrypted: false,
  userData: {} as User,

  // Sync / backup
  backupsEnabled: false,
  backupInterval: 86_400_000, // 24h
  lastBackup: -1,
  syncRoot: '',
  logEnginePath: '',
  lastSavedListing: '',
  lastSync: -1,

  // Device
  deviceId: -1,
  deviceUUID: '',
  backupList: {},

  // Persistence
  savedConfigs: {},
  lastOnboardingShown: '',

  // UI preferences
  preferedLanguage: DEFAULT_LANGUAGE,
  preferedTheme: 'system',

  // Linux-specific: nautilus
  nautilusExtensionVersion: 0,
  discoveredBackup: 0,

  // Drive
  shouldFixDanglingFiles: true,
  storageMigrationDate: '2025-02-19T12:00:00Z',
  fixDeploymentDate: '2025-03-04T15:30:00Z',
  availableUserProducts: undefined,
};

export const fieldsToSave: Array<keyof AppStore> = [
  'lastOnboardingShown',
  'backupsEnabled',
  'backupInterval',
  'lastBackup',
  'syncRoot',
  'lastSavedListing',
  'lastSync',
  'deviceId',
  'deviceUUID',
  'backupList',
  'nautilusExtensionVersion',
  'discoveredBackup',
  'shouldFixDanglingFiles',
];
