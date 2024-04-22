import { Environment } from '@internxt/inxt-js';
import { ContainerBuilder } from 'diod';
import path from 'path';
import { DocumentFromCacheDeleter } from '../../../../context/offline-drive/documents/application/cache/DocumentFromCacheDeleter';
import { DocumentCreator } from '../../../../context/offline-drive/documents/application/creation/DocumentCreator';
import { DeleteDocumentOnFileCreated } from '../../../../context/offline-drive/documents/application/deletion/ClearOfflineFileOnFileCreated';
import { DocumentDeleter } from '../../../../context/offline-drive/documents/application/deletion/DocumentDeleter';
import { DocumentsFinderByFolder } from '../../../../context/offline-drive/documents/application/find/DocumentsFinderByFolder';
import { DocumentChunkReader } from '../../../../context/offline-drive/documents/application/read/DocumentChunkReader';
import { DocumentUploader } from '../../../../context/offline-drive/documents/application/upload/DocumentUploader';
import { BufferToDocumentWriter } from '../../../../context/offline-drive/documents/application/write/BufferToDocumentWriter';
import { DocumentCache } from '../../../../context/offline-drive/documents/domain/DocumentCache';
import { DocumentRepository } from '../../../../context/offline-drive/documents/domain/DocumentRepository';
import { DocumentUploaderFactory } from '../../../../context/offline-drive/documents/domain/upload/DocumentUploaderFactory';
import { FsDocumentRepository } from '../../../../context/offline-drive/documents/infrastructure/FsDocumentRepository';
import { InMemoryDocumentCache } from '../../../../context/offline-drive/documents/infrastructure/cache/InMemoryDocumentCache';
import { EnvironmentDocumentUploaderFactory } from '../../../../context/offline-drive/documents/infrastructure/upload/DocumentUploaderFactory';
import { UploadProgressTracker } from '../../../../context/shared/domain/UploadProgressTracker';
import { FuseAppDataLocalFileContentsDirectoryProvider } from '../../../../context/virtual-drive/shared/infrastructure/LocalFileContentsDirectoryProviders/FuseAppDataLocalFileContentsDirectoryProvider';
import { DependencyInjectionMainProcessUserProvider } from '../../../shared/dependency-injection/main/DependencyInjectionMainProcessUserProvider';
import { DocumentByPathFinder } from '../../../../context/offline-drive/documents/application/find/DocumentByPathFinder';

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
    .useFactory(() => new FsDocumentRepository(read, write))
    .private()
    .asSingleton();

  builder
    .register(DocumentCache)
    .use(InMemoryDocumentCache)
    .asSingleton()
    .private();

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

  builder.registerAndUse(DocumentFromCacheDeleter);
  builder.registerAndUse(DocumentCreator);
  builder.registerAndUse(DocumentDeleter);
  builder.registerAndUse(DocumentsFinderByFolder);
  builder.registerAndUse(DocumentByPathFinder);
  builder.registerAndUse(DocumentChunkReader);
  builder.registerAndUse(DocumentUploader);
  builder.registerAndUse(BufferToDocumentWriter);

  // Event handlers
  builder.registerAndUse(DeleteDocumentOnFileCreated).addTag('event-handler');
}