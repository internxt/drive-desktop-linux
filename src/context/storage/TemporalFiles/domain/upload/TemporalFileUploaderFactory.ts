import { Readable } from 'stream';
import { TemporalFile } from '../TemporalFile';
import { Replaces } from './Replaces';

export abstract class TemporalFileUploaderFactory {
  abstract read(readable: Readable): this;
  abstract document(document: TemporalFile): this;
  abstract replaces(r?: Replaces): this;
  abstract abort(controller?: AbortController): this;
  /**
   * @param contentLength bytes the upload will send, taken from the same source
   * the readable is opened on. Required, because a length and a body that come
   * from two different observations of a file are what this parameter exists to
   * prevent.
   */
  abstract build(contentLength: number): () => Promise<string>;
}
