import { Service } from 'diod';
import { dirname } from 'path';
import { Document } from '../../domain/Document';
import { DocumentRepository } from '../../domain/DocumentRepository';

@Service()
export class DocumentsFinderByFolder {
  constructor(private readonly repository: DocumentRepository) {}

  async run(path: string): Promise<Array<Document>> {
    const parentPath = dirname(path);

    return this.repository.filter((d) => d.path.dirname() === parentPath);
  }
}
