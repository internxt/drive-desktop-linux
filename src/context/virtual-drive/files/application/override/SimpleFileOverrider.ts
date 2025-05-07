import { Service } from 'diod';
import { FileSize } from '../../domain/FileSize';
import { File } from '../../domain/File';
import { FileContentsId } from '../../domain/FileContentsId';
import { driveServerModule } from '../../../../../infra/drive-server/drive-server.module';

@Service()
export class SimpleFileOverrider {

  async run(file: File, contentsId: string, size: number): Promise<void> {
    file.changeContents(new FileContentsId(contentsId), new FileSize(size));

    await driveServerModule.files.replaceFile({
      uuid: file.uuid,
      fileId: file.contentsId,
      size: file.size,
    });
  }
}
