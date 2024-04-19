import { ContainerBuilder } from 'diod';
import { MainProcessAuthorizedClients } from '../../../../context/shared/infrastructure/MainProcess/MainProcessAuthorizedClients';
import { AuthorizedClients } from '../../HttpClient/Clients';
import { MainProcessDownloadProgressTracker } from '../../../../context/shared/infrastructure/MainProcessDownloadProgressTracker';
import { DownloadProgressTracker } from '../../../../context/shared/domain/DownloadProgressTracker';
import { sharedInfraBuilder } from '../sharedInfraBuilder';
import PhotosSubmodule from '@internxt/sdk/dist/photos/photos';
import { DependencyInjectionMainProcessPhotosProviderPhotos } from './DependencyInjectionMainProcessPhotosProviderPhotos';
import { UploadProgressTracker } from '../../../../context/shared/domain/UploadProgressTracker';
import { MainProcessUploadProgressTracker } from '../../../../context/shared/infrastructure/MainProcessUploadProgressTracker';
import { RemoteItemsGenerator } from '../../../../context/virtual-drive/tree/domain/RemoteItemsGenerator';
import { SQLiteRemoteItemsGenerator } from '../../../../context/virtual-drive/tree/infrastructure/SQLiteRemoteItemsGenerator';

export async function mainProcessSharedInfraBuilder(): Promise<ContainerBuilder> {
  const builder = sharedInfraBuilder();

  builder
    .register(AuthorizedClients)
    .useClass(MainProcessAuthorizedClients)
    .asSingleton()
    .private()
    .addTag('shared');

  builder
    .register(DownloadProgressTracker)
    .use(MainProcessDownloadProgressTracker)
    .private()
    .addTag('shared');

  builder
    .register(UploadProgressTracker)
    .use(MainProcessUploadProgressTracker)
    .private();

  builder
    .register(PhotosSubmodule)
    .useInstance(DependencyInjectionMainProcessPhotosProviderPhotos.photos)
    .private();

  builder
    .register(RemoteItemsGenerator)
    .use(SQLiteRemoteItemsGenerator)
    .private();

  return builder;
}
