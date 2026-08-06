import { ContainerBuilder } from 'diod';
import { AbsolutePathToRelativeConverter } from '../../../../context/virtual-drive/shared/application/AbsolutePathToRelativeConverter';
import { RelativePathToAbsoluteConverter } from '../../../../context/virtual-drive/shared/application/RelativePathToAbsoluteConverter';
import { FileRepository } from '../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderRepository } from '../../../../context/virtual-drive/folders/domain/FolderRepository';
import { PATHS } from '../../../../core/electron/paths';
import {
  createDirectoryStateSqliteRepository,
  DirectoryStateSqliteRepository,
} from '../../../../backend/features/virtual-drive/services/lazy/DirectoryStateSqliteRepository';
import {
  createLazyVirtualDriveHydratorService,
  LazyVirtualDriveHydrator,
} from '../../../../backend/features/virtual-drive/services/lazy/virtual-drive-hydrator/create-lazy-virtual-drive-hydrator-service';

export async function registerVirtualDriveSharedServices(builder: ContainerBuilder): Promise<void> {
  const downloaded = PATHS.DOWNLOADED;

  builder.register(RelativePathToAbsoluteConverter).useFactory(() => new RelativePathToAbsoluteConverter(downloaded));
  builder.register(AbsolutePathToRelativeConverter).useFactory(() => new AbsolutePathToRelativeConverter(downloaded));
  builder
    .register(DirectoryStateSqliteRepository)
    .useFactory(() => createDirectoryStateSqliteRepository())
    .asSingleton();
  builder
    .register(LazyVirtualDriveHydrator)
    .useFactory((container) =>
      createLazyVirtualDriveHydratorService({
        folderRepository: container.get(FolderRepository),
        fileRepository: container.get(FileRepository),
        directoryStateRepository: container.get(DirectoryStateSqliteRepository),
      }),
    )
    .asSingleton();
}
