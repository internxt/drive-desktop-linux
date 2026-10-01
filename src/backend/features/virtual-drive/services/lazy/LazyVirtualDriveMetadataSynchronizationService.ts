import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { LazyVirtualDriveMetadataSynchronizer } from './lazy-virtual-drive-metadata-synchronizer';
import { seedVirtualDriveRootFolders } from '../drive-folder/seed-virtual-drive-root-folders';
import { User } from '../../../../../apps/main/types';

type Props = {
  folderRepository: FolderRepository;
  fileRepository: FileRepository;
};

export class LazyVirtualDriveMetadataSynchronizationService {
  constructor({ folderRepository, fileRepository }: Props) {
    this.folderRepository = folderRepository;
    this.fileRepository = fileRepository;
  }

  private readonly folderRepository: FolderRepository;
  private readonly fileRepository: FileRepository;

  readDirectory({ path }: { path: string }) {
    return LazyVirtualDriveMetadataSynchronizer.readDirectory({
      path,
      folderRepository: this.folderRepository,
      fileRepository: this.fileRepository,
    });
  }

  ensurePathMetadataSynchronized({ path }: { path: string }) {
    return LazyVirtualDriveMetadataSynchronizer.ensurePathMetadataSynchronized({
      path,
      folderRepository: this.folderRepository,
      fileRepository: this.fileRepository,
    });
  }

  seedRootFolders({ user }: { user: User }) {
    return seedVirtualDriveRootFolders({
      folderRepository: this.folderRepository,
      user,
    });
  }
}
