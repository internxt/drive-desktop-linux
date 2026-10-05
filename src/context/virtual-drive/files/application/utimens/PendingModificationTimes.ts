import { Service } from 'diod';

/**
 * Modification times requested by utimensat(2) for files that are still staged
 * locally and have no drive record yet.
 *
 * `cp -p` and friends set the timestamp on the OPEN descriptor, before close, so
 * the request arrives while the file exists only as a temporal file. Measured
 * with strace:
 *
 *     openat(AT_FDCWD, "dst", O_WRONLY|O_CREAT|O_EXCL, 0600) = 4
 *     utimensat(4, NULL, [...], 0)                           = 0
 *     close(4)                                               = 0
 *
 * There is nothing to update remotely at that point, so the time is held here
 * and sent with the file's CREATE call once the upload happens. Going through
 * creation rather than a later content-replace matters: `POST /files` takes a
 * modification time as a normal part of creating a file, whereas the replace
 * endpoint would be re-declaring the file's contents to change a timestamp.
 *
 * In memory on purpose. A time that does not survive a restart is lost, and the
 * file simply keeps the upload time, which is the behaviour before this existed.
 * The alternative, persisting it, would mean a staged copy that never uploads
 * leaving a row behind forever.
 */
@Service()
export class PendingModificationTimes {
  private readonly byPath = new Map<string, Date>();

  set(path: string, modificationTime: Date): void {
    this.byPath.set(path, modificationTime);
  }

  /**
   * Returns the pending time for a path and forgets it. Taking rather than
   * reading means a later upload of a different file at the same path cannot
   * inherit a stale timestamp.
   */
  take(path: string): Date | undefined {
    const modificationTime = this.byPath.get(path);
    this.byPath.delete(path);
    return modificationTime;
  }

  /** Drops a pending time without using it, for a staged copy that is discarded. */
  forget(path: string): void {
    this.byPath.delete(path);
  }
}
