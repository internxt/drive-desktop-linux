import type { FileRepository } from '../../../../../../context/virtual-drive/files/domain/FileRepository';
import type { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';
import type { DirectoryStateSqliteRepository } from '../DirectoryStateSqliteRepository';

export type LazyVirtualDriveHydratorProps = {
  folderRepository: FolderRepository;
  fileRepository: FileRepository;
  directoryStateRepository: DirectoryStateSqliteRepository;
};

export type ReadDirectoryProps = {
  path: string;
};

export type EnsurePathLoadedProps = {
  path: string;
};

export type HydratorStatusScope = 'EXISTS';
