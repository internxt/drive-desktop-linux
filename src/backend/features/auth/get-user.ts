import ConfigStore from '../../../apps/main/config';
import { UserDto } from '../../../infra/drive-server/out/dto';
import { Result } from '../../../context/shared/domain/Result';

export function getUser(): Result<UserDto, Error> {
  const user = ConfigStore.get('userData');

  if (user && Object.keys(user).length) {
    return { data: user };
  }

  return { error: new Error('Could not retrieve user') };
}
