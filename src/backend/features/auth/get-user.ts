import ConfigStore from '../../../apps/main/config';
import { User } from '../../../apps/main/types';
import { Result } from '../../../context/shared/domain/Result';

export function getUser(): Result<User, Error> {
  const user = ConfigStore.get('userData');

  if (user && Object.keys(user).length) {
    return { data: user };
  }

  return { error: new Error('Could not retrieve user') };
}
