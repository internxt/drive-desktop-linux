import { Service } from 'diod';
import { DocumentCache } from '../../domain/DocumentCache';
import { DocumentPath } from '../../domain/DocumentPath';

@Service()
export class DocumentFromCacheDeleter {
  constructor(private readonly repository: DocumentCache) {}

  async run(path: string): Promise<void> {
    const documentPath = new DocumentPath(path);

    this.repository.delete(documentPath);
  }
}
