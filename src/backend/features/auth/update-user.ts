import ConfigStore from '../../../apps/main/config';
import { User } from '../../../apps/main/types';

type Props = {
  user: User;
};

export function updateUser({ user }: Props) {
  ConfigStore.set('userData', user);
}
