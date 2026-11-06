import * as downloadBackupFileModule from './download-backup-file';
import * as streamModule from './stream';
import { partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { addRemoteBackupFileToZip } from './add-remote-backup-file-to-zip';

describe('add-remote-backup-file-to-zip', () => {
  const addBackupFileToZipMock = partialSpyOn(downloadBackupFileModule, 'addBackupFileToZip');
  const isEmptyMock = partialSpyOn(streamModule, 'isEmptyBackupFileWithoutFileId');
  const createEmptyStreamMock = partialSpyOn(streamModule, 'createEmptyReadableStream');

  const zip = {
    addFile: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    createEmptyStreamMock.mockReturnValue(new ReadableStream() as never);
  });

  it('adds empty stream when file is empty placeholder', async () => {
    isEmptyMock.mockReturnValue(true);

    await addRemoteBackupFileToZip({
      file: {
        plainName: 'x.txt',
        type: '',
        bucket: 'b',
        fileId: null,
        size: '0',
        uuid: 'fu',
        folderId: 1,
      } as never,
      folderZipPath: 'Root',
      zip: zip as never,
      tempFolderPath: '/tmp',
      networkApiUrl: 'u',
      bridgeUser: 'bu',
      bridgePass: 'bp',
      encryptionKey: 'k',
      onFileDownloadProgress: vi.fn(),
      onAfterFileAttempt: vi.fn(),
    });

    expect(addBackupFileToZipMock).not.toHaveBeenCalled();
    expect(zip.addFile).toHaveBeenCalledWith('Root/x.txt', expect.any(ReadableStream));
  });

  it('calls addBackupFileToZip when file has content id', async () => {
    isEmptyMock.mockReturnValue(false);
    addBackupFileToZipMock.mockResolvedValue({ data: undefined });

    await addRemoteBackupFileToZip({
      file: {
        plainName: 'y.bin',
        type: '',
        bucket: 'b',
        fileId: 'content-id',
        size: '10',
        uuid: 'fu',
        folderId: 1,
      } as never,
      folderZipPath: 'Root',
      zip: {} as never,
      tempFolderPath: '/tmp',
      networkApiUrl: 'u',
      bridgeUser: 'bu',
      bridgePass: 'bp',
      encryptionKey: 'k',
      onFileDownloadProgress: vi.fn(),
      onAfterFileAttempt: vi.fn(),
    });

    expect(addBackupFileToZipMock).toHaveBeenCalledTimes(1);
  });
});
