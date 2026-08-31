import { Readable } from 'stream';

/**
 * A private copy of a temporal file's contents, held for the duration of one
 * upload.
 *
 * It is stable once created: `size` describes the bytes `open()` produces, and
 * every retry reopens the same ones, because the application is never told this
 * path and so never writes to it.
 *
 * It is NOT a coherent point-in-time image of a file that is being written
 * during the copy. `fs.copyFile` gives no atomicity guarantee, so a source that
 * changes mid-copy can be captured torn. What is guaranteed is that the length
 * declared to the server describes the bytes actually sent.
 */
export interface TemporalFileUploadSnapshot {
  readonly size: number;

  open(): Readable;

  dispose(): Promise<void>;
}
