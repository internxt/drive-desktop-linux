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

  private createRootFolder(id: number, rootFolderUuid: string): Folder {
    return Folder.from({
      id,
      uuid: rootFolderUuid,
      parentId: null,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      path: '/',
      status: FolderStatus.Exists.value,
    });
  }

  private traverse(tree: RemoteTree, items: Items, currentFolder: Folder) {
    if (!items) return;

    const filesInThisFolder = items.files.filter((file) => file.folderId === currentFolder.id);

    const foldersInThisFolder = items.folders.filter((folder) => {
      return folder.parentId === currentFolder.id;
    });

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
        logger.warn({ tag: 'SYNC-ENGINE', msg: `[Traverser] Folder ${serverFolder.id} has no plain_name, skipping` });
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
            // The folders and the files inside trashed or deleted folders
            // will have the status "EXISTS", to avoid filtering witch folders and files
            // are in a deleted or trashed folder they not included on the collection.
            // We cannot perform any action on them either way
            this.traverse(tree, items, folder);
          }
        },
      );
    });
  }

  public run(rootFolderId: number, rootFolderUuid: string, items: Items): RemoteTree {
    const rootFolder = this.createRootFolder(rootFolderId, rootFolderUuid);

    const tree = new RemoteTree(rootFolder);

    this.traverse(tree, items, rootFolder);

    return tree;
  }
}
