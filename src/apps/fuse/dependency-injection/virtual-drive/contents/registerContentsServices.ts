import { Environment } from '@internxt/inxt-js';
import { ContentsUploader } from '../../../../../context/virtual-drive/contents/application/ContentsUploader';
import { DownloadContentsToPlainFile } from '../../../../../context/virtual-drive/contents/application/DownloadContentsToPlainFile';
import { LocalContentChecker } from '../../../../../context/virtual-drive/contents/application/LocalContentChecker';
import { RetryContentsUploader } from '../../../../../context/virtual-drive/contents/application/RetryContentsUploader';
import { EnvironmentRemoteFileContentsManagersFactory } from '../../../../../context/virtual-drive/contents/infrastructure/EnvironmentRemoteFileContentsManagersFactory';
import { FSLocalFileProvider } from '../../../../../context/virtual-drive/contents/infrastructure/FSLocalFileProvider';
import { FSLocalFileSystem } from '../../../../../context/virtual-drive/contents/infrastructure/FSLocalFileSystem';
import { FuseAppDataLocalFileContentsDirectoryProvider } from '../../../../../context/virtual-drive/shared/infrastructure/LocalFileContentsDirectoryProviders/FuseAppDataLocalFileContentsDirectoryProvider';
import { MoveOfflineContentsOnContentsUploaded } from '../../../../../context/virtual-drive/contents/application/MoveOfflineContentsOnContentsUploaded';
import { LocalContentsMover } from '../../../../../context/virtual-drive/contents/application/LocalContentsMover';
import { AllLocalContentsDeleter } from '../../../../../context/virtual-drive/contents/application/AllLocalContentsDeleter';
import { MainProcessUploadProgressTracker } from '../../../../../context/shared/infrastructure/MainProcessUploadProgressTracker';
import { MainProcessDownloadProgressTracker } from '../../../../../context/shared/infrastructure/MainProcessDownloadProgressTracker';
import { Container, ContainerBuilder } from 'diod';
import { DependencyInjectionMainProcessUserProvider } from '../../../../shared/dependency-injection/main/DependencyInjectionMainProcessUserProvider';
import { EventBus } from '../../../../../context/virtual-drive/shared/domain/EventBus';
import { UploadProgressTracker } from '../../../../../context/shared/domain/UploadProgressTracker';
import { ContentsManagersFactory } from '../../../../../context/virtual-drive/contents/domain/ContentsManagersFactory';
import { LocalFileContentsDirectoryProvider } from '../../../../../context/virtual-drive/shared/domain/LocalFileContentsDirectoryProvider';
import { LocalFileSystem } from '../../../../../context/virtual-drive/contents/domain/LocalFileSystem';
import { DownloadProgressTracker } from '../../../../../context/shared/domain/DownloadProgressTracker';
import { LocalContentsProvider } from '../../../../../context/virtual-drive/contents/domain/LocalFileProvider';

export function registerContentsServices(
  builder: ContainerBuilder,
  sharedInfrastructure: Container
): void {
  const user = DependencyInjectionMainProcessUserProvider.get();

  const eventBus = sharedInfrastructure.get(EventBus);
  const environment = sharedInfrastructure.get(Environment);

  builder.register(EventBus).useInstance(eventBus);

  builder
    .register(UploadProgressTracker)
    .use(MainProcessUploadProgressTracker)
    .private();

  builder
    .register(ContentsManagersFactory)
    .useFactory(
      () =>
        new EnvironmentRemoteFileContentsManagersFactory(
          environment,
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

  builder
    .register(DownloadProgressTracker)
    .use(MainProcessDownloadProgressTracker)
    .private();

  builder.register(LocalContentsProvider).use(FSLocalFileProvider).private();

  builder.registerAndUse(DownloadContentsToPlainFile);

  builder.registerAndUse(LocalContentChecker);

  builder.registerAndUse(ContentsUploader);
  builder.registerAndUse(RetryContentsUploader);
  builder.registerAndUse(LocalContentsMover);
  builder.registerAndUse(AllLocalContentsDeleter);

  // Event subscribers

  builder
    .registerAndUse(MoveOfflineContentsOnContentsUploaded)
    .addTag('event-handler');
}
