import { AbsolutePath } from '../../localFile/infrastructure/AbsolutePath';

export abstract class RemoteFileRepository {
  abstract upload(
    path: AbsolutePath,
    size: number,
    abortSignal: AbortSignal
  ): Promise<void>;
}
