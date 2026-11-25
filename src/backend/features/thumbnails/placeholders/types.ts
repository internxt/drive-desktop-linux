export type MediaCategory = 'image' | 'video' | 'audio' | 'document' | 'unknown';

export type RequiresThumbnailProps = {
  readonly fileName: string;
  readonly extension?: string;
};

export type SlicePlaceholderProps = {
  readonly buffer: Buffer;
  readonly offset: number;
  readonly length: number;
};

export type ShouldServePlaceholderProps = {
  readonly processName: string;
  readonly isCachedLocally: boolean;
  readonly needsThumbnail: boolean;
};
