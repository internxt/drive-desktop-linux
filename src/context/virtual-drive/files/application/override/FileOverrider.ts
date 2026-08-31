import { Service } from 'diod';
import {
  createTransientErrorHandler,
  parseRetryAfterMs,
} from '../../../../../backend/common/rate-limit/transient-error-handler';
import { DriveDesktopError } from '../../../../shared/domain/errors/DriveDesktopError';
import { EventBus } from '../../../shared/domain/EventBus';
import { File } from '../../domain/File';
import { FileRepository } from '../../domain/FileRepository';
import { FileSize } from '../../domain/FileSize';
import { FileNotFoundError } from '../../domain/errors/FileNotFoundError';
import { FileContentsId } from '../../domain/FileContentsId';
import { overrideFile } from '../../../../../infra/drive-server/services/files/services/override-file';
import { DriveServerError } from '../../../../../infra/drive-server/drive-server.error';
import { retryWithBackoff } from '../../../../../shared/retry-with-backoff';

/**
 * How many times the metadata write is retried after a transient failure. The
 * initial request is not counted, so the ceiling permits this many RETRIES and
 * one more request than that in total.
 *
 * Bounded rather than unbounded. `FileCreator` and both backup upload paths leave
 * the loop unbounded and stop it with an AbortSignal, but only the backup paths
 * pass a signal that can actually fire; `FileCreator` passes
 * `new AbortController().signal`, which nothing holds and nothing can trigger.
 * This code runs from a domain event handler with no signal to offer either, so
 * copying that shape would add a loop with no way out. The bound is a retry
 * budget, not a claim that a failure lasting longer has stopped being transient.
 */
export const MAX_TRANSIENT_OVERRIDE_RETRIES = 3;

/**
 * The transient causes this path retries, deliberately a SUBSET of the shared
 * RETRYABLE_CAUSES.
 *
 * `overrideFile` is a bare `PUT /files/{uuid}` with no revision, version or
 * If-Match, so the server cannot reject a stale write. Nothing between `Release`
 * and this handler serialises two saves of one file. A retry that sleeps and then
 * wakes can therefore land AFTER a newer save and point the file back at older
 * content, and the longer it sleeps the more likely that becomes.
 *
 * So the retry is restricted to the fast-backoff server failures, which is also
 * the only cause with evidence behind it: all 18 observed production failures are
 * 502s and none is a 429. RATE_LIMITED is excluded on purpose. Its backoff starts
 * at 30 s and is capped at 480 s, which would hold a save open for minutes and
 * widen the reordering window accordingly; a 429 therefore still fails on the
 * first attempt, exactly as it does today.
 */
const RETRIED_OVERRIDE_CAUSES: ReadonlyArray<DriveDesktopError['cause']> = [
  'INTERNAL_SERVER_ERROR',
  'CONNECTION_TIMEOUT',
];

@Service()
export class FileOverrider {
  constructor(
    private readonly repository: FileRepository,
    private readonly eventBus: EventBus,
  ) {}

  async run(
    oldContentsId: File['contentsId'],
    newContentsId: File['contentsId'],
    newSize: File['size'],
  ): Promise<File> {
    const file = await this.repository.searchByContentsId(oldContentsId);

    if (!file) {
      throw new FileNotFoundError(oldContentsId);
    }

    file.changeContents(new FileContentsId(newContentsId), new FileSize(newSize));

    const { error } = await retryWithBackoff(
      async () => {
        const result = await overrideFile({
          fileUuid: file.uuid,
          fileContentsId: file.contentsId,
          fileSize: file.size,
        });

        return result.error ? { error: mapOverrideFileError(result.error) } : { data: result.data };
      },
      boundedTransientErrorHandler(file.path),
      new AbortController().signal,
    );

    if (error) {
      throw error;
    }

    await this.repository.update(file);

    this.eventBus.publish(file.pullDomainEvents());

    return file;
  }
}

/**
 * Wraps the shared transient-error handler with a cause allowlist and a retry
 * ceiling. The inner handler still owns HOW LONG to wait for the causes that get
 * through, so the backoff policy stays in one place.
 *
 * A fresh closure per `run` call, so the counter is per override. Do not hoist it
 * to a field: two concurrent overrides would then share one budget.
 */
function boundedTransientErrorHandler(path: string) {
  const handleTransientError = createTransientErrorHandler({
    tag: 'SYNC-ENGINE',
    context: 'FILE OVERRIDE RETRY',
    path,
  });

  let retries = 0;

  return (error: DriveDesktopError): number | null => {
    if (!RETRIED_OVERRIDE_CAUSES.includes(error.cause)) {
      return null;
    }

    if (retries >= MAX_TRANSIENT_OVERRIDE_RETRIES) {
      return null;
    }

    const delayMs = handleTransientError(error);

    if (delayMs === null) {
      return null;
    }

    retries += 1;

    return delayMs;
  };
}

function mapOverrideFileError(error: DriveServerError): DriveDesktopError {
  if (error.cause === 'FILE_TOO_BIG') {
    return new DriveDesktopError('FILE_TOO_BIG', error.message);
  }

  if (
    error.cause === 'EMPTY_FILE' ||
    error.cause === 'EMPTY_FILE_LIMIT_REACHED' ||
    error.cause === 'EMPTY_FILE_UPGRADE_REQUIRED'
  ) {
    return new DriveDesktopError(error.cause, error.message);
  }

  if (error.cause === 'TOO_MANY_REQUESTS') {
    return new DriveDesktopError('RATE_LIMITED', String(parseRetryAfterMs(error.message)));
  }

  if (error.cause === 'SERVER_ERROR') {
    return new DriveDesktopError('INTERNAL_SERVER_ERROR', error.message);
  }

  return new DriveDesktopError('UNKNOWN', error.message);
}
