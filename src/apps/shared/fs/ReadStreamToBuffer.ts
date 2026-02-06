import { Readable, Writable, pipeline } from 'stream';
import { promisify } from 'util';
const promisifiedPipeline = promisify(pipeline);

export class ReadStreamToBuffer {
  static async read(stream: Readable, options?: { onProgress?: (bytesWritten: number) => void }): Promise<Buffer> {
    const bufferArray: any[] = [];
    let bytesWritten = 0;

    const bufferWriter = new Writable({
      write: (chunk, _, callback) => {
        bufferArray.push(chunk);
        bytesWritten += chunk.length;
        if (options?.onProgress) {
          options.onProgress(bytesWritten);
        }
        callback();
      },
    });

    await promisifiedPipeline(stream, bufferWriter);

    return Buffer.concat(bufferArray);
  }
}
