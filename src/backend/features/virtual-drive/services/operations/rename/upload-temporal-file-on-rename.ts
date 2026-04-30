import { Container } from 'diod';
import { File } from '../../../../../../context/virtual-drive/files/domain/File';
import { TemporalFile } from '../../../../../../context/storage/TemporalFiles/domain/TemporalFile';
import { TemporalFileUploader } from '../../../../../../context/storage/TemporalFiles/application/upload/TemporalFileUploader';
import { TemporalFileDeleter } from '../../../../../../context/storage/TemporalFiles/application/deletion/TemporalFileDeleter';
import { FuseError } from '../../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { Result } from '../../../../../../context/shared/domain/Result';
import { compareTemporalFile } from './compare-temporal-file';

type Props = {
    virtual: File,
    document: TemporalFile,
    src: string,
    container: Container
};

export async function uploadTemporalFileOnRename({ virtual, document, src, container }: Props): Promise<Result<void, FuseError>> {
  const hasDiff = await compareTemporalFile({ virtual, document, container });

  if (!hasDiff) {
    await container.get(TemporalFileDeleter).run(src);
    return { data: undefined };
  }

  await container.get(TemporalFileUploader).run(document, {
    contentsId: virtual.contentsId,
    name: virtual.name,
    extension: virtual.type,
  });

  await container.get(TemporalFileDeleter).run(src);
  return { data: undefined };
}
