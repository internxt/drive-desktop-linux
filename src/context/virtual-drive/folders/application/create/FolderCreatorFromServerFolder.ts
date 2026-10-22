import { ServerFolder } from '../../../../shared/domain/ServerFolder';
import { Folder } from '../../domain/Folder';

type Props = Pick<ServerFolder, 'id' | 'uuid' | 'parentId' | 'updatedAt' | 'createdAt'> & {
  status: string;
};

export function createFolderFromServerFolder(server: Props, relativePath: string): Folder {
  const path = relativePath.replaceAll('//', '/');

  return Folder.from({
    id: server.id,
    uuid: server.uuid,
    parentId: server.parentId as number,
    updatedAt: server.updatedAt,
    createdAt: server.createdAt,
    path,
    status: server.status,
  });
}
