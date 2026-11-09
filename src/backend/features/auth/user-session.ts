import ConfigStore from '../../../apps/main/config';
import { UserDto } from '@internxt/drive-desktop-core/build/backend';

export function getUser(): UserDto | null {
  const user = ConfigStore.get('userData');

  return user && Object.keys(user).length ? user : null;
}
