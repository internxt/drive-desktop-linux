import { Container } from 'diod';
import { MainProcessAuthorizedClients } from '../../../../context/shared/infrastructure/MainProcess/MainProcessAuthorizedClients';
import { AuthorizedClients } from '../../HttpClient/Clients';
import { MainProcessDownloadProgressTracker } from '../../../../context/shared/infrastructure/MainProcessDownloadProgressTracker';
import { DownloadProgressTracker } from '../../../../context/shared/domain/DownloadProgressTracker';
import { sharedInfraBuilder } from '../sharedInfraBuilder';
import PhotosSubmodule from '@internxt/sdk/dist/photos/photos';
import { DependencyInjectionMainProcessPhotosProviderPhotos } from './DependencyInjectionMainProcessPhotosProviderPhotos';

export async function mainProcessSharedInfraContainer(): Promise<Container> {
  const builder = sharedInfraBuilder();

  builder
    .register(AuthorizedClients)
    .useClass(MainProcessAuthorizedClients)
    .asSingleton()
    .addTag('shared');

  builder
    .register(DownloadProgressTracker)
    .use(MainProcessDownloadProgressTracker)
    .addTag('shared');

  builder
    .register(PhotosSubmodule)
    .useInstance(DependencyInjectionMainProcessPhotosProviderPhotos.photos);

  return builder.build();
}
