import ConfigStore from '../../../apps/main/config';
import { UserDto } from '@internxt/drive-desktop-core/build/backend';
import { Result } from '../../../context/shared/domain/Result';

export function getUser(): Result<UserDto, Error> {
  const user = ConfigStore.get('userData');

  if (user && Object.keys(user).length) {
    return { data: user };
  }

  return { error: new Error('Could not retrieve user') };
}
