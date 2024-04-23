import { Service } from 'diod';
import { Optional } from '../../../../../shared/types/Optional';
import { DocumentPath } from '../../domain/DocumentPath';
import { DocumentRepository } from '../../domain/DocumentRepository';

@Service()
export class DocumentChunkReader {
  constructor(private readonly repository: DocumentRepository) {}

  async run(
    path: string,
    length: number,
    position: number
  ): Promise<Optional<Buffer>> {
    const documentPath = new DocumentPath(path);

    const from = position;
    const to = position + length;

    const data = await this.repository.read(documentPath);

    const chunk = data.slice(from, to);

    if (chunk.byteLength === 0) {
      return Optional.empty();
    }

    return Optional.of(chunk);
  }
}
