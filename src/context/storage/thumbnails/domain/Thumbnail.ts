import { AggregateRoot } from '../../../shared/domain/AggregateRoot';
import { ThumbnailContentId } from './ThumbnailContentId';

export type ThumbnailAttributes = {
  id: number;
  contentsId: string;
  type: string;
  bucket: string;
  updatedAt: Date;
};

export class Thumbnail extends AggregateRoot {
  private constructor(
    private _id: number,
    private _contentsId: ThumbnailContentId,
    private _type: string,
    private _bucket: string,
    private _updatedAt: Date
  ) {
    super();
  }

  public get id(): number {
    return this._id;
  }

  public get contentsId(): string {
    return this._contentsId.value;
  }

  public get type(): string {
    return this._type;
  }

  public get bucket(): string {
    return this._bucket;
  }
  public get updatedAt(): Date {
    return this._updatedAt;
  }

  static from(attributes: ThumbnailAttributes): Thumbnail {
    return new Thumbnail(
      attributes.id,
      new ThumbnailContentId(attributes.contentsId),
      attributes.type,
      attributes.bucket,
      attributes.updatedAt
    );
  }

  attributes(): ThumbnailAttributes {
    return {
      id: this.id,
      contentsId: this.contentsId,
      type: this.type,
      bucket: this.bucket,
      updatedAt: this.updatedAt,
    };
  }

  isNewer(other: Thumbnail): boolean {
    return this.updatedAt > other.updatedAt;
  }
}
