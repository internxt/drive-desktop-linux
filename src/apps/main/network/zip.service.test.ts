import { unzipSync } from 'fflate';
import { ReadableStream, WritableStream } from 'node:stream/web';
import { FlatFolderZip } from './zip.service';

describe('zip.service', () => {
  it('should create a valid zip when adding an empty file', async () => {
    const chunks: Buffer[] = [];

    const destination = new WritableStream<Uint8Array>({
      write(chunk) {
        chunks.push(Buffer.from(chunk));
      },
    });

    const zip = new FlatFolderZip(destination, {});

    zip.addFolder('Ubuntu');
    zip.addFile(
      'Ubuntu/empty.txt',
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close();
        },
      }),
    );

    await zip.close();

    const zipBuffer = Buffer.concat(chunks);
    const extracted = unzipSync(zipBuffer);

    expect(Object.keys(extracted)).toStrictEqual(['Ubuntu/', 'Ubuntu/empty.txt']);
    expect(Buffer.from(extracted['Ubuntu/empty.txt'])).toHaveLength(0);
  });

  it('should stop the archive and destroy the destination', async () => {
    let abortReason: unknown;
    const destination = new WritableStream<Uint8Array>({
      write() {
        return undefined;
      },
      abort(reason) {
        abortReason = reason;
      },
    });

    const zip = new FlatFolderZip(destination, {});
    zip.addFolder('Ubuntu');
    zip.destroy();

    await vi.waitFor(() => {
      expect(abortReason).toBeInstanceOf(Error);
    });
  });
});
