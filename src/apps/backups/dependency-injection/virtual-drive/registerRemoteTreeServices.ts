import { ContainerBuilder } from 'diod';
import { RemoteTreeBuilder } from '../../../../context/virtual-drive/remoteTree/application/RemoteTreeBuilder';
import { Traverser } from '../../../../context/virtual-drive/remoteTree/application/Traverser';
import { RemoteItemsGenerator } from '../../../../context/virtual-drive/remoteTree/domain/RemoteItemsGenerator';
import { IpcRemoteItemsGenerator } from '../../../../context/virtual-drive/remoteTree/infrastructure/IpcRemoteItemsGenerator';
import { SyncEngineIPC } from '../../../sync-engine/SyncEngineIpc';
import crypt from '../../../../context/shared/infrastructure/crypt';
import { DependencyInjectionUserProvider } from '../../../shared/dependency-injection/DependencyInjectionUserProvider';

export function registerRemoteTreeServices(builder: ContainerBuilder) {
  // Infra
  builder
    .register(RemoteItemsGenerator)
    .useFactory(() => new IpcRemoteItemsGenerator(SyncEngineIPC))
    .private();

  builder
    .register(Traverser)
    .useFactory(() => {
      return Traverser.existingItems(crypt);
    })
    .asSingleton()
    .private();

  // Services
  builder.register(RemoteTreeBuilder).useFactory(container => {
    const itemsGenerator = container.get(RemoteItemsGenerator);
    const traverser = container.get(Traverser);
    const user = DependencyInjectionUserProvider.get();

    return new RemoteTreeBuilder(
      itemsGenerator,
      traverser,
      user.rootFolderId
    );
  });
}
