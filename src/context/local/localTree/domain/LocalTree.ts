import { LocalFile } from '../../localFile/domain/LocalFile';
import { LocalFolder } from '../../localFolder/domain/LocalFolder';
import { LocalFileNode } from './LocalFileNode';
import { LocalFolderNode } from './LocalFolderNode';
import { Node } from './Node';

export class LocalTree {
  private tree = new Map<string, Node>();

  constructor(rootFolder: LocalFolder) {
    const node = LocalFolderNode.from(rootFolder);

    this.tree.set('/', node);
  }

  public get files(): Array<LocalFile> {
    const files: Array<LocalFile> = [];

    this.tree.forEach((node) => {
      if (node.isFile()) {
        files.push(node.file);
      }
    });

    return files;
  }

  public get filePaths(): Array<string> {
    return this.files.map((f) => f.path);
  }

  public get folders(): Array<LocalFolder> {
    const folders: Array<LocalFolder> = [];

    this.tree.forEach((node) => {
      if (node.isFolder()) {
        folders.push(node.folder);
      }
    });

    return folders;
  }

  public get folderPaths(): Array<string> {
    return this.folders.map((f) => f.path);
  }

  public get root(): LocalFolder {
    const node = this.tree.get('/') as LocalFolderNode;

    return node.folder;
  }

  private addNode(node: Node): void {
    this.tree.set(node.id, node);
  }

  addFile(parentNode: LocalFolder, file: LocalFile) {
    const parent = this.tree.get(parentNode.path) as LocalFolderNode;

    if (!parent) {
      throw new Error('Parent node not found');
    }

    const node = LocalFileNode.from(file);

    parent.addChild(node);
    this.addNode(node);
  }

  addFolder(parentNode: LocalFolder, folder: LocalFolder) {
    const parent = this.tree.get(parentNode.path) as LocalFolderNode;

    if (!parent) {
      throw new Error('Parent node not found');
    }

    const node = LocalFolderNode.from(folder);

    parent.addChild(node);
    this.addNode(node);
  }

  has(id: string): boolean {
    return this.tree.has(id);
  }

  get(id: string): LocalFile | LocalFolder {
    const node = this.tree.get(id);

    if (!node) {
      throw new Error(`Could not get the node ${id}`);
    }

    if (node.isFile()) {
      return node.file;
    }

    return node.folder;
  }
}
