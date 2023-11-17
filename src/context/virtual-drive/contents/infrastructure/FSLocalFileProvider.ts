import Logger from 'electron-log';
import { createReadStream, promises as fs, watch } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { LocalFileContents } from '../domain/LocalFileContents';
import { LocalContentsProvider } from '../domain/LocalFileProvider';

function extractNameAndExtension(nameWithExtension: string): [string, string] {
  if (nameWithExtension.startsWith('.')) {
    return [nameWithExtension, ''];
  }

  const [name, extension] = nameWithExtension.split('.');

  return [name, extension];
}

export class FSLocalFileProvider implements LocalContentsProvider {
  private static readonly TIMEOUT_BUSY_CHECK = 10_000;
  private reading = new Map<string, AbortController>();

  private async untilIsNotBusy(filePath: string): Promise<void> {
    const readable = createReadStream(filePath);

    return new Promise((resolve, reject) => {
      readable.on('error', async (err: NodeJS.ErrnoException) => {
        if (err.code === 'EBUSY') {
          Logger.debug(
            `File is busy, will wait ${FSLocalFileProvider.TIMEOUT_BUSY_CHECK} ms and try it again`
          );

          await new Promise((next) => {
            setTimeout(next, FSLocalFileProvider.TIMEOUT_BUSY_CHECK);
          });

          readable.read();
        }
      });

      readable.on('data', () => {
        Logger.debug('data!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        readable.close();
        resolve();
      });

      readable.read();
    });
  }

  private async createAbortableStream(filePath: string): Promise<{
    readable: Readable;
    controller: AbortController;
  }> {
    const isBeingRead = this.reading.get(filePath);

    if (isBeingRead) {
      isBeingRead.abort();
    }

    await this.untilIsNotBusy(filePath);

    const readStream = createReadStream(filePath);

    const controller = new AbortController();

    this.reading.set(filePath, controller);

    return { readable: readStream, controller };
  }

  async provide(absoluteFilePath: string) {
    const { readable, controller } = await this.createAbortableStream(
      absoluteFilePath
    );

    const { size, mtimeMs, birthtimeMs } = await fs.stat(absoluteFilePath);

    const absoluteFolderPath = path.dirname(absoluteFilePath);
    const nameWithExtension = path.basename(absoluteFilePath);

    const watcher = watch(absoluteFolderPath, (_, filename) => {
      if (filename !== nameWithExtension) {
        return;
      }
      Logger.warn(
        filename,
        ' has been changed during read, it will be aborted'
      );

      controller.abort();
    });

    readable.on('end', () => {
      watcher.close();
      this.reading.delete(absoluteFilePath);
    });

    readable.on('close', () => {
      this.reading.delete(absoluteFilePath);
    });

    const [name, extension] = extractNameAndExtension(nameWithExtension);

    const contents = LocalFileContents.from({
      name,
      extension,
      size,
      modifiedTime: mtimeMs,
      birthTime: birthtimeMs,
      contents: readable,
    });

    return {
      contents,
      abortSignal: controller.signal,
    };
  }
}
