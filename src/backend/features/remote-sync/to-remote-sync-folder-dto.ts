import { DriveFolder } from '../../../apps/main/database/entities/DriveFolder';
import { RemoteSyncFolderDto } from '../../../context/shared/application/sync/remote-sync.contract';

export function toRemoteSyncFolderDto(folder: DriveFolder): RemoteSyncFolderDto {
  return {
    bucket: folder.bucket ?? null,
    createdAt: folder.createdAt,
    id: folder.id,
    name: folder.name ?? '',
    parentId: folder.parentId ?? null,
    updatedAt: folder.updatedAt,
    plainName: folder.plainName ?? null,
    status: folder.status,
    uuid: folder.uuid,
  };
}
