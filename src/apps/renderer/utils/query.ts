import { StoredValues } from '../../main/config/service.types';
import { AppStore } from '../../main/config';

export async function getConfigKey<T extends StoredValues>(key: T): Promise<AppStore[T]> {
  return window.electron.getConfigKey(key);
}
