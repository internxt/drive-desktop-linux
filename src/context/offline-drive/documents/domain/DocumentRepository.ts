import { Readable } from 'stream';
import { Document } from './Document';
import { DocumentPath } from './DocumentPath';

export abstract class DocumentRepository {
  abstract create(path: DocumentPath): Promise<void>;

  abstract delete(path: DocumentPath): Promise<void>;

  abstract filter(
    fn: (document: Document) => boolean
  ): Promise<Array<Document>>;

  abstract read(path: DocumentPath, from: number, to: number): Promise<Buffer>;

  abstract write(
    path: DocumentPath,
    buffer: Buffer,
    length: number,
    position: number
  ): Promise<void>;

  abstract stream(path: DocumentPath): Promise<Readable>;

  abstract find(documentPath: DocumentPath): Promise<Document>;

  abstract watchFile(
    documentPath: DocumentPath,
    callback: () => void
  ): () => void;
}
