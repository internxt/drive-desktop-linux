import { Service } from 'diod';
import { ThumbnailsRepository } from '../domain/ThumbnailsRepository';
import { Readable } from 'stream';
import { File } from '../../../virtual-drive/files/domain/File';
import { Thumbnail } from '../domain/Thumbnail';
import { ThumbnailCollection } from '../domain/ThumbnailCollection';
import { Axios } from 'axios';

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
    }
  ];
};

@Service()
export class RemoteThumbnailsRepository implements ThumbnailsRepository {
  constructor(private readonly axios: Axios) {}

  async retrieve(file: File): Promise<ThumbnailCollection | undefined> {
    const response = await this.axios.get(
      `${process.env.NEW_DRIVE_URL}/drive/files/${file.uuid}`
    );

    if (response.status !== 200) {
      return undefined;
    }

    const data = response.data as FileMetaDataResponse;

    const thumbnails = data.thumbnails.map((raw) =>
      Thumbnail.from({
        id: raw.id,
        contentsId: raw.bucketFile,
        type: raw.type,
        bucket: raw.bucketId,
        updatedAt: new Date(raw.updatedAt),
      })
    );

    return new ThumbnailCollection(file.uuid, thumbnails);
  }

  pull(thumbnail: Thumbnail): Promise<Readable> {
    throw new Error('Method not implemented.');
  }

  push(thumbnail: Thumbnail, stream: Readable): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
