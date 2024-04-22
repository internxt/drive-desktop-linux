import { Service } from 'diod';
import { Optional } from '../../../../../shared/types/Optional';
import { DocumentPath } from '../../domain/DocumentPath';
import { DocumentRepository } from '../../domain/DocumentRepository';
import { DocumentCache } from '../../domain/DocumentCache';

@Service()
export class DocumentChunkReader {
  constructor(
    private readonly cache: DocumentCache,
    private readonly repository: DocumentRepository
  ) {}

  private getChunk(
    documentPath: DocumentPath,
    from: number,
    to: number
  ): Promise<Buffer> {
    if (this.cache.has(documentPath)) {
      return this.cache.read(documentPath, from, to);
    }

    return this.repository.read(documentPath, from, to);
  }

  async run(
    path: string,
    length: number,
    position: number
  ): Promise<Optional<Buffer>> {
    const documentPath = new DocumentPath(path);

    const from = position;
    const to = position + length;

    const chunk = await this.getChunk(documentPath, from, to);

    if (chunk.byteLength === 0) {
      return Optional.empty();
    }

    return Optional.of(chunk);
  }
}
