import { Container } from 'diod';
import { TemporalFileByPathFinder } from '../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { TemporalFileUploader } from '../../../../context/storage/TemporalFiles/application/upload/TemporalFileUploader';
import { NotifyFuseCallback } from './FuseCallback';
import { FuseError } from './FuseErrors';
import { TemporalFileDeleter } from '../../../../context/storage/TemporalFiles/application/deletion/TemporalFileDeleter';
import { onRelease } from '../../../../backend/features/fuse/on-open/open-flags-tracker';
import { Either } from '../../../../context/shared/domain/Either';
import { handleReleaseCallback } from '../../../../backend/features/fuse/on-release/handle-release-callback';

/**
 * FUSE release callback:
 * called when the last file descriptor for an open file is closed.
 * This is the counterpart to OpenCallback. For every open() there will eventually be a release().
 *
 * If the user accesses a file on the virtual drive triggers this lifecycle:
 *   open (OpenCallback) → read/write (ReadCallback) → release (ReleaseCallback)
 *
 * to read more about this:
 * https://libfuse.github.io/doxygen/structfuse__operations.html#abac8718cdfc1ee273a44831a27393419
 *
 * @example `md5sum file.mp4`, `vlc video.mp4`, or Nautilus previewing a file
 * will all trigger a release once the program finishes reading and closes the file descriptor.
 */
export class ReleaseCallback extends NotifyFuseCallback {
  constructor(private readonly container: Container) {
    super('Release', { debug: false });
  }

  /**
   * @param path - the virtual drive path of the file being released
   * @param _fileDescriptor - a number assigned by the OS kernel when the file was opened,
   *   used to track which open file instance this release corresponds to (e.g. fd = 3).
   *   The same fd flows through open → read → release. Currently unused — we identify files by path instead.
   */
  async execute(path: string, _fileDescriptor: number): Promise<Either<FuseError, undefined>> {
    onRelease(path);

    return await handleReleaseCallback({
      path,
      findTemporalFile: (p) => this.container.get(TemporalFileByPathFinder).run(p),
      uploadTemporalFile: (p) => this.container.get(TemporalFileUploader).run(p),
      deleteTemporalFile: (p) => this.container.get(TemporalFileDeleter).run(p),
    });
  }
}
