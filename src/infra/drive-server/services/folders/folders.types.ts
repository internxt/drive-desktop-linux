import { components, operations } from '../../../schemas';

export type RenameFolderParams = components['schemas']['UpdateFolderMetaDto'] & {
  uuid: string
}

export type GetFoldersQuery = operations['FolderController_getFolders']['parameters']['query']

export type MoveFolderRequest = components['schemas']['MoveFolderDto'] & {
  uuid: string
}

export type CreateFolderBodyRequest = components['schemas']['CreateFolderDto'];
