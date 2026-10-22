import { UserDto } from '../../../infra/drive-server/out/dto';
import { AppStore } from './app-store.interface';
import { DEFAULT_LANGUAGE } from '../../../apps/shared/Locale/Language';

export const defaults: AppStore = {
  // Credentials
  newToken: '',
  newTokenEncrypted: false,
  mnemonic: '',
  mnemonicEncrypted: false,
  userData: {} as UserDto,

  // Sync / backup
  backupsEnabled: false,
  backgroundScanEnabled: true,
  backupInterval: 86_400_000, // 24h
  lastBackup: -1,
  virtualDriveRoot: '',
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

  fileManagerExtensionVersion: 0,
  discoveredBackup: 0,

  // Drive
  availableUserProducts: undefined,
  maxUploadFileSizeInBytes: 0,

  // Mail Bridge
  mailBridgeCredentials: '',
  mailBridgeStartOnLogin: false,
};

export const fieldsToSave: Array<keyof AppStore> = [
  'lastOnboardingShown',
  'backupsEnabled',
  'backgroundScanEnabled',
  'backupInterval',
  'lastBackup',
  'virtualDriveRoot',
  'lastSavedListing',
  'lastSync',
  'deviceId',
  'deviceUUID',
  'backupList',
  'fileManagerExtensionVersion',
  'discoveredBackup',
  'maxUploadFileSizeInBytes',
  'mailBridgeCredentials',
  'mailBridgeStartOnLogin',
];
