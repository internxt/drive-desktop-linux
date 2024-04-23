import { Environment } from '@internxt/inxt-js';
import { ContainerBuilder } from 'diod';
import path from 'path';
import { DocumentCreator } from '../../../../context/offline-drive/documents/application/creation/DocumentCreator';
import { DeleteDocumentOnFileCreated } from '../../../../context/offline-drive/documents/application/deletion/ClearOfflineFileOnFileCreated';
import { DocumentDeleter } from '../../../../context/offline-drive/documents/application/deletion/DocumentDeleter';
import { DocumentsPathFinderByFolder } from '../../../../context/offline-drive/documents/application/find/DocumentsPathFinderByFolder';
import { DocumentChunkReader } from '../../../../context/offline-drive/documents/application/read/DocumentChunkReader';
import { DocumentUploader } from '../../../../context/offline-drive/documents/application/upload/DocumentUploader';
import { BufferToDocumentWriter } from '../../../../context/offline-drive/documents/application/write/BufferToDocumentWriter';
import { DocumentRepository } from '../../../../context/offline-drive/documents/domain/DocumentRepository';
import { DocumentUploaderFactory } from '../../../../context/offline-drive/documents/domain/upload/DocumentUploaderFactory';
import { FsWritableDocumentRepository } from '../../../../context/offline-drive/documents/infrastructure/FsWritableDocumentRepository';
import { EnvironmentDocumentUploaderFactory } from '../../../../context/offline-drive/documents/infrastructure/upload/DocumentUploaderFactory';
import { UploadProgressTracker } from '../../../../context/shared/domain/UploadProgressTracker';
import { FuseAppDataLocalFileContentsDirectoryProvider } from '../../../../context/virtual-drive/shared/infrastructure/LocalFileContentsDirectoryProviders/FuseAppDataLocalFileContentsDirectoryProvider';
import { DependencyInjectionMainProcessUserProvider } from '../../../shared/dependency-injection/main/DependencyInjectionMainProcessUserProvider';
import { DocumentByPathFinder } from '../../../../context/offline-drive/documents/application/find/DocumentByPathFinder';
import { DocumentByteByByteComparator } from '../../../../context/offline-drive/documents/application/comparation/DocumentByteByByteComparator';
import { DocumentsFinderByFolder } from '../../../../context/offline-drive/documents/application/find/DocumentsFinderByFolder';

export async function registerDocumentServices(builder: ContainerBuilder) {
  // Infra
  const localFileContentsDirectoryProvider =
    new FuseAppDataLocalFileContentsDirectoryProvider();

  const dir = await localFileContentsDirectoryProvider.provide();

  const user = DependencyInjectionMainProcessUserProvider.get();

  const read = path.join(dir, 'downloaded');
  const write = path.join(dir, 'uploads');

  builder
    .register(DocumentRepository)
    .useFactory(() => new FsWritableDocumentRepository(read, write))
    .private()
    .asSingleton();

  builder
    .register(DocumentUploaderFactory)
    .useFactory(
      (c) =>
        new EnvironmentDocumentUploaderFactory(
          c.get(Environment),
          user.bucket,
          c.get(UploadProgressTracker)
        )
    )
    .asSingleton()
    .private();

  // Services

  builder.registerAndUse(DocumentCreator);
  builder.registerAndUse(DocumentDeleter);
  builder.registerAndUse(DocumentsPathFinderByFolder);
  builder.registerAndUse(DocumentByPathFinder);
  builder.registerAndUse(DocumentChunkReader);
  builder.registerAndUse(DocumentUploader);
  builder.registerAndUse(BufferToDocumentWriter);
  builder.registerAndUse(DocumentByteByByteComparator);
  builder.registerAndUse(DocumentsFinderByFolder);

  // Event handlers
  builder.registerAndUse(DeleteDocumentOnFileCreated).addTag('event-handler');
}
