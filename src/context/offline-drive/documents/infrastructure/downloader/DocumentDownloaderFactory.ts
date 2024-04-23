import { Environment } from '@internxt/inxt-js';
import { Service } from 'diod';
import Logger from 'electron-log';
import { Readable } from 'stream';
import { UploadProgressTracker } from '../../../../shared/domain/UploadProgressTracker';
import { EnvironmentDocumentUploader } from '../upload/EnvironmentDocumentUploader';
import { DocumentUploaderFactory } from '../../domain/upload/DocumentUploaderFactory';
import { Replaces } from '../../domain/upload/Replaces';
import { Document } from '../../domain/Document';

@Service()
export class DocumentDownloaderFactory implements DocumentUploaderFactory {
  private _readable: Readable | undefined = undefined;
  private _document: Document | undefined = undefined;
  private _replaces: Replaces | undefined = undefined;
  private _abortController: AbortController | undefined = undefined;

  private static MULTIPART_UPLOAD_SIZE_THRESHOLD = 5 * 1024 * 1024 * 1024;

  constructor(
    private readonly environment: Environment,
    private readonly bucket: string,
    private readonly progressTracker: UploadProgressTracker
  ) {}

  private registerEvents(uploader: EnvironmentDocumentUploader) {
    if (!this._document) {
      return;
    }

    const name = this._replaces
      ? this._replaces.name
      : this._document.path.name();
    const extension = this._replaces
      ? this._replaces.extension
      : this._document.path.extension();

    const size = this._document.size.value;

    uploader.on('start', () => {
      this.progressTracker.uploadStarted(name, extension, size);
    });

    uploader.on('progress', (progress: number) => {
      this.progressTracker.uploadProgress(name, extension, size, {
        elapsedTime: uploader.elapsedTime(),
        percentage: progress,
      });
    });

    uploader.on('error', (error: Error) => {
      // TODO: use error to determine the cause
      Logger.debug('UPLOADER ERROR', error);
      this.progressTracker.uploadError(name, extension, 'UNKNOWN');
    });

    uploader.on('finish', () => {
      this.progressTracker.uploadCompleted(name, extension, size, {
        elapsedTime: uploader.elapsedTime(),
      });
    });
  }

  read(readable: Readable) {
    this._readable = readable;

    return this;
  }

  document(document: Document) {
    this._document = document;

    return this;
  }

  replaces(r?: Replaces) {
    this._replaces = r;

    return this;
  }

  abort(controller?: AbortController) {
    this._abortController = controller;

    return this;
  }

  build() {
    const document = this._document;
    const readable = this._readable;

    if (!document) {
      throw new Error('Size is needed to upload a file');
    }

    if (!readable) {
      throw new Error('Readable is needed to upload a file');
    }

    const fn =
      document.size.value >
      DocumentDownloaderFactory.MULTIPART_UPLOAD_SIZE_THRESHOLD
        ? this.environment.uploadMultipartFile
        : this.environment.upload;

    const uploader = new EnvironmentDocumentUploader(
      fn,
      this.bucket,
      this._abortController?.signal
    );

    this.registerEvents(uploader);

    return () => uploader.upload(readable, document.size.value);
  }
}
