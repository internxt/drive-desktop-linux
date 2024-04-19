import { ContainerBuilder } from 'diod';
import { registerOfflineContentsServices } from './OfflineContents/registerOfflineContentsServices';
import { registerOfflineFilesServices } from './OfflineFiles/buildOfflineFilesContainer';
import { registerBoundaryBridgeContainer } from './BoundaryBridge/boundaryBridgeContainerBuilder';

export class OfflineDriveDependencyContainerFactory {
  static async build(builder: ContainerBuilder): Promise<void> {
    await registerOfflineFilesServices(builder);

    await registerOfflineContentsServices(builder);

    await registerBoundaryBridgeContainer(builder);
  }
}
