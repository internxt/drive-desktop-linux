import ConfigStore, { defaults } from '../config';
import { savedConfigFields } from '../config/save-config';

export { getBaseApiHeaders, getNewApiHeaders } from './headers';
export { getUser } from './user-session';
export { logout } from './logout';

export function canHisConfigBeRestored({ uuid }: { uuid: string }) {
  const savedConfigs = ConfigStore.get('savedConfigs');

  if (!savedConfigs) return false;
  const savedConfig = savedConfigs[uuid];

  if (!savedConfig) {
    return false;
  }

  for (const key of savedConfigFields) {
    ConfigStore.set(key, savedConfig[key] ?? defaults[key]);
  }

  return true;
}
