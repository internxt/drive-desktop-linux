import { FileRepository } from '../../../../../../context/virtual-drive/files/domain/FileRepository';
import { Folder } from '../../../../../../context/virtual-drive/folders/domain/Folder';
import { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';

export type PathMetadataProps = {
  path: string;
  folderRepository: FolderRepository;
  fileRepository: FileRepository;
};

export type FolderMetadataProps = Omit<PathMetadataProps, 'path'> & {
  folder: Folder;
};
