import { Container } from 'diod';
import { base } from '../../shared/dependency-injection/base';
import { common } from '../../shared/dependency-injection/main/common';
import { files } from './virtual-drive/files/files';
import { contents } from './virtual-drive/contents/contents';
import { folders } from './virtual-drive/folders/folders';
import { tree } from './virtual-drive/tree/tree';

export async function build(): Promise<Container> {
  const builder = base();

  await common(builder);

  files(builder);
  folders(builder);
  contents(builder);
  tree(builder);

  return builder.build();
}
