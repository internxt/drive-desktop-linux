import { AbsolutePath } from '../infrastructure/AbsolutePath';

export abstract class LocalFileHandler {
  abstract upload(
    path: AbsolutePath,
    size: number,
    abortSignal: AbortSignal
  ): Promise<string>;

  abstract delete(contentsId: string): Promise<void>;
}
