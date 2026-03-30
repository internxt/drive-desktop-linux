import { ContainerBuilder } from 'diod';
import { RemoteFileSystem } from '../../../../context/virtual-drive/files/domain/file-systems/RemoteFileSystem';
import { SDKRemoteFileSystem } from '../../../../context/virtual-drive/files/infrastructure/SDKRemoteFileSystem';
import { DependencyInjectionUserProvider } from '../../../shared/dependency-injection/DependencyInjectionUserProvider';

export function registerFilesServices(builder: ContainerBuilder) {
  // Infra
  const user = DependencyInjectionUserProvider.get();

  builder
    .register(RemoteFileSystem)
    .useFactory(() => new SDKRemoteFileSystem(user.backupsBucket))
    .private();
}
