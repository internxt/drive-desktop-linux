import { Service } from 'diod';
import { LocalFile } from '../../localFile/domain/LocalFile';
import { AbsolutePath } from '../../localFile/infrastructure/AbsolutePath';
import { LocalItemsGenerator } from '../domain/LocalItemsGenerator';
import { LocalTree } from '../domain/LocalTree';
import { LocalFolder } from '../../localFolder/domain/LocalFolder';

@Service()
export default class LocalTreeBuilder {
  constructor(private readonly generator: LocalItemsGenerator) {}

  private async traverse(tree: LocalTree, currentFolder: LocalFolder) {
    const { files, folders } = await this.generator.getAll(currentFolder.path);

    files.forEach((fileAttributes) => {
      const file = LocalFile.from(fileAttributes);
      tree.addFile(currentFolder, file);
    });

    for (const folderAttributes of folders) {
      const folder = LocalFolder.from(folderAttributes);

      tree.addFolder(currentFolder, folder);

      // eslint-disable-next-line no-await-in-loop
      await this.traverse(tree, folder);
    }
  }

  async run(folder: AbsolutePath): Promise<LocalTree> {
    const root = await this.generator.root(folder);

    const rootFolder = LocalFolder.from(root);

    const tree = new LocalTree(rootFolder);

    await this.traverse(tree, rootFolder);

    return tree;
  }
}
