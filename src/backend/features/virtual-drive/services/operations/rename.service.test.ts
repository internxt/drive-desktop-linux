import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import { left, right } from '../../../../../context/shared/domain/Either';
import { rename } from './rename.service';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { RenameMoveOrTrashFile } from '../../../../../apps/drive/fuse/callbacks/RenameMoveOrTrashFile';
import { RenameMoveOrTrashFolder } from '../../../../../apps/drive/fuse/callbacks/RenameMoveOrTrashFolder';
import { UploadOnRename } from '../../../../../apps/drive/fuse/callbacks/UploadOnRename';
import { partialSpyOn } from '../../../../../../tests/vitest/utils.helper';

vi.mock('@internxt/drive-desktop-core/build/backend');

describe('rename', () => {
  const fileExecuteMock = partialSpyOn(RenameMoveOrTrashFile.prototype, 'execute');
  const folderExecuteMock = partialSpyOn(RenameMoveOrTrashFolder.prototype, 'execute');
  const uploadRunMock = partialSpyOn(UploadOnRename.prototype, 'run');
  let container: ReturnType<typeof mockDeep<Container>>;

  beforeEach(() => {
    container = mockDeep<Container>();
    fileExecuteMock.mockResolvedValue(right('success'));
    folderExecuteMock.mockResolvedValue(right('no-op'));
    uploadRunMock.mockResolvedValue(right('no-op'));
  });

  it('should return success when file rename succeeds', async () => {
    const result = await rename({ src: '/old/file.txt', dest: '/new/file.txt', container });

    expect(result.error).toBeUndefined();
    expect(result.data).toBeUndefined();
    expect(fileExecuteMock).toHaveBeenCalledWith('/old/file.txt', '/new/file.txt');
  });

  it('should return success when folder rename succeeds after file no-op', async () => {
    fileExecuteMock.mockResolvedValue(right('no-op'));
    folderExecuteMock.mockResolvedValue(right('success'));

    const result = await rename({ src: '/old/folder', dest: '/new/folder', container });

    expect(result.error).toBeUndefined();
    expect(result.data).toBeUndefined();
    expect(folderExecuteMock).toHaveBeenCalledWith('/old/folder', '/new/folder');
  });

  it('should return success when upload on rename succeeds after no-op file and folder', async () => {
    fileExecuteMock.mockResolvedValue(right('no-op'));
    folderExecuteMock.mockResolvedValue(right('no-op'));
    uploadRunMock.mockResolvedValue(right('success'));

    const result = await rename({ src: '/offline/file.txt', dest: '/existing/file.txt', container });

    expect(result.error).toBeUndefined();
    expect(result.data).toBeUndefined();
    expect(uploadRunMock).toHaveBeenCalledWith('/offline/file.txt', '/existing/file.txt');
  });

  it('should return error when file rename fails', async () => {
    fileExecuteMock.mockResolvedValue(left(new FuseError(FuseCodes.EIO, 'file rename failed')));

    const result = await rename({ src: '/old/file.txt', dest: '/new/file.txt', container });

    expect(result.data).toBeUndefined();
    expect(result.error?.code).toBe(FuseCodes.EIO);
  });

  it('should return ENOENT when file, folder and upload are no-op', async () => {
    fileExecuteMock.mockResolvedValue(right('no-op'));
    folderExecuteMock.mockResolvedValue(right('no-op'));
    uploadRunMock.mockResolvedValue(right('no-op'));

    const result = await rename({ src: '/missing/path', dest: '/new/path', container });

    expect(result.data).toBeUndefined();
    expect(result.error?.code).toBe(FuseCodes.ENOENT);
  });
});
