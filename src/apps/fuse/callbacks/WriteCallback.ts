import { Container } from 'diod';
import { BufferToDocumentWriter } from '../../../context/offline-drive/documents/application/write/BufferToDocumentWriter';

export class WriteCallback {
  constructor(private readonly container: Container) {}

  async execute(
    path: string,
    _fd: string,
    buffer: Buffer,
    len: number,
    pos: number,
    cb: (a: number) => void
  ) {
    await this.container
      .get(BufferToDocumentWriter)
      .run(path, buffer, len, pos);

    return cb(len);
  }
}
