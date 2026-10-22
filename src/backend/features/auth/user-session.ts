import ConfigStore from '../../../apps/main/config';
import { UserDto } from '../../../infra/drive-server/out/dto';

export function getUser(): UserDto | null {
  const user = ConfigStore.get('userData');

  return user && Object.keys(user).length ? user : null;
}
