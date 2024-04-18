import { ContainerBuilder } from 'diod';
import { MainProcessAuthorizedClients } from '../../../../context/shared/infrastructure/MainProcess/MainProcessAuthorizedClients';
import { AuthorizedClients } from '../../HttpClient/Clients';
import { MainProcessDownloadProgressTracker } from '../../../../context/shared/infrastructure/MainProcessDownloadProgressTracker';
import { DownloadProgressTracker } from '../../../../context/shared/domain/DownloadProgressTracker';

export async function common(
  builder: ContainerBuilder
): Promise<ContainerBuilder> {
  builder
    .register(AuthorizedClients)
    .useClass(MainProcessAuthorizedClients)
    .asSingleton()
    .private();

  builder
    .register(DownloadProgressTracker)
    .use(MainProcessDownloadProgressTracker)
    .private();
  return builder;
}
