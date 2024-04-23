import { Service } from 'diod';
import { DocumentRepository } from '../../domain/WritableDocumentRepository';
import { DocumentPath } from '../../domain/DocumentPath';
import { OfflineContentsIOError } from '../../../contents/domain/errors/IOError';

@Service()
export class BufferToDocumentWriter {
  constructor(private readonly repository: DocumentRepository) {}

  async run(
    path: string,
    buffer: Buffer,
    length: number,
    position: number
  ): Promise<void> {
    const documentPath = new DocumentPath(path);

    try {
      this.repository.write(documentPath, buffer, length, position);
    } catch (error: unknown) {
      throw new OfflineContentsIOError();
    }
  }
}
