import { ContainerBuilder } from 'diod';
import { LocalFileRepository } from '../../../../context/offline-drive/LocalFile/domain/LocalFileRepository';
import { FsLocalFilesRepository } from '../../../../context/offline-drive/LocalFile/infrastructure/FsReadOnlyDocumentRepository';
import { app } from 'electron';
import path from 'path';
import { LocalFileIsAvailable } from '../../../../context/offline-drive/LocalFile/application/find/LocalFileIsAvaliable';
import { LocalFileChunkReader } from '../../../../context/offline-drive/LocalFile/application/read/LocalFileChunkReader';
import { LocalFileWriter } from '../../../../context/offline-drive/LocalFile/application/write/LocalFileWriter';

export async function registerLocalFileServices(
  builder: ContainerBuilder
): Promise<void> {
  // Infra

  const appData = app.getPath('appData');
  const local = path.join(appData, 'internxt-drive', 'downloaded');

  const repo = new FsLocalFilesRepository(local);
  await repo.init();

  builder.register(LocalFileRepository).useInstance(repo).private();

  // Services
  builder.registerAndUse(LocalFileIsAvailable);
  builder.registerAndUse(LocalFileChunkReader);
  builder.registerAndUse(LocalFileWriter);
}
