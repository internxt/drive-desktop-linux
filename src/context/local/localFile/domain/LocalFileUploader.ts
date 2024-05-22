import { AbsolutePath } from '../infrastructure/AbsolutePath';

export abstract class LocalFileUploader {
  abstract upload(
    path: AbsolutePath,
    size: number,
    abortSignal: AbortSignal
  ): Promise<string>;
}
