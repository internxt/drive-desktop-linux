import { Container } from 'diod';
import { FuseError, FuseNoSuchFileOrDirectoryError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { RenameMoveOrTrashFile } from '../../../../../apps/drive/fuse/callbacks/RenameMoveOrTrashFile';
import { RenameMoveOrTrashFolder } from '../../../../../apps/drive/fuse/callbacks/RenameMoveOrTrashFolder';
import { UploadOnRename } from '../../../../../apps/drive/fuse/callbacks/UploadOnRename';
import { Result } from '../../../../../context/shared/domain/Result';

type Props = {
  src: string;
  dest: string;
  container: Container;
};

export async function rename({ src, dest, container }: Props): Promise<Result<void, FuseError>> {
  const fileEither = await new RenameMoveOrTrashFile(container).execute(src, dest);

  if (fileEither.isLeft()) {
    return { error: fileEither.getLeft() };
  }

  if (fileEither.getRight() === 'success') {
    return { data: undefined };
  }

  const folderEither = await new RenameMoveOrTrashFolder(container).execute(src, dest);

  if (folderEither.isLeft()) {
    return { error: folderEither.getLeft() };
  }

  if (folderEither.getRight() === 'success') {
    return { data: undefined };
  }

  const uploadEither = await new UploadOnRename(container).run(src, dest);

  if (uploadEither.isLeft()) {
    return { error: uploadEither.getLeft() };
  }

  if (uploadEither.getRight() === 'success') {
    return { data: undefined };
  }

  return { error: new FuseNoSuchFileOrDirectoryError(src) };
}
