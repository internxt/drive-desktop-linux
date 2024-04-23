/* eslint-disable no-await-in-loop */
import { Service } from 'diod';
import { DocumentPath } from '../../domain/DocumentPath';
import { DocumentRepository } from '../../domain/WritableDocumentRepository';

@Service()
export class DocumentByteByByteComparator {
  constructor(private readonly repository: DocumentRepository) {}

  async run(doc1: DocumentPath, doc2: DocumentPath): Promise<boolean> {
    return this.repository.areEqual(doc1, doc2);
  }
}
