type Props = {
  totalSizeBytes: number;
  updateProgress?: (ratio: number) => void;
};

/**
 * Tracks ZIP compressor output vs in-flight per-file download bytes for backup zip progress [0, 1].
 */
export function createBackupZipProgressEmitter({ totalSizeBytes, updateProgress }: Props) {
  const inFlightDownloadedBytesByFileId = new Map<string, number>();
  let zippedBytesFromCompressor = 0;

  function emit() {
    const inFlightDownloadedBytes = Array.from(inFlightDownloadedBytesByFileId.values()).reduce(
      (total, current) => total + current,
      0,
    );
    const usedBytes = Math.max(zippedBytesFromCompressor, inFlightDownloadedBytes);

    if (totalSizeBytes <= 0) {
      updateProgress?.(0);
      return;
    }

    updateProgress?.(Math.min(usedBytes / totalSizeBytes, 1));
  }

  return {
    onZipCompressorProgress(loadedBytes: number) {
      zippedBytesFromCompressor = loadedBytes;
      emit();
    },
    setFileDownloadProgress(fileId: string, readBytes: number) {
      inFlightDownloadedBytesByFileId.set(fileId, readBytes);
      emit();
    },
    clearFileDownloadProgress(fileId: string) {
      inFlightDownloadedBytesByFileId.delete(fileId);
      emit();
    },
    emit,
  };
}
