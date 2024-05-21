import { Service } from 'diod';
import { AbsolutePath } from '../../localFile/infrastructure/AbsolutePath';
import { FilesIndexedByPath } from '../../shared/application/FilesIndexedByPath';
import { RemoteFile } from '../domain/RemoteFile';

export type RemoteFilesIndexedByPath = FilesIndexedByPath<RemoteFile>;

@Service()
export class CurrentRemoteFilesProvider {
  constructor() {
    //
  }

  async run(folder: AbsolutePath): Promise<RemoteFilesIndexedByPath> {
    return Promise.reject();
  }
}
