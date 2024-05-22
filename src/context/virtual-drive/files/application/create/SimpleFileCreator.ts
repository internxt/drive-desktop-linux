import { Service } from 'diod';
import { RemoteFileSystem } from '../../domain/file-systems/RemoteFileSystem';
import { FilePath } from '../../domain/FilePath';
import { FileSize } from '../../domain/FileSize';
import { FileContentsId } from '../../domain/FileContentsId';
import { FileFolderId } from '../../domain/FileFolderId';
import { File } from '../../domain/File';

@Service()
export class SimpleFileCreator {
  constructor(private readonly remote: RemoteFileSystem) {}

  async run(
    contentsId: string,
    path: string,
    size: number,
    folderId: number
  ): Promise<File> {
    const fileSize = new FileSize(size);
    const fileContentsId = new FileContentsId(contentsId);
    const filePath = new FilePath(path);

    const fileFolderId = new FileFolderId(folderId);

    const { modificationTime, id, uuid, createdAt } = await this.remote.persist(
      {
        contentsId: fileContentsId,
        path: filePath,
        size: fileSize,
        folderId: fileFolderId,
      }
    );

    return File.create({
      id,
      uuid,
      contentsId: fileContentsId.value,
      folderId: fileFolderId.value,
      createdAt,
      modificationTime,
      path: filePath.value,
      size: fileSize.value,
      updatedAt: modificationTime,
    });
  }
}
