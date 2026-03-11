import { Service } from 'diod';
import { Readable } from 'stream';
import { File } from '../../../../virtual-drive/files/domain/File';
import { Thumbnail } from '../../domain/Thumbnail';
import { ThumbnailCollection } from '../../domain/ThumbnailCollection';
import { ThumbnailsRepository } from '../../domain/ThumbnailsRepository';
import { EnvironmentThumbnailDownloader } from './EnvironmentThumbnailDownloader';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import Bottleneck from 'bottleneck';
import { driveServerClient } from '../../../../../infra/drive-server/client/drive-server.client.instance';

type FileMetaDataResponse = {
  thumbnails: [
    {
      id: number;
      fileId: number;
      type: string;
      size: number;
      bucket_id?: string;
      bucket_file?: string;
      bucketId: string;
      bucketFile: string;
      encryptVersion: string;
      createdAt: string;
      updatedAt: string;
      maxWidth: number;
      maxHeight: number;
    },
  ];
};

const limiter = new Bottleneck({
  maxConcurrent: 4,
  minTime: 100,
});

@Service()
export class RemoteThumbnailsRepository implements ThumbnailsRepository {
  constructor(private readonly downloader: EnvironmentThumbnailDownloader) {}

  private async obtainThumbnails(file: File): Promise<Array<Thumbnail>> {
    try {
      const { data, error } = await driveServerClient.GET('/folders/{id}/file', {
        path: { id: file.folderId },
        query: { name: file.name, type: file.type },
      });

      if (error) {
        return [];
      }

      const responseData = data as unknown as FileMetaDataResponse | undefined;

      if (!responseData?.thumbnails?.length) {
        return [];
      }

      return responseData.thumbnails.map((raw) =>
        Thumbnail.from({
          id: raw.id,
          contentsId: raw.bucketFile,
          type: raw.type,
          bucket: raw.bucketId,
          updatedAt: new Date(raw.updatedAt),
        }),
      );
    } catch (err) {
      logger.error({ msg: 'Error while trying to obtain thumbnails:', error: err });
      return [];
    }
  }

  async has(file: File): Promise<boolean> {
    const thumbnails = await limiter.schedule(() => this.obtainThumbnails(file));

    return thumbnails.length > 0;
  }

  async retrieve(file: File): Promise<ThumbnailCollection | undefined> {
    const thumbnails = await limiter.schedule(() => this.obtainThumbnails(file));

    if (thumbnails.length === 0) {
      return undefined;
    }

    return new ThumbnailCollection(file, thumbnails);
  }

  pull(thumbnail: Thumbnail): Promise<Readable> {
    if (!thumbnail.contentsId) {
      throw new Error('Thumbnail does not have content id');
    }

    return this.downloader.download(thumbnail.contentsId);
  }

  push(_file: File, _stream: Readable): Promise<void> {
    throw new Error('Method not implemented.');
  }

  default(_file: File): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
