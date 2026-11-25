import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import { FuseCodes } from '../../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { ContentsId } from '../../../../../../apps/main/database/entities/DriveFile';
import {
  TemporalFile,
  TemporalFileAttributes,
} from '../../../../../../context/storage/TemporalFiles/domain/TemporalFile';
import { TemporalFileByPathFinder } from '../../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { DeleteTemporalFileIfUnchanged } from '../../../../../../context/storage/TemporalFiles/application/deletion/DeleteTemporalFileIfUnchanged';
import * as moveTemporalFileModule from '../../../../../../context/storage/TemporalFiles/application/move/move-temporal-file';
import { TemporalFileUploader } from '../../../../../../context/storage/TemporalFiles/application/upload/TemporalFileUploader';
import { TemporalFileRepository } from '../../../../../../context/storage/TemporalFiles/domain/TemporalFileRepository';
import { uploadLibreOfficeStagingFileOnRename } from './upload-libreoffice-staging-file-on-rename';
import { call, calls, partialSpyOn } from '../../../../../../../tests/vitest/utils.helper';

const temporalAttrs: TemporalFileAttributes = {
  createdAt: new Date(),
  modifiedAt: new Date(),
  path: '/save_test.odt',
  size: 100,
};

describe('upload-libreoffice-staging-file-on-rename', () => {
  const moveTemporalFileMock = partialSpyOn(moveTemporalFileModule, 'moveTemporalFile');
  let container: ReturnType<typeof mockDeep<Container>>;
  let repository: ReturnType<typeof mockDeep<TemporalFileRepository>>;
  let finder: ReturnType<typeof mockDeep<TemporalFileByPathFinder>>;
  let uploader: ReturnType<typeof mockDeep<TemporalFileUploader>>;
  let reaper: ReturnType<typeof mockDeep<DeleteTemporalFileIfUnchanged>>;

  const props: Parameters<typeof uploadLibreOfficeStagingFileOnRename>[0] = {
    src: '/lu371445na4g.tmp',
    dest: '/save_test.odt',
    container: undefined as unknown as Container,
  };

  beforeEach(() => {
    repository = mockDeep<TemporalFileRepository>();
    finder = mockDeep<TemporalFileByPathFinder>();
    uploader = mockDeep<TemporalFileUploader>();
    reaper = mockDeep<DeleteTemporalFileIfUnchanged>();
    container = mockDeep<Container>();
    container.get.calledWith(TemporalFileRepository).mockReturnValue(repository);
    container.get.calledWith(TemporalFileByPathFinder).mockReturnValue(finder);
    container.get.calledWith(TemporalFileUploader).mockReturnValue(uploader);
    container.get.calledWith(DeleteTemporalFileIfUnchanged).mockReturnValue(reaper);
    props.container = container;
    moveTemporalFileMock.mockResolvedValue(undefined);
    uploader.run.mockResolvedValue({ contentsId: 'contents-id' as ContentsId, uploadedRevision: 7 });
  });

  it('should upload the staged copy and reap it under the revision the upload read', async () => {
    // Given
    const document = TemporalFile.from({ ...temporalAttrs, revision: 1 });
    finder.run.mockResolvedValue(document);

    // When
    const result = await uploadLibreOfficeStagingFileOnRename(props);

    // Then
    expect(result.error).toBeUndefined();
    expect(result.data).toBeUndefined();
    call(moveTemporalFileMock).toStrictEqual({ repository, from: props.src, to: props.dest });
    call(uploader.run).toStrictEqual(document);
    // 7 is the revision the uploader read, not the 1 this function found earlier.
    call(reaper.run).toStrictEqual([props.dest, 7]);
  });

  it('should pass an unknown uploaded revision through so the staged copy is kept', async () => {
    // Given
    finder.run.mockResolvedValue(TemporalFile.from(temporalAttrs));
    uploader.run.mockResolvedValue({ contentsId: 'contents-id' as ContentsId, uploadedRevision: undefined });

    // When
    const result = await uploadLibreOfficeStagingFileOnRename(props);

    // Then
    expect(result.error).toBeUndefined();
    call(reaper.run).toStrictEqual([props.dest, undefined]);
  });

  it('should return EIO and skip the upload when the staging file cannot be moved', async () => {
    // Given
    moveTemporalFileMock.mockRejectedValue(new Error('missing'));

    // When
    const result = await uploadLibreOfficeStagingFileOnRename(props);

    // Then
    expect(result.data).toBeUndefined();
    expect(result.error?.code).toBe(FuseCodes.EIO);
    calls(uploader.run).toHaveLength(0);
    calls(reaper.run).toHaveLength(0);
  });

  it('should return EIO when the staging file is gone after the move', async () => {
    // Given
    finder.run.mockResolvedValue(undefined);

    // When
    const result = await uploadLibreOfficeStagingFileOnRename(props);

    // Then
    expect(result.data).toBeUndefined();
    expect(result.error?.code).toBe(FuseCodes.EIO);
    calls(uploader.run).toHaveLength(0);
    calls(reaper.run).toHaveLength(0);
  });

  it('should restore the staging path and return EIO when the upload fails', async () => {
    // Given
    finder.run.mockResolvedValue(TemporalFile.from(temporalAttrs));
    uploader.run.mockRejectedValue(new Error('network'));

    // When
    const result = await uploadLibreOfficeStagingFileOnRename(props);

    // Then
    expect(result.data).toBeUndefined();
    expect(result.error?.code).toBe(FuseCodes.EIO);
    calls(moveTemporalFileMock).toStrictEqual([
      { repository, from: props.src, to: props.dest },
      { repository, from: props.dest, to: props.src },
    ]);
    calls(reaper.run).toHaveLength(0);
  });
});
