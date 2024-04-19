import { ContainerBuilder } from 'diod';
import { buildBoundaryBridgeContainer as registerBoundaryBridgeContainer } from './BoundaryBridge/boundaryBridgeContainerBuilder';
import { buildOfflineContentsContainer as registerOfflineContentsServices } from './OfflineContents/registerOfflineContentsServices';
import { buildOfflineFilesContainer as registerOfflineFilesServices } from './OfflineFiles/buildOfflineFilesContainer';

export class OfflineDriveDependencyContainerFactory {
  static async build(builder: ContainerBuilder): Promise<void> {
    await registerOfflineFilesServices(builder);

    await registerOfflineContentsServices(builder);

    await registerBoundaryBridgeContainer(builder);
  }
}
