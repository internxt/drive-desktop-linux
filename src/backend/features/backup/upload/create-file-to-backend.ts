import path from 'path';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { Result } from '../../../../context/shared/domain/Result';
import { File } from '../../../../context/virtual-drive/files/domain/File';
import { createFileIPC } from '../../../../infra/ipc/files-ipc';
import crypt from '../../../../context/shared/infrastructure/crypt';
import { CreateFileDto } from '../../../../infra/drive-server/out/dto';

export type CreateFileToBackendParams = {
  contentsId: string;
  filePath: string;
  size: number;
  folderId: number;
  folderUuid: string;
  bucket: string;
};

/**
 * Extracts filename without extension from a path
 * Replicates FilePath.name() behavior
 */
function extractName(filePath: string): string {
  const base = path.posix.basename(filePath);
  const { name } = path.posix.parse(base);
  return name;
}

/**
 * Extracts extension without the dot from a path
 * Replicates FilePath.extension() behavior
 */
function extractExtension(filePath: string): string {
  const base = path.posix.basename(filePath);
  const { ext } = path.posix.parse(base);
  return ext.slice(1);
}

/**
 * Creates file metadata in the backend API
 *
 * This replicates the behavior of:
 * - SimpleFileCreator.run()
 * - SDKRemoteFileSystem.persist()
 *
 * Returns a File domain object on success, matching the original behavior exactly.
 */
export async function createFileToBackend({
  contentsId,
  filePath,
  size,
  folderId,
  folderUuid,
  bucket,
}: CreateFileToBackendParams): Promise<Result<File, DriveDesktopError>> {
  const plainName = extractName(filePath);
  const extension = extractExtension(filePath);

  // Encrypt name with folderId as salt (same as SDKRemoteFileSystem.persist)
  const encryptedName = crypt.encryptName(plainName, folderId.toString());

  if (!encryptedName) {
    return {
      error: new DriveDesktopError(
        'COULD_NOT_ENCRYPT_NAME',
        `Could not encrypt the file name: ${plainName} with salt: ${folderId.toString()}`,
      ),
    };
  }

  // Build request body exactly as SDKRemoteFileSystem.persist does
  const body: CreateFileDto = {
    bucket,
    fileId: undefined as string | undefined,
    encryptVersion: EncryptionVersion.Aes03,
    folderUuid,
    size,
    plainName,
    type: extension,
  };

  // Only set fileId if size > 0 (same condition as SDKRemoteFileSystem.persist)
  if (size > 0) {
    body.fileId = contentsId;
  }

  const response = await createFileIPC(body);

  if (response.data) {
    // Create File domain object exactly as SimpleFileCreator does
    const file = File.create({
      id: response.data.id,
      uuid: response.data.uuid,
      contentsId: contentsId,
      folderId: folderId,
      createdAt: response.data.createdAt,
      modificationTime: response.data.updatedAt,
      path: filePath,
      size: size,
      updatedAt: response.data.updatedAt,
    });

    return { data: file };
  }

  // Handle errors exactly as SDKRemoteFileSystem.persist does
  if (response.error && typeof response.error === 'object' && 'cause' in response.error) {
    const errorCause = (response.error as { cause: string }).cause;

    if (errorCause === 'BAD_REQUEST') {
      return {
        error: new DriveDesktopError('BAD_REQUEST', `Some data was not valid for ${plainName}: ${body}`),
      };
    }

    if (errorCause === 'FILE_ALREADY_EXISTS') {
      return {
        error: new DriveDesktopError(
          'FILE_ALREADY_EXISTS',
          `File with name ${plainName} on ${folderId} already exists`,
        ),
      };
    }

    if (errorCause === 'SERVER_ERROR') {
      return {
        error: new DriveDesktopError(
          'BAD_RESPONSE',
          `The server could not handle the creation of ${plainName}: ${body}`,
        ),
      };
    }
  }

  return {
    error: new DriveDesktopError('UNKNOWN', `Creating file ${plainName}: ${response.error}`),
  };
}
