import type { RemoteSyncedFolder } from '../../../apps/main/remote-sync/helpers';
import { DriveItemStatus, toDriveItemStatus } from '../../../context/shared/domain/DriveItemStatus';
import type { FolderSyncDto } from './types';

export function resolveFolderStatus(
  dto: Partial<Pick<FolderSyncDto, 'status' | 'removed' | 'deleted'>>,
): RemoteSyncedFolder['status'] {
  if (dto.status) {
    return toDriveItemStatus(dto.status);
  }
  if (dto.removed) {
    return DriveItemStatus.DELETED;
  }
  if (dto.deleted) {
    return DriveItemStatus.TRASHED;
  }
  return DriveItemStatus.EXISTS;
}

export function mapFolder(dto: FolderSyncDto): RemoteSyncedFolder {
  return {
    type: dto.type,
    id: dto.id,
    parentId: dto.parentId ?? null,
    bucket: dto.bucket ?? null,
    userId: dto.userId,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    uuid: dto.uuid,
    plainName: dto.plainName,
    name: dto.name || undefined,
    status: resolveFolderStatus(dto),
  };
}
