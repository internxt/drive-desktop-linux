import { FlatFolderZip } from '../zip.service';
import { FileInfo, Mirror, NetworkCredentials } from '../requests';

export interface MetadataRequiredForDownload {
  mirrors: Mirror[];
  fileMeta: FileInfo;
}

export type DownloadProgressCallback = (totalBytes: number, downloadedBytes: number) => void;

export interface IDownloadParams {
  networkApiUrl: string;
  bucketId: string;
  fileId: string;
  creds?: NetworkCredentials;
  mnemonic?: string;
  encryptionKey?: Buffer;
  token?: string;
  options?: {
    notifyProgress: DownloadProgressCallback;
    abortController?: AbortController;
  };
}

export type BackupFileForZip = {
  zipPath: string;
  bucketId: string;
  fileId: string;
};

export type AddBackupFileToZipProps = {
  file: BackupFileForZip;
  zip: FlatFolderZip;
  tempFolderPath: string;
  networkApiUrl: string;
  bridgeUser: string;
  bridgePass: string;
  encryptionKey: string;
  abortController?: AbortController;
  onDownloadProgress: (readBytes: number) => void;
};

export type DownloadBackupFileToTempProps = {
  file: BackupFileForZip;
  tempFolderPath: string;
  networkApiUrl: string;
  bridgeUser: string;
  bridgePass: string;
  encryptionKey: string;
  abortController?: AbortController;
  onDownloadProgress: (readBytes: number) => void;
};

export type DownloadBackupFileAttemptProps = DownloadBackupFileToTempProps & {
  state: { lastError?: unknown };
};
