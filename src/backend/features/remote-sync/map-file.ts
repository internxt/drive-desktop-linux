import type { RemoteSyncedFile } from '../../../apps/main/remote-sync/helpers';
import { toDriveItemStatus } from '../../../context/shared/domain/DriveItemStatus';
import type { FileSyncDto } from './types';

export function mapFile(dto: FileSyncDto): RemoteSyncedFile {
  return {
    uuid: dto.uuid,
    fileId: dto.fileId ?? '',
    type: dto.type,
    size: Number.parseInt(dto.size, 10) || 0,
    bucket: dto.bucket,
    folderUuid: dto.folderUuid,
    userId: dto.userId,
    modificationTime: dto.modificationTime,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    plainName: dto.plainName,
    status: toDriveItemStatus(dto.status),
  };
}
