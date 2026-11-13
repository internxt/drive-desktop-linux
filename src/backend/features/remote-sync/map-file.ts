import { toDriveItemStatus } from '@internxt/drive-desktop-core/build/backend';
import type { RemoteSyncedFile } from '../../../apps/main/remote-sync/helpers';
import type { FileSyncMappingDto } from './types';

export function mapFile(dto: FileSyncMappingDto): RemoteSyncedFile {
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
