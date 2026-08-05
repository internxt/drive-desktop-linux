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
    const value = savedConfig[key] ?? defaults[key];

    if (value === undefined) continue;

    ConfigStore.set(key, value);
  }

  return true;
}
