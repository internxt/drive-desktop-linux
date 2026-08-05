import ConfigStore from '../../../apps/main/config';
import { User } from '../../../apps/main/types';

export function getUser(): User | null {
  const user = ConfigStore.get('userData');

  return user && Object.keys(user).length ? user : null;
}
