import { ContainerBuilder } from 'diod';
import { registerDocumentServices } from './registerDocumentServices';
import { registerLocalFileServices } from './registerLocalFileServices';

export class OfflineDependencyContainerFactory {
  static async build(builder: ContainerBuilder): Promise<void> {
    await registerDocumentServices(builder);
    await registerLocalFileServices(builder);
  }
}
