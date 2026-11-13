import { ServerFolder } from '../../../../shared/domain/ServerFolder';
import { Folder } from '../../domain/Folder';

type Props = Pick<ServerFolder, 'uuid' | 'parentUuid' | 'updatedAt' | 'createdAt' | 'status'>;

export function createFolderFromServerFolder(server: Props, relativePath: string): Folder {
  const path = relativePath.replaceAll('//', '/');

  return Folder.from({
    uuid: server.uuid,
    parentUuid: server.parentUuid ?? undefined,
    updatedAt: server.updatedAt,
    createdAt: server.createdAt,
    path,
    status: server.status,
  });
}
