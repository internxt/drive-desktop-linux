import { DownloadProgressTracker } from '../../../../shared/domain/DownloadProgressTracker';
import { StorageFileDownloader } from '../../application/download/StorageFileDownloader/StorageFileDownloader';
import { StorageFilesRepository } from '../../domain/StorageFilesRepository';
import { File } from '../../../../../context/virtual-drive/files/domain/File';
import { StorageFile } from '../../domain/StorageFile';
import { shouldEmitProgress } from '../../../../../backend/features/virtual-drive/services/operations/should-emit-progress';

type CreateThrottledProgressReporterProps = {
  onUpdate: (bytesWritten: number) => void;
};

function createThrottledProgressReporter({ onUpdate }: CreateThrottledProgressReporterProps) {
  const state = { lastUpdateAt: 0 };

  return function report({ bytesWritten, totalBytes }: { bytesWritten: number; totalBytes: number }) {
    const emmitProgress = shouldEmitProgress({
      bytesDownloaded: bytesWritten,
      fileSize: totalBytes,
      state,
    });

    if (!emmitProgress) return;

    onUpdate(bytesWritten);
  };
}

type Props = {
  virtualFile: File;
  tracker: DownloadProgressTracker;
  downloader: StorageFileDownloader;
  repository: StorageFilesRepository;
};

export async function downloadWithProgressTracking({ virtualFile, tracker, downloader, repository }: Props) {
  const storage = StorageFile.from({
    id: virtualFile.contentsId,
    virtualId: virtualFile.uuid,
    size: virtualFile.size,
  });

  tracker.downloadStarted(virtualFile.name, virtualFile.type);
  const { stream, metadata, handler } = await downloader.run(storage, virtualFile);
  const reportProgress = createThrottledProgressReporter({
    onUpdate: (bytesWritten) => {
      const percentage = Math.min(bytesWritten / virtualFile.size, 1);
      tracker.downloadUpdate(metadata.name, metadata.type, { percentage, elapsedTime: handler.elapsedTime() });
    },
  });

  await repository.store(storage, stream, (bytesWritten) => {
    reportProgress({ bytesWritten, totalBytes: virtualFile.size });
  });

  tracker.downloadFinished(metadata.name, metadata.type);

  return storage;
}
