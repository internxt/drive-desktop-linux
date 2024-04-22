import { Readable } from 'stream';
import { Document } from './Document';
import { DocumentPath } from './DocumentPath';
import { Optional } from '../../../../shared/types/Optional';

export abstract class DocumentRepository {
  abstract create(path: DocumentPath): Promise<void>;

  abstract delete(path: DocumentPath): Promise<void>;

  abstract matchingDirectory(path: string): Promise<Array<DocumentPath>>;

  abstract read(path: DocumentPath): Promise<Buffer>;

  abstract write(
    path: DocumentPath,
    buffer: Buffer,
    length: number,
    position: number
  ): Promise<void>;

  abstract stream(path: DocumentPath): Promise<Readable>;

  abstract find(documentPath: DocumentPath): Promise<Optional<Document>>;

  abstract watchFile(
    documentPath: DocumentPath,
    callback: () => void
  ): () => void;
}
