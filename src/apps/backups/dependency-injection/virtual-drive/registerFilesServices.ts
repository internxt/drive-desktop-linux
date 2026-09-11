import { ContainerBuilder } from 'diod';
import { RemoteFileSystem } from '../../../../context/virtual-drive/files/domain/file-systems/RemoteFileSystem';
import { SDKRemoteFileSystem } from '../../../../context/virtual-drive/files/infrastructure/SDKRemoteFileSystem';
import { getUser } from '../../../../backend/features/auth/get-user';

export function registerFilesServices(builder: ContainerBuilder) {
  // Infra
  const { data: user, error } = getUser();
  if (error) throw error;

  builder
    .register(RemoteFileSystem)
    .useFactory(() => new SDKRemoteFileSystem(user.backupsBucket))
    .private();
}
