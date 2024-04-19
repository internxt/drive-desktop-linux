import { Container, ContainerBuilder } from 'diod';
import { registerContentsServices } from './contents/registerContentsServices';
import { registerFilesServices } from './files/builder';
import { registerFolderServices } from './folders/builder';
import { buildSharedContainer } from './shared/builder';
import { registerTreeServices } from './tree/registerTreeServices';
import { TreeBuilder } from '../../../../context/virtual-drive/tree/application/TreeBuilder';

export class VirtualDriveDependencyContainerFactory {
  static async build(
    builder: ContainerBuilder,
    sharedInfrastructure: Container
  ): Promise<void> {
    registerTreeServices(builder, sharedInfrastructure);

    const tree = await sharedInfrastructure.get(TreeBuilder).run();

    await buildSharedContainer(builder);

    await registerFolderServices(builder, sharedInfrastructure, tree.folders);

    registerContentsServices(builder, sharedInfrastructure);

    await registerFilesServices(builder, sharedInfrastructure, tree.files);
  }
}
