import { ContainerBuilder } from 'diod';
import { OfflineFileAndContentsCreator } from '../../../../../context/offline-drive/boundaryBridge/application/OfflineFileAndContentsCreator';

export async function buildBoundaryBridgeContainer(
  builder: ContainerBuilder
): Promise<void> {
  builder.registerAndUse(OfflineFileAndContentsCreator);
}
