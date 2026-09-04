import { Readable } from 'stream';

/**
 * One upload's bounded view of a temporal file: an open descriptor, plus the
 * length that descriptor reported when it was taken.
 *
 * `size` is fixed at creation and `open()` never yields more than that many
 * bytes, so the length declared to the server bounds every attempt's body,
 * including a retry that runs long after the application has written more.
 * Each call to `open()` reads from the beginning rather than continuing where
 * the last one stopped, and destroying a stream `open()` returned does not
 * disturb the descriptor or any later attempt.
 *
 * It is NOT a point-in-time image of the contents, and the guarantee is about
 * LENGTH, not bytes. Nothing is copied, so a write landing within the first
 * `size` bytes before an attempt reads them is sent, and two attempts of the
 * same upload can therefore send DIFFERENT bytes from each other. Each attempt
 * is internally consistent - whatever integrity value the upload computes, it
 * computes from the bytes that attempt actually sends - but nothing may cache
 * such a value across attempts.
 *
 * If the file is truncated below `size`, `open()` yields fewer bytes than
 * declared: the bound is an upper one only. What is guaranteed is that no
 * attempt sends MORE than it declared, which is the condition the server
 * rejects.
 */
export interface TemporalFileUploadSnapshot {
  readonly size: number;

  open(): Readable;

  dispose(): Promise<void>;
}
