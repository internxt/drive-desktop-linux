import { ContainerBuilder } from 'diod';
import { RemoteItemsGenerator } from '../../../../../context/virtual-drive/tree/domain/RemoteItemsGenerator';
import { SQLiteRemoteItemsGenerator } from '../../../../../context/virtual-drive/tree/infrastructure/SQLiteRemoteItemsGenerator';
import { NameDecrypt } from '../../../../../context/virtual-drive/tree/domain/NameDecrypt';
import { CryptoJsNameDecrypt } from '../../../../../context/virtual-drive/tree/infrastructure/CryptoJsNameDecrypt';
import { TreeBuilder } from '../../../../../context/virtual-drive/tree/application/TreeBuilder';
export function tree(builder: ContainerBuilder): ContainerBuilder {
  builder
    .register(RemoteItemsGenerator)
    .use(SQLiteRemoteItemsGenerator)
    .private();

  builder.register(NameDecrypt).use(CryptoJsNameDecrypt).private();

  builder.registerAndUse(TreeBuilder);

  return builder;
}
