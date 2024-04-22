import { Readable } from 'stream';
import { DocumentSize } from '../DocumentSize';

type ContentsId = string;

export type OfflineContentsUploadEvents = {
  start: () => void;
  progress: (progress: number) => void;
  finish: (fileId: ContentsId) => void;
  error: (error: Error) => void;
};

export type OfflineContentUploader = () => Promise<string>;

export abstract class Uploader {
  abstract uploader(
    readable: Readable,
    size: DocumentSize,
    desiredPathElements: {
      name: string;
      extension: string;
    },
    abortSignal?: AbortSignal
  ): OfflineContentUploader;
}
