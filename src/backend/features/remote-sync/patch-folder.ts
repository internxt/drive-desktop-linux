import type { RemoteSyncedFolder } from '../../../apps/main/remote-sync/helpers';
import type { FolderSyncDto } from './types';

export function resolveFolderStatus(
  dto: Partial<Pick<FolderSyncDto, 'status' | 'removed' | 'deleted'>>,
): RemoteSyncedFolder['status'] {
  if (dto.status) {
    return dto.status;
  }
  if (dto.removed) {
    return 'REMOVED';
  }
  if (dto.deleted) {
    return 'DELETED';
  }
  return 'EXISTS';
}

export function patchFolder(dto: FolderSyncDto): RemoteSyncedFolder {
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
