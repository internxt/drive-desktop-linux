import { ContainerBuilder } from 'diod';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { InMemoryFolderRepository } from '../../../../../context/virtual-drive/folders/infrastructure/InMemoryFolderRepository';
import { FoldersByParentPathLister } from '../../../../../context/virtual-drive/folders/application/FoldersByParentPathLister';
import { ParentFolderFinder } from '../../../../../context/virtual-drive/folders/application/ParentFolderFinder';
import { SingleFolderMatchingFinder } from '../../../../../context/virtual-drive/folders/application/SingleFolderMatchingFinder';

export function folders(builder: ContainerBuilder): ContainerBuilder {
  builder
    .register(FolderRepository)
    .use(InMemoryFolderRepository)
    .asSingleton()
    .private();

  builder.registerAndUse(ParentFolderFinder);
  builder.registerAndUse(SingleFolderMatchingFinder);
  builder.registerAndUse(FoldersByParentPathLister);

  return builder;
}
