import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import { findFolderFiles } from './find-folder-files';
import { SingleFolderMatchingFinder } from '../../../../context/virtual-drive/folders/application/SingleFolderMatchingFinder';
import { FilesByPartialSearcher } from '../../../../context/virtual-drive/files/application/search/FilesByPartialSearcher';
import { FileStatuses } from '../../../../context/virtual-drive/files/domain/FileStatus';
import { type File } from '../../../../context/virtual-drive/files/domain/File';

describe('find-folder-files', () => {
  const folderFinder = mockDeep<SingleFolderMatchingFinder>();
  const fileSearcher = mockDeep<FilesByPartialSearcher>();
  let container: ReturnType<typeof mockDeep<Container>>;

  beforeEach(() => {
    container = mockDeep<Container>();
    container.get.calledWith(SingleFolderMatchingFinder).mockReturnValue(folderFinder);
    container.get.calledWith(FilesByPartialSearcher).mockReturnValue(fileSearcher);
  });

  it('should return the existing files of the matching folder', async () => {
    const files = [{ contentsId: 'contents-id' }] as File[];
    folderFinder.run.mockResolvedValue({ id: 7 } as Awaited<ReturnType<SingleFolderMatchingFinder['run']>>);
    fileSearcher.run.mockResolvedValue(files);

    const result = await findFolderFiles({ path: '/Screenshots', container });

    expect(result).toStrictEqual(files);
    expect(folderFinder.run).toHaveBeenCalledWith({ path: '/Screenshots' });
    expect(fileSearcher.run).toHaveBeenCalledWith({
      folderId: 7,
      status: FileStatuses.EXISTS,
    });
  });

  it('should propagate the error when the folder cannot be found', async () => {
    folderFinder.run.mockRejectedValue(new Error('folder not found'));

    await expect(findFolderFiles({ path: '/missing', container })).rejects.toThrow('folder not found');
  });
});
