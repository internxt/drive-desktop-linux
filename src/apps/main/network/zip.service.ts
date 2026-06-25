import { Readable, Writable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';
import { ZipArchive } from 'archiver';
import { logger } from '@internxt/drive-desktop-core/build/backend';

type FlatFolderZipOpts = {
  abortController?: AbortController;
  progress?: (loadedBytes: number) => void;
};

function createZipArchiver() {
  return new ZipArchive({
    zlib: { level: 0 },
    forceZip64: true,
  });
}

function toNodeReadable(stream: ReadableStream<Uint8Array>) {
  return Readable.fromWeb(stream);
}

export class FlatFolderZip {
  private readonly archive = createZipArchiver();
  private readonly pendingFiles = new Set<Promise<void>>();
  private readonly destination: Writable;
  private readonly finished: Promise<void>;
  private abortController?: AbortController;
  private processedSize = 0;
  private readonly progress: FlatFolderZipOpts['progress'];

  constructor(destination: globalThis.WritableStream<Uint8Array>, opts: FlatFolderZipOpts) {
    this.abortController = opts.abortController;
    this.progress = opts.progress;
    this.destination = Writable.fromWeb(destination);

    this.archive.on('error', (error: Error) => {
      logger.error({ msg: 'Error while creating ZIP archive', error });
      this.destination.destroy(error);
    });

    this.finished = new Promise<void>((resolve, reject) => {
      this.destination.on('finish', resolve);
      this.destination.on('error', reject);
      this.archive.on('error', reject);
    });

    this.archive.pipe(this.destination);
  }

  private trackProgress(chunkLength: number) {
    this.processedSize += chunkLength;
    this.progress?.(this.processedSize);
  }

  private createProgressTrackingStream(source: ReadableStream<Uint8Array>) {
    const reader = source.getReader();

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        const status = await reader.read();

        if (status.done) {
          controller.close();
          return;
        }

        controller.enqueue(status.value);
      },
      cancel() {
        return reader.cancel();
      },
    });
  }

  addFile(name: string, source: ReadableStream<Uint8Array>): Promise<void> {
    if (this.abortController?.signal.aborted) return Promise.resolve();

    const progressStream = this.createProgressTrackingStream(source);
    const nodeStream = toNodeReadable(progressStream);

    const pending = new Promise<void>((resolve, reject) => {
      nodeStream.on('data', (chunk: Buffer | Uint8Array) => {
        this.trackProgress(chunk.length);
      });

      nodeStream.on('error', reject);
      nodeStream.on('end', resolve);

      this.archive.append(nodeStream, { name, store: true });
    }).finally(() => {
      this.pendingFiles.delete(pending);
    });

    this.pendingFiles.add(pending);

    return pending;
  }

  addFolder(name: string): void {
    if (this.abortController?.signal.aborted) return;

    this.archive.append('', { name: name + '/', store: true });
  }

  async close(): Promise<void> {
    if (this.abortController?.signal.aborted) return;

    await Promise.all(this.pendingFiles);

    await this.archive.finalize();

    await this.finished;
  }

  abort(): void {
    this.abortController?.abort();
  }
}
