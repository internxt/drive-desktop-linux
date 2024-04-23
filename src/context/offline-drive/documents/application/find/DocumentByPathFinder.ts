import { Service } from 'diod';
import { DocumentRepository } from '../../domain/DocumentRepository';
import { DocumentPath } from '../../domain/DocumentPath';
import { Document } from '../../domain/Document';

@Service()
export class DocumentByPathFinder {
  constructor(private readonly repository: DocumentRepository) {}

  async run(path: string): Promise<Document | undefined> {
    const documentPath = new DocumentPath(path);

    const result = await this.repository.find(documentPath);

    if (result.isPresent()) {
      return result.get();
    }

    return undefined;
  }
}
