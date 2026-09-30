import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { LazyVirtualDriveMetadataSynchronizer } from './lazy-virtual-drive-metadata-synchronizer';

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
}