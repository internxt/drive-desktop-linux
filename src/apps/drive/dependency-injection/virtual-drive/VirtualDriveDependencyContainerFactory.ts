import { ContainerBuilder } from 'diod';
import { registerFilesServices } from './registerFilesServices';
import { registerFolderServices } from './registerFolderServices';
import { registerVirtualDriveSharedServices } from './registerVirtualDriveSharedServices';
import { registerTreeServices } from './registerTreeServices';
import { LazyVirtualDriveMetadataSynchronizationService } from '../../../../backend/features/virtual-drive/services/lazy/LazyVirtualDriveMetadataSynchronizationService';
import { FileRepository } from '../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderRepository } from '../../../../context/virtual-drive/folders/domain/FolderRepository';

export class VirtualDriveDependencyContainerFactory {
  static async build(builder: ContainerBuilder): Promise<void> {
    registerTreeServices(builder);

    await registerVirtualDriveSharedServices(builder);

    await registerFolderServices(builder);

    await registerFilesServices(builder);

    builder.register(LazyVirtualDriveMetadataSynchronizationService).useFactory((container) => {
      return new LazyVirtualDriveMetadataSynchronizationService({
        folderRepository: container.get(FolderRepository),
        fileRepository: container.get(FileRepository),
      });
    });
  }
}
