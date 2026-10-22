import ConfigStore from '../../../apps/main/config';
import { UserDto } from '../../../infra/drive-server/out/dto';

type Props = {
  user: UserDto;
};

export function updateUser({ user }: Props) {
  ConfigStore.set('userData', user);
}
