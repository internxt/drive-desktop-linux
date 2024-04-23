import { Service } from 'diod';
import { DocumentRepository } from '../../domain/WritableDocumentRepository';
import { DocumentPath } from '../../domain/DocumentPath';

@Service()
export class DocumentCreator {
  constructor(private repository: DocumentRepository) {}

  async run(path: string): Promise<void> {
    const documentPath = new DocumentPath(path);

    this.repository.create(documentPath);
  }
}
