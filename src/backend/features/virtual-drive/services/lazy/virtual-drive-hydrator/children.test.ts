import { describe, expect, it, vi } from 'vitest';
import type { FileDto, FolderDto } from '../../../../../../infra/drive-server/out/dto';
import type { FileRepository } from '../../../../../../context/virtual-drive/files/domain/FileRepository';
import type { Folder } from '../../../../../../context/virtual-drive/folders/domain/Folder';
import type { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';
import {
  createLocalFiles,
  createLocalFolders,
  getExistingFiles,
  getExistingFolders,
  readLocalDirectory,
  toRemoteFiles,
  toRemoteFolders,
} from './children';

vi.mock('../../../../../../context/virtual-drive/folders/application/create/FolderCreatorFromServerFolder', () => ({
  createFolderFromServerFolder: vi.fn((folder, virtualPath) => ({ folder, virtualPath })),
}));

vi.mock('../../../../../../context/virtual-drive/remoteTree/application/FileCreatorFromServerFile', () => ({
  createFileFromServerFile: vi.fn((file, virtualPath) => ({ file, virtualPath })),
}));

describe('children', () => {
  it('should filter existing remote children', () => {
    const existingFolder = { status: 'EXISTS', deleted: false, removed: false } as unknown as FolderDto;
    const removedFolder = { status: 'EXISTS', deleted: true, removed: false } as unknown as FolderDto;
    const existingFile = { status: 'EXISTS' } as unknown as FileDto;
    const trashedFile = { status: 'TRASHED' } as unknown as FileDto;
    const deletedFile = { status: 'DELETED' } as unknown as FileDto;

    expect(getExistingFolders([existingFolder, removedFolder])).toStrictEqual([existingFolder]);
    expect(getExistingFiles([existingFile, trashedFile, deletedFile])).toStrictEqual([existingFile]);
  });

  it('should map remote children', () => {
    const folder = {
      status: 'EXISTS',
      deleted: false,
      removed: false,
      bucket: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      id: 1,
      name: 'docs',
      parentId: 0,
      updatedAt: '2025-01-01T00:00:00.000Z',
      plainName: 'docs',
      uuid: 'folder-uuid',
      type: 'folder',
      userId: 1,
    } as unknown as FolderDto;

    const file = {
      status: 'EXISTS',
      bucket: 'bucket',
      createdAt: '2025-01-01T00:00:00.000Z',
      encryptVersion: '1',
      fileId: 'file-id',
      folderId: 1,
      folderUuid: 'folder-uuid',
      id: 2,
      modificationTime: '2025-01-01T00:00:00.000Z',
      name: 'file.txt',
      size: 10,
      type: 'txt',
      updatedAt: '2025-01-01T00:00:00.000Z',
      userId: 1,
      plainName: 'file',
      uuid: 'file-uuid',
    } as unknown as FileDto;

    expect(toRemoteFolders([folder])).toStrictEqual([
      {
        type: 'folder',
        id: 1,
        parentId: 0,
        bucket: null,
        userId: 1,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        uuid: 'folder-uuid',
        plainName: 'docs',
        name: 'docs',
        status: 'EXISTS',
      },
    ]);

    expect(toRemoteFiles([file])).toStrictEqual([
      {
        id: 2,
        uuid: 'file-uuid',
        fileId: 'file-id',
        type: 'txt',
        size: 10,
        bucket: 'bucket',
        folderId: 1,
        folderUuid: 'folder-uuid',
        userId: 1,
        modificationTime: '2025-01-01T00:00:00.000Z',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        plainName: 'file',
        name: 'file.txt',
        status: 'EXISTS',
      },
    ]);
  });

  it('should build local children', () => {
    const folder = {
      status: 'EXISTS',
      deleted: false,
      removed: false,
      bucket: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      id: 1,
      name: 'docs',
      parentId: 0,
      updatedAt: '2025-01-01T00:00:00.000Z',
      plainName: 'docs',
      uuid: 'folder-uuid',
      type: 'folder',
      userId: 1,
    } as unknown as FolderDto;

    const file = {
      status: 'EXISTS',
      bucket: 'bucket',
      createdAt: '2025-01-01T00:00:00.000Z',
      encryptVersion: '1',
      fileId: 'file-id',
      folderId: 1,
      folderUuid: 'folder-uuid',
      id: 2,
      modificationTime: '2025-01-01T00:00:00.000Z',
      name: 'file.txt',
      size: 10,
      type: 'txt',
      updatedAt: '2025-01-01T00:00:00.000Z',
      userId: 1,
      plainName: 'file',
      uuid: 'file-uuid',
    } as unknown as FileDto;

    expect(createLocalFolders({ folderPath: '/root', children: [folder] })).toStrictEqual([
      {
        folder: {
          bucket: null,
          createdAt: '2025-01-01T00:00:00.000Z',
          id: 1,
          name: 'docs',
          parentId: 0,
          updatedAt: '2025-01-01T00:00:00.000Z',
          plain_name: 'docs',
          status: 'EXISTS',
          uuid: 'folder-uuid',
        },
        virtualPath: '/root/docs',
      },
    ]);

    expect(createLocalFiles({ folderPath: '/root', files: [file] })).toStrictEqual([
      {
        file: {
          bucket: 'bucket',
          createdAt: '2025-01-01T00:00:00.000Z',
          encrypt_version: '1',
          fileId: 'file-id',
          folderId: 1,
          id: 2,
          modificationTime: '2025-01-01T00:00:00.000Z',
          name: 'file.txt',
          size: 10,
          type: 'txt',
          updatedAt: '2025-01-01T00:00:00.000Z',
          userId: 1,
          status: 'EXISTS',
          plainName: 'file',
          uuid: 'file-uuid',
        },
        virtualPath: '/root/file.txt',
      },
    ]);
  });

  it('should read local directory entries', () => {
    const folder = { id: 10 } as unknown as Folder;
    const folderRepository = {
      matchingPartial: vi.fn().mockReturnValue([{ name: 'subfolder' }]),
    } as unknown as FolderRepository;
    const fileRepository = {
      matchingPartial: vi.fn().mockReturnValue([{ nameWithExtension: 'file.txt' }]),
    } as unknown as FileRepository;

    expect(readLocalDirectory({ folder, folderRepository, fileRepository })).toStrictEqual({
      folders: ['subfolder'],
      files: ['file.txt'],
    });
  });
});
