import { ServerFile } from '../../../shared/domain/ServerFile';
import { File } from '../../files/domain/File';

type Props = Pick<
  ServerFile,
  'id' | 'uuid' | 'folderId' | 'fileId' | 'modificationTime' | 'size' | 'createdAt' | 'updatedAt' | 'status'
>;

export function createFileFromServerFile(server: Props, relativePath: string): File {
  return File.from({
    id: server.id,
    uuid: server.uuid,
    folderId: server.folderId,
    contentsId: server.fileId,
    modificationTime: server.modificationTime,
    size: server.size,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
    path: relativePath,
    status: server.status,
  });
}
