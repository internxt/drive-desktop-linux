import { ContainerBuilder } from 'diod';
import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { InMemoryFileRepository } from '../../../../../context/virtual-drive/files/infrastructure/InMemoryFileRepository';
import { FilesByFolderPathSearcher } from '../../../../../context/virtual-drive/files/application/FilesByFolderPathSearcher';
import { FirstsFileSearcher } from '../../../../../context/virtual-drive/files/application/FirstsFileSearcher';
import { RetrieveAllFiles } from '../../../../../context/virtual-drive/files/application/RetrieveAllFiles';
import { FilesSearcherByPartialMatch } from '../../../../../context/virtual-drive/files/application/search-all/FilesSearcherByPartialMatch';

export function files(builder: ContainerBuilder): ContainerBuilder {
  builder
    .register(FileRepository)
    .use(InMemoryFileRepository)
    .asSingleton()
    .private();

  builder.registerAndUse(FilesByFolderPathSearcher);
  builder.registerAndUse(FirstsFileSearcher);
  builder.registerAndUse(RetrieveAllFiles);
  builder.registerAndUse(FilesSearcherByPartialMatch);

  return builder;
}
