import { Environment } from '@internxt/inxt-js';
import { ContainerBuilder } from 'diod';
import { DownloadContentsToPlainFile } from '../../../../../context/virtual-drive/contents/application/DownloadContentsToPlainFile';
import { LocalContentsDeleter } from '../../../../../context/virtual-drive/contents/application/LocalContentsDeleter';
import { ContentsManagersFactory } from '../../../../../context/virtual-drive/contents/domain/ContentsManagersFactory';
import { LocalFileSystem } from '../../../../../context/virtual-drive/contents/domain/LocalFileSystem';
import { EnvironmentRemoteFileContentsManagersFactory } from '../../../../../context/virtual-drive/contents/infrastructure/EnvironmentRemoteFileContentsManagersFactory';
import { FSLocalFileSystem } from '../../../../../context/virtual-drive/contents/infrastructure/FSLocalFileSystem';
import { LocalFileContentsDirectoryProvider } from '../../../../../context/virtual-drive/shared/domain/LocalFileContentsDirectoryProvider';
import { FuseAppDataLocalFileContentsDirectoryProvider } from '../../../../../context/virtual-drive/shared/infrastructure/LocalFileContentsDirectoryProviders/FuseAppDataLocalFileContentsDirectoryProvider';
import { DependencyInjectionUserProvider } from '../../../../shared/dependency-injection/main/DependencyInjectionUserProvider';

export function contents(builder: ContainerBuilder): ContainerBuilder {
  const user = DependencyInjectionUserProvider.get();

  // Private
  builder
    .register(ContentsManagersFactory)
    .useFactory(
      (c) =>
        new EnvironmentRemoteFileContentsManagersFactory(
          c.get(Environment),
          user.bucket
        )
    )
    .private();

  builder
    .register(LocalFileContentsDirectoryProvider)
    .use(FuseAppDataLocalFileContentsDirectoryProvider)
    .private();

  builder
    .register(LocalFileSystem)
    .useFactory(
      (c) =>
        new FSLocalFileSystem(
          c.get(LocalFileContentsDirectoryProvider),
          'downloaded'
        )
    )
    .private();

  // Public
  builder.registerAndUse(DownloadContentsToPlainFile);
  builder.registerAndUse(LocalContentsDeleter);

  return builder;
}
