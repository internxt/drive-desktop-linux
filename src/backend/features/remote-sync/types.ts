import type { FileSyncDto, FolderSyncDto } from '@internxt/drive-desktop-core/build/backend';

/** API may still send legacy numeric ids; the app only reads these fields when mapping sync DTOs. */
export type FileSyncMappingDto = Pick<
  FileSyncDto,
  | 'uuid'
  | 'fileId'
  | 'type'
  | 'size'
  | 'bucket'
  | 'folderUuid'
  | 'userId'
  | 'modificationTime'
  | 'createdAt'
  | 'updatedAt'
  | 'plainName'
  | 'status'
>;

export type FolderSyncMappingDto = Pick<
  FolderSyncDto,
  'type' | 'bucket' | 'userId' | 'createdAt' | 'updatedAt' | 'uuid' | 'plainName' | 'parentUuid' | 'status'
>;
