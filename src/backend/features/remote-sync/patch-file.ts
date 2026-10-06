import type { RemoteSyncedFile } from '../../../apps/main/remote-sync/helpers';
import type { FileSyncDto } from './types';

export function patchFile(dto: FileSyncDto): RemoteSyncedFile {
  return {
    id: dto.id,
    uuid: dto.uuid,
    fileId: dto.fileId ?? '',
    type: dto.type,
    size: Number.parseInt(dto.size, 10) || 0,
    bucket: dto.bucket,
    folderId: dto.folderId,
    folderUuid: dto.folderUuid,
    userId: dto.userId,
    modificationTime: dto.modificationTime,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    plainName: dto.plainName,
    name: dto.name || undefined,
    status: dto.status,
  };
}
