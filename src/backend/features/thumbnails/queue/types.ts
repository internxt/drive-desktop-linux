import type { Container } from 'diod';

export type ThumbnailFolderTask = Readonly<{
  folderPath: string;
  fileNames: readonly string[];
  container: Container;
  enqueuedAt: number;
}>;

export type ThumbnailQueueState = Readonly<{
  items: readonly ThumbnailFolderTask[];
  processing: ReadonlySet<string>;
  completed: ReadonlySet<string>;
}>;
