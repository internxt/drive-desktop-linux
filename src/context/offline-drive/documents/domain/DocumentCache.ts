import { DocumentPath } from './DocumentPath';

export abstract class DocumentCache {
  abstract has(path: DocumentPath): boolean;
  abstract set(path: DocumentPath, value: Buffer): void;
  abstract read(path: DocumentPath, from: number, to: number): Buffer;
  abstract delete(path: DocumentPath): void;
  abstract clear(): void;
}
