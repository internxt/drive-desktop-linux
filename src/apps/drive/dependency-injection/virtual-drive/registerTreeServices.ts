import { ContainerBuilder } from 'diod';
import { RemoteTreeBuilder } from '../../../../context/virtual-drive/remoteTree/application/RemoteTreeBuilder';
import { RemoteItemsGenerator } from '../../../../context/virtual-drive/remoteTree/domain/RemoteItemsGenerator';
import { Traverser } from '../../../../context/virtual-drive/remoteTree/application/Traverser';
import { DependencyInjectionUserProvider } from '../../../shared/dependency-injection/DependencyInjectionUserProvider';

export function registerTreeServices(builder: ContainerBuilder): void {
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
