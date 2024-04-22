import { Service } from 'diod';
import { dirname } from 'path';
import { DocumentRepository } from '../../domain/DocumentRepository';
import { DocumentPath } from '../../domain/DocumentPath';

@Service()
export class DocumentsFinderByFolder {
  constructor(private readonly repository: DocumentRepository) {}

  async run(path: string): Promise<Array<DocumentPath>> {
    return this.repository.matchingDirectory(dirname(path));
  }
}