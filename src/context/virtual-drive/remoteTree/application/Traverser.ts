import { Service } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { ServerFile, ServerFileStatus } from '../../../shared/domain/ServerFile';
import { ServerFolder, ServerFolderStatus } from '../../../shared/domain/ServerFolder';
import { createFileFromServerFile } from './FileCreatorFromServerFile';
import { createFolderFromServerFolder } from '../../folders/application/create/FolderCreatorFromServerFolder';
import { Folder } from '../../folders/domain/Folder';
import { FolderStatus, FolderStatuses } from '../../folders/domain/FolderStatus';
import { EitherTransformer } from '../../shared/application/EitherTransformer';
import { RemoteTree } from '../domain/RemoteTree';

type Items = {
  files: Array<ServerFile>;
  folders: Array<ServerFolder>;
};
@Service()
export class Traverser {
  constructor(
    private readonly fileStatusesToFilter: Array<ServerFileStatus>,
    private readonly folderStatusesToFilter: Array<ServerFolderStatus>,
  ) {}

  static existingItems(): Traverser {
    return new Traverser([ServerFileStatus.EXISTS], [ServerFolderStatus.EXISTS]);
  }

  private createRootFolder(rootFolderUuid: string): Folder {
    return Folder.from({
      uuid: rootFolderUuid,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      path: '/',
      status: FolderStatus.Exists.value,
    });
  }

  private traverse(tree: RemoteTree, items: Items, currentFolder: Folder) {
    if (!items) return;

    const filesInThisFolder = items.files.filter((file) => file.folderUuid === currentFolder.uuid);

    const foldersInThisFolder = items.folders.filter((folder) => folder.parentUuid === currentFolder.uuid);

    filesInThisFolder.forEach((serverFile) => {
      if (!this.fileStatusesToFilter.includes(serverFile.status)) {
        return;
      }

      if (!serverFile.plainName) {
        logger.warn({ tag: 'SYNC-ENGINE', msg: `[Traverser] File ${serverFile.fileId} has no plainName, skipping` });
        return;
      }

      const extensionToAdd = serverFile.type ? `.${serverFile.type}` : '';

      const relativeFilePath = `${currentFolder.path}/${serverFile.plainName}${extensionToAdd}`.replaceAll('//', '/');

      EitherTransformer.handleWithEither(() => {
        const file = createFileFromServerFile(serverFile, relativeFilePath);
        tree.addFile(currentFolder, file);
      }).fold(
        (error): void => {
          logger.warn({ tag: 'SYNC-ENGINE', msg: '[Traverser] Error adding file:', error });
        },
        () => {
          //  no-op
        },
      );
    });

    foldersInThisFolder.forEach((serverFolder: ServerFolder) => {
      if (!serverFolder.plain_name) {
        logger.warn({
          tag: 'SYNC-ENGINE',
          msg: `[Traverser] Folder ${serverFolder.uuid} has no plain_name, skipping`,
        });
        return;
      }

      const plainName = serverFolder.plain_name;

      const name = `${currentFolder.path}/${plainName}`;

      if (!this.folderStatusesToFilter.includes(serverFolder.status)) {
        return;
      }

      EitherTransformer.handleWithEither(() => {
        const folder = createFolderFromServerFolder(serverFolder, name);

        tree.addFolder(currentFolder, folder);

        return folder;
      }).fold(
        (error) => {
          logger.warn({ msg: `[Traverser] Error adding folder:  ${error} ` });
        },
        (folder) => {
          if (folder.hasStatus(FolderStatuses.EXISTS)) {
            this.traverse(tree, items, folder);
          }
        },
      );
    });
  }

  public run(rootFolderUuid: string, items: Items): RemoteTree {
    const rootFolder = this.createRootFolder(rootFolderUuid);

    const tree = new RemoteTree(rootFolder);

    this.traverse(tree, items, rootFolder);

    return tree;
  }
}
