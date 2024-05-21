import _ from 'lodash';
import { RemoteFile } from '../../domain/RemoteFile';

export type Chucks = Array<Array<RemoteFile>>;

const NUMBER_OF_PARALLEL_QUEUES_FOR_SMALL_FILES = 16;

const NUMBER_OF_PARALLEL_QUEUES_FOR_MEDIUM_FILES = 6;

const NUMBER_OF_PARALLEL_QUEUES_FOR_BIG_FILES = 2;

export class GroupFilesInChunksBySize {
  static small(all: Array<RemoteFile>): Chucks {
    return GroupFilesInChunksBySize.chunk(
      all,
      NUMBER_OF_PARALLEL_QUEUES_FOR_SMALL_FILES
    );
  }

  static medium(all: Array<RemoteFile>): Chucks {
    return GroupFilesInChunksBySize.chunk(
      all,
      NUMBER_OF_PARALLEL_QUEUES_FOR_MEDIUM_FILES
    );
  }

  static big(all: Array<RemoteFile>): Chucks {
    return GroupFilesInChunksBySize.chunk(
      all,
      NUMBER_OF_PARALLEL_QUEUES_FOR_BIG_FILES
    );
  }

  private static chunk(files: Array<RemoteFile>, size: number) {
    return _.chunk(files, size);
  }
}
