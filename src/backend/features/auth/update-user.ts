import ConfigStore from '../../../apps/main/config';
import { UserDto } from '@internxt/drive-desktop-core/build/backend';

type Props = {
  user: UserDto;
};

export function updateUser({ user }: Props) {
  ConfigStore.set('userData', user);
}
