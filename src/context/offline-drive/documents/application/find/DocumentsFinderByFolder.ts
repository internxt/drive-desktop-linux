import { Service } from 'diod';
import { dirname } from 'path';
import { DocumentRepository } from '../../domain/DocumentRepository';
import { Document } from '../../domain/Document';

@Service()
export class DocumentsFinderByFolder {
  constructor(private readonly repository: DocumentRepository) {}

  async run(path: string): Promise<Array<Document>> {
    const paths = await this.repository.matchingDirectory(dirname(path));

    const result = await Promise.all(
      paths.map((path) => this.repository.find(path))
    );

    const documents = result
      .filter((opt) => opt.isPresent())
      .map((opt) => opt.get());

    return documents;
  }
}
