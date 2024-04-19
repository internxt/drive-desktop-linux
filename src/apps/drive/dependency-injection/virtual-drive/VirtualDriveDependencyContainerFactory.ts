import { ContainerBuilder } from 'diod';
import { registerContentsServices } from './contents/registerContentsServices';
import { registerFilesServices } from './files/builder';
import { registerFolderServices } from './folders/builder';
import { buildSharedContainer } from './shared/builder';
import { registerTreeServices } from './tree/registerTreeServices';

export class VirtualDriveDependencyContainerFactory {
  static async build(builder: ContainerBuilder): Promise<void> {
    registerTreeServices(builder);

    await buildSharedContainer(builder);

    await registerFolderServices(builder);

    registerContentsServices(builder);

    await registerFilesServices(builder);
  }
}
