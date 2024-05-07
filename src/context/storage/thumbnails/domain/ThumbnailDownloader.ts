import { Readable } from 'stream';
import { ThumbnailAttributes } from './Thumbnail';

export type ThumbnailDownloadEvents = {
  start: () => void;
  progress: (progress: number) => void;
  finish: (contentsId: ThumbnailAttributes['contentsId']) => void;
  error: (error: Error) => void;
};

export interface ThumbnailDownloader {
  downloadThumbnail(thumbnailContentsId: string): Promise<Readable>;

  on(
    event: keyof ThumbnailDownloadEvents,
    handler: ThumbnailDownloadEvents[keyof ThumbnailDownloadEvents]
  ): void;

  elapsedTime(): number;
}
