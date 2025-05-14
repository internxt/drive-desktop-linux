import { components, operations } from '../../../schemas';

export type GetFilesQuery = operations['FileController_getFiles']['parameters']['query']

export type MoveFileParams = components['schemas']['MoveFileDto'] & {
  uuid: string;
}

export type RenameFileParams = components['schemas']['UpdateFileMetaDto'] & {
  uuid: string;
}

export type ReplaceFileParams = components['schemas']['ReplaceFileDto'] & {
  uuid: string;
}

export type CreateThumbnailBodyRequest = components['schemas']['CreateThumbnailDto'];

export type DeleteFileContentFromBucketRequest = operations['FileController_deleteFileByFileId']['parameters']['path']

export type AddFileToTrashRequest = components['schemas']['ItemToTrash']

export type TrashItemPayload =
  | { uuid: string; type: string }
  | { id: string; type: string };

export type CreateFileBodyRequest = components['schemas']['CreateFileDto']
