import { Service } from 'diod';
import { DocumentRepository } from '../../domain/DocumentRepository';
import { DocumentPath } from '../../domain/DocumentPath';

@Service()
export class DocumentDeleter {
  constructor(private readonly repository: DocumentRepository) {}

  async run(path: string): Promise<void> {
    const documentPath = new DocumentPath(path);

    await this.repository.delete(documentPath);
  }
}
