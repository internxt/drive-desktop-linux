import { components, operations } from '../../../schemas';

export type GetFilesQuery = operations['FileController_getFiles']['parameters']['query']

export interface MoveFileParams {
  uuid: string;
  parentUuid: string;
}

export type RenameFileParams = components['schemas']['UpdateFileMetaDto'] & {
  uuid: string;
}
