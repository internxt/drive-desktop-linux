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
    const parent = FolderMother.fromPartial({ path });
    const prefix = path === '/' ? '' : path;
    const kept = FolderMother.fromPartial({
      parentUuid: parent.uuid,
      path: `${prefix}/kept`,
    });
    const descendant = FolderMother.fromPartial({
      parentUuid: kept.uuid,
      path: `${kept.path}/nested`,
    });
    const removed = FolderMother.fromPartial({
      parentUuid: parent.uuid,
      path: `${prefix}/gone`,
    });
    const removedDescendant = FolderMother.fromPartial({
      parentUuid: removed.uuid,
      path: `${removed.path}/nested`,
    });
    const sibling = FolderMother.fromPartial({
      parentUuid: parent.uuid,
      path: `${prefix}/gone-too`,
    });
    const directFile = FileMother.fromPartial({ folderUuid: parent.uuid, path: `${prefix}/keep.txt` });
    const staleFile = FileMother.fromPartial({ folderUuid: parent.uuid, path: `${prefix}/stale.txt` });
    const nestedFile = FileMother.fromPartial({
      folderUuid: descendant.uuid,
      path: `${descendant.path}/keep.txt`,
    });
    const removedFile = FileMother.fromPartial({
      folderUuid: removed.uuid,
      path: `${removed.path}/remove.txt`,
    });
    const removedNestedFile = FileMother.fromPartial({
      folderUuid: removedDescendant.uuid,
      path: `${removedDescendant.path}/remove.txt`,
    });
    const siblingFile = FileMother.fromPartial({
      folderUuid: sibling.uuid,
      path: `${sibling.path}/keep.txt`,
    });
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
      remoteFolderPaths: new Map([
        [kept.uuid, kept.path],
        [sibling.uuid, sibling.path],
      ]),
    });

    expect((await folders.all()).map((entry) => entry.uuid).sort()).toStrictEqual(
      [parent, kept, descendant, sibling].map((entry) => entry.uuid).sort(),
    );
    expect((await files.all()).map((entry) => entry.uuid).sort()).toStrictEqual(
      [directFile, nestedFile, siblingFile].map((entry) => entry.uuid).sort(),
    );
    expect(invalidateMock.mock.calls.map(([props]) => props.folderUuid).sort()).toStrictEqual(
      [removed.uuid, removedDescendant.uuid].sort(),
    );
  });

  it('should drop a renamed folder and its cached descendants', async () => {
    const parent = FolderMother.fromPartial({ path: '/documents' });
    const renamed = FolderMother.fromPartial({
      parentUuid: parent.uuid,
      path: '/documents/old',
    });
    const descendant = FolderMother.fromPartial({
      parentUuid: renamed.uuid,
      path: '/documents/old/nested',
    });
    const nestedFile = FileMother.fromPartial({
      folderUuid: descendant.uuid,
      path: '/documents/old/nested/keep.txt',
    });
    const folders = new InMemoryFolderRepository();
    const files = new InMemoryFileRepository();
    for (const entry of [parent, renamed, descendant]) await folders.add(entry);
    await files.upsert(nestedFile);

    await removeStaleChildren({
      folder: parent,
      folderRepository: folders,
      fileRepository: files,
      remoteFolderUuids: new Set([renamed.uuid]),
      remoteFileUuids: new Set(),
      remoteFolderPaths: new Map([[renamed.uuid, '/documents/new']]),
    });

    expect((await folders.all()).map((entry) => entry.uuid)).toStrictEqual([parent.uuid]);
    expect(await files.all()).toHaveLength(0);
    expect(invalidateMock.mock.calls.map(([props]) => props.folderUuid).sort()).toStrictEqual(
      [renamed.uuid, descendant.uuid].sort(),
    );
  });

  it('should keep the local virtual trash folder', async () => {
    const parent = FolderMother.fromPartial({ path: '/' });
    const trash = FolderMother.fromPartial({
      parentUuid: parent.uuid,
      path: '/.Trash',
    });
    const folders = new InMemoryFolderRepository();
    const files = new InMemoryFileRepository();
    await folders.add(parent);
    await folders.add(trash);

    await removeStaleChildren({
      folder: parent,
      folderRepository: folders,
      fileRepository: files,
      remoteFolderUuids: new Set(),
      remoteFileUuids: new Set(),
      remoteFolderPaths: new Map(),
    });

    expect((await folders.all()).map((entry) => entry.uuid).sort()).toStrictEqual([parent.uuid, trash.uuid].sort());
    expect(invalidateMock).not.toHaveBeenCalled();
  });
});
