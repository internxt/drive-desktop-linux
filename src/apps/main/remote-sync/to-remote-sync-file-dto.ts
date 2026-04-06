import { DriveFile } from '../database/entities/DriveFile';
import { RemoteSyncFileDto } from '../../../context/shared/application/sync/remote-sync.contract';

export function toRemoteSyncFileDto(file: DriveFile): RemoteSyncFileDto {
  return {
    bucket: file.bucket,
    createdAt: file.createdAt,
    fileId: file.fileId,
    folderId: file.folderId,
    id: file.id,
    modificationTime: file.modificationTime,
    name: file.name ?? '',
    plainName: file.plainName,
    size: file.size,
    type: file.type ?? null,
    updatedAt: file.updatedAt,
    userId: file.userId,
    status: file.status,
    uuid: file.uuid,
  };
}