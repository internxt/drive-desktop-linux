import { useEffect, useState } from 'react';

import { AppStore } from '../../../core/electron/store/app-store.interface';
import { StoredValues } from '../../main/config/service.types';

export default function useConfig<K extends StoredValues>(key: K) {
  const [value, setValue] = useState<AppStore[K] | undefined>(undefined);

  async function retrieveValue(key: K) {
    return window.electron.getConfigKey(key);
  }

  useEffect(() => {
    retrieveValue(key).then(setValue);
  }, [key]);

  return value;
}
