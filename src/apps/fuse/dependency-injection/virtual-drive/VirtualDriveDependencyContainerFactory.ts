import { VirtualDriveDependencyContainer } from './VirtualDriveDependencyContainer';
import { buildContentsContainer } from './contents/builder';
import { buildFilesContainer } from './files/builder';
import { buildFoldersContainer } from './folders/builder';
import { buildSharedContainer } from './shared/builder';
import { buildTreeContainer } from './tree/builder';
import { Container, ContainerBuilder } from 'diod';

export class VirtualDriveDependencyContainerFactory {
  private static _container: VirtualDriveDependencyContainer | undefined;

  static readonly subscribers: Array<keyof VirtualDriveDependencyContainer> = [
    'createFileOnOfflineFileUploaded',
    'moveOfflineContentsOnContentsUploaded',
  ];

  eventSubscribers(
    key: keyof VirtualDriveDependencyContainer
  ):
    | VirtualDriveDependencyContainer[keyof VirtualDriveDependencyContainer]
    | undefined {
    if (!VirtualDriveDependencyContainerFactory._container) return undefined;

    return VirtualDriveDependencyContainerFactory._container[key];
  }

  async build(
    hydrationContainer: Container
  ): Promise<VirtualDriveDependencyContainer> {
    if (VirtualDriveDependencyContainerFactory._container !== undefined) {
      return VirtualDriveDependencyContainerFactory._container;
    }

    const builder = new ContainerBuilder();

    const treeContainer = buildTreeContainer();

    const tree = await treeContainer.existingNodesTreeBuilder.run();

    const sharedContainer = await buildSharedContainer();

    const { old: folderContainer } = await buildFoldersContainer(
      tree.folders,
      builder,
      hydrationContainer
    );

    const contentsContainer = await buildContentsContainer(sharedContainer);
    const { old: filesContainer } = await buildFilesContainer(
      tree.files,
      builder,
      hydrationContainer
    );

    const container = {
      ...treeContainer,
      ...folderContainer,
      ...filesContainer,
      ...contentsContainer,
      ...sharedContainer,
    };

    return container;
  }
}
