import { FolderDto } from '../../../infra/drive-server/out/dto';
import { FolderPersistedDto } from '../folders/domain/file-systems/RemoteFileSystem';

export function mapToFolderPersistedDto(folderDto: FolderDto): FolderPersistedDto {
  return {
    uuid: folderDto.uuid,
    updatedAt: folderDto.updatedAt,
    createdAt: folderDto.createdAt,
  };
}
