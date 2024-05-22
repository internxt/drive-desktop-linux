import { ContainerBuilder } from 'diod';
import { FileBatchUpdater } from '../../../../context/local/localFile/application/update/FileBatchUpdater';
import { LocalFileUploader } from '../../../../context/local/localFile/domain/LocalFileUploader';
import { FileBatchUploader } from '../../../../context/local/localFile/application/upload/FileBatchUploader';
import { EnvironmentLocalFileUploader } from '../../../../context/local/localFile/infrastructure/EnvironmentLocalFileUploader';
import { DependencyInjectionMainProcessUserProvider } from '../../../shared/dependency-injection/main/DependencyInjectionMainProcessUserProvider';
import { Environment } from '@internxt/inxt-js';

export function registerLocalFileServices(builder: ContainerBuilder) {
  //Infra
  const user = DependencyInjectionMainProcessUserProvider.get();
  builder
    .register(LocalFileUploader)
    .useFactory(
      (c) =>
        new EnvironmentLocalFileUploader(c.get(Environment), user.backupsBucket)
    );

  // Services
  builder.registerAndUse(FileBatchUpdater);
  builder.registerAndUse(FileBatchUploader);
}
