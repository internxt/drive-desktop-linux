import ConfigStore, { defaults } from '../../../apps/main/config';
import { savedConfigFields } from '../../../apps/main/config/save-config';

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
