import type { RemoteSyncedFolder } from '../../../apps/main/remote-sync/helpers';
import { toDriveItemStatus, type FolderSyncDto } from '@internxt/drive-desktop-core/build/backend';
import type { FolderSyncMappingDto } from './types';

export function resolveFolderStatus(dto: Pick<FolderSyncDto, 'status'>): RemoteSyncedFolder['status'] {
  return toDriveItemStatus(dto.status);
}

export function mapFolder(dto: FolderSyncMappingDto): RemoteSyncedFolder {
  return {
    type: dto.type,
    bucket: dto.bucket ?? null,
    userId: dto.userId,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    uuid: dto.uuid,
    plainName: dto.plainName,
    parentUuid: dto.parentUuid || undefined,
    status: resolveFolderStatus(dto),
  };
}
