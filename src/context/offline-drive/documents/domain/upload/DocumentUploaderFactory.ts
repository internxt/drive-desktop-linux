import { Readable } from 'stream';
import { Document } from '../Document';
import { Replaces } from './Replaces';

export abstract class DocumentUploaderFactory {
  abstract read(readable: Readable): this;
  abstract document(size: Document): this;
  abstract replaces(r?: Replaces): this;
  abstract abort(controller?: AbortController): this;
  abstract build(): () => Promise<string>;
}
