import { logger } from '@internxt/drive-desktop-core/build/backend';
import { UserDto } from '../../../../infra/drive-server/out/dto';
import { driveServerModule } from '../../../../infra/drive-server/drive-server.module';
import ConfigStore from '../../config';
import { updateCredentials } from '../update-credentials';
import { updateUser } from '../../../../backend/features/auth/update-user';

export async function initializeCurrentUser() {
  try {
    logger.debug({ tag: 'AUTH', msg: 'Initializing current user...' });

    const refreshResult = await driveServerModule.auth.refresh();
    if (refreshResult.isLeft()) {
      throw new Error(`Failed to refresh user data: ${refreshResult.getLeft().message}`);
    }

    const refreshData = refreshResult.getRight();
    updateCredentials({ newToken: refreshData.newToken });

    const currentUser = ConfigStore.get('userData');
    const updatedUser: UserDto = {
      ...currentUser,
      ...refreshData.user,
      mnemonic: currentUser.mnemonic,
      privateKey: currentUser.privateKey,
      publicKey: currentUser.publicKey,
      revocateKey: currentUser.revocateKey,
    };

    updateUser({ user: updatedUser });

    logger.debug({ tag: 'AUTH', msg: 'Current user initialized successfully' });
  } catch (error) {
    throw logger.error({ tag: 'AUTH', msg: 'Failed to initialize current user', error });
  }
}
