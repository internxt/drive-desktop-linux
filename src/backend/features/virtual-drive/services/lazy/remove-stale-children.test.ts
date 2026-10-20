import { FileMother } from '../../../../../context/virtual-drive/files/domain/__test-helpers__/FileMother';
import { InMemoryFileRepository } from '../../../../../context/virtual-drive/files/infrastructure/InMemoryFileRepository';
import { FolderMother } from '../../../../../context/virtual-drive/folders/domain/__test-helpers__/FolderMother';
import { InMemoryFolderRepository } from '../../../../../context/virtual-drive/folders/infrastructure/InMemoryFolderRepository';
import { removeStaleChildren } from './remove-stale-children';

const { invalidateMock } = vi.hoisted(() => ({
  invalidateMock: vi.fn(),
}));

vi.mock('./directory-state-sqlite-repository', () => ({
  DirectoryStateRepository: {
    invalidate: invalidateMock,
  },
}));

describe('remove-stale-children', () => {
  beforeEach(() => {
    invalidateMock.mockResolvedValue(undefined);
  });

  it.each(['/', '/documents'])('should remove only stale children of %s', async (path) => {
    const parent = FolderMother.fromPartial({ id: 1, path, parentId: null });
    const prefix = path === '/' ? '' : path;
    const kept = FolderMother.fromPartial({ id: 2, parentId: parent.id, path: `${prefix}/kept` });
    const descendant = FolderMother.fromPartial({ id: 3, parentId: kept.id, path: `${kept.path}/nested` });
    const removed = FolderMother.fromPartial({ id: 4, parentId: parent.id, path: `${prefix}/gone` });
    const removedDescendant = FolderMother.fromPartial({ id: 5, parentId: removed.id, path: `${removed.path}/nested` });
    const sibling = FolderMother.fromPartial({ id: 6, parentId: parent.id, path: `${prefix}/gone-too` });
    const directFile = FileMother.fromPartial({ folderId: parent.id, path: `${prefix}/keep.txt` });
    const staleFile = FileMother.fromPartial({ folderId: parent.id, path: `${prefix}/stale.txt` });
    const nestedFile = FileMother.fromPartial({ folderId: descendant.id, path: `${descendant.path}/keep.txt` });
    const removedFile = FileMother.fromPartial({ folderId: removed.id, path: `${removed.path}/remove.txt` });
    const removedNestedFile = FileMother.fromPartial({
      folderId: removedDescendant.id,
      path: `${removedDescendant.path}/remove.txt`,
    });
    const siblingFile = FileMother.fromPartial({ folderId: sibling.id, path: `${sibling.path}/keep.txt` });
    const folders = new InMemoryFolderRepository();
    const files = new InMemoryFileRepository();
    for (const entry of [parent, kept, descendant, removed, removedDescendant, sibling]) await folders.add(entry);
    for (const entry of [directFile, staleFile, nestedFile, removedFile, removedNestedFile, siblingFile]) {
      await files.upsert(entry);
    }

    await removeStaleChildren({
      folder: parent,
      folderRepository: folders,
      fileRepository: files,
      remoteFolderUuids: new Set([kept.uuid, sibling.uuid]),
      remoteFileUuids: new Set([directFile.uuid]),
    });

    expect((await folders.all()).map((entry) => entry.id).sort()).toStrictEqual([1, 2, 3, 6]);
    expect((await files.all()).map((entry) => entry.uuid).sort()).toStrictEqual(
      [directFile, nestedFile, siblingFile].map((entry) => entry.uuid).sort(),
    );
    expect(invalidateMock.mock.calls.map(([props]) => props.folderId).sort()).toStrictEqual([4, 5]);
  });
});
