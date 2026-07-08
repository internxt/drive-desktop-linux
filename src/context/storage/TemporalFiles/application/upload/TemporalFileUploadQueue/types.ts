import type { TemporalFileDeleter } from '../deletion/TemporalFileDeleter';
import type { TemporalFile } from '../../../domain/TemporalFile';
import type { TemporalFileRepository } from '../../../domain/TemporalFileRepository';
import type { TemporalFileUploader } from '../TemporalFileUploader';
import type { FirstsFileSearcher } from '../../../../../virtual-drive/files/application/search/FirstsFileSearcher';

export const TemporalFileUploadQueue = Symbol('TemporalFileUploadQueue');

export type UploadTask = {
  temporalFile: TemporalFile;
  path: string;
  processName: string;
};

export type FactoryProps = {
  repository: TemporalFileRepository;
  uploader: TemporalFileUploader;
  deleter: TemporalFileDeleter;
  fileSearcher: FirstsFileSearcher;
};

export type QueueState = {
  queuedPaths: Set<string>;
  tasks: Array<UploadTask>;
  draining: boolean;
};

export type QueueContext = FactoryProps & {
  state: QueueState;
};

export type EnqueueProps = {
  temporalFile: TemporalFile;
  path: string;
  processName: string;
};

export type TemporalFileUploadQueue = {
  enqueue: (props: EnqueueProps) => Promise<void>;
};
