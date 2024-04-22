import { Service } from 'diod';
import { DocumentCache } from '../../domain/DocumentCache';
import { DocumentPath } from '../../domain/DocumentPath';

@Service()
export class InMemoryDocumentCache implements DocumentCache {
  private buffers: Map<string, Buffer> = new Map();

  has(path: DocumentPath): boolean {
    return this.buffers.has(path.value);
  }

  set(path: DocumentPath, value: Buffer): void {
    this.buffers.set(path.value, value);
  }

  read(path: DocumentPath, from: number, to: number): Buffer {
    const buffer = this.buffers.get(path.value);

    if (!buffer) {
      throw new Error(`${path.value} is not cached`);
    }

    return buffer.slice(from, to);
  }

  delete(path: DocumentPath): void {
    this.buffers.delete(path.value);
  }

  clear(): void {
    this.buffers.clear();
  }
}
