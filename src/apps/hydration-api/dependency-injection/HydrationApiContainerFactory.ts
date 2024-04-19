import { Container, ContainerBuilder } from 'diod';
import { files } from './virtual-drive/files/files';
import { contents } from './virtual-drive/contents/contents';
import { folders } from './virtual-drive/folders/folders';
import { tree } from './virtual-drive/tree/tree';

export class HydrationApiContainerFactory {
  static async build(builder: ContainerBuilder): Promise<Container> {
    files(builder);
    folders(builder);
    contents(builder);
    tree(builder);

    return builder.build();
  }
}
