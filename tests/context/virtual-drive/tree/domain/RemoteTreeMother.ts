import { FolderStatus } from '../../../../../src/context/virtual-drive/folders/domain/FolderStatus';
import { RemoteTree } from '../../../../../src/context/virtual-drive/remoteTree/domain/RemoteTree';
import { FolderMother } from '../../folders/domain/FolderMother';

export class RemoteTreeMother {
  static any(): RemoteTree {
    const root = FolderMother.fromPartial({
      parentId: null,
      path: '/',
      status: FolderStatus.Exists.value,
    });

    const tree = new RemoteTree(root);

    return tree;
  }
}
