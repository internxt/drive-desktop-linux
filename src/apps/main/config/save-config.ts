import ConfigStore, { SavedConfig } from '../config';

export function saveConfig({ uuid }: { uuid: string }) {
  const savedConfigs = ConfigStore.get('savedConfigs');

  const configToSave: SavedConfig = {
    lastOnboardingShown: ConfigStore.get('lastOnboardingShown'),
    backupsEnabled: ConfigStore.get('backupsEnabled'),
    backupInterval: ConfigStore.get('backupInterval'),
    lastBackup: ConfigStore.get('lastBackup'),
    syncRoot: ConfigStore.get('syncRoot'),
    lastSavedListing: ConfigStore.get('lastSavedListing'),
    lastSync: ConfigStore.get('lastSync'),
    deviceId: ConfigStore.get('deviceId'),
    deviceUUID: ConfigStore.get('deviceUUID'),
    backupList: ConfigStore.get('backupList'),
    nautilusExtensionVersion: ConfigStore.get('nautilusExtensionVersion'),
    discoveredBackup: ConfigStore.get('discoveredBackup'),
    shouldFixDanglingFiles: ConfigStore.get('shouldFixDanglingFiles'),
  };

  ConfigStore.set('savedConfigs', {
    ...savedConfigs,
    [uuid]: configToSave,
  });
}
