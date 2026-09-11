import { Container } from 'diod';
import { SingleFolderMatchingFinder } from '../../../../context/virtual-drive/folders/application/SingleFolderMatchingFinder';
import { FilesByPartialSearcher } from '../../../../context/virtual-drive/files/application/search/FilesByPartialSearcher';
import { FileStatuses } from '../../../../context/virtual-drive/files/domain/FileStatus';

type Props = {
  path: string;
  container: Container;
};

export async function findFolderFiles({ path, container }: Props) {
  const folder = await container.get(SingleFolderMatchingFinder).run({ path });

  return await container.get(FilesByPartialSearcher).run({
    folderId: folder.id,
    status: FileStatuses.EXISTS,
  });
}
