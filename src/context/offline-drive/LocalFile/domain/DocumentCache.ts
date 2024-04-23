import { LocalFilePath } from './LocalFilePath';

export abstract class LocalFileCache {
  abstract has(path: LocalFilePath): boolean;
  abstract set(path: LocalFilePath, value: Buffer): void;
  abstract read(path: LocalFilePath, from: number, to: number): Buffer;
  abstract delete(path: LocalFilePath): void;
  abstract clear(): void;
}
