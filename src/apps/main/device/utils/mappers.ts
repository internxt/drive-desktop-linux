import { components } from 'src/infra/schemas';
import { Backup } from '../service';

export function mapFolderDtoToBackup(
  createFolderDto: components['schemas']['FolderDto']
): Backup {
  return {
    id: createFolderDto.id,
    name: createFolderDto.plainName,
    uuid: createFolderDto.uuid,
  };
}
