import { Container } from 'diod';
import Logger from 'electron-log';
import { NextFunction, Request, Response } from 'express';
import { extname } from 'path';
import { StorageFileDeleter } from '../../../../context/storage/StorageFiles/application/delete/StorageFileDeleter';
import { AllFilesInFolderAreAvailableOffline } from '../../../../context/storage/StorageFiles/application/offline/AllFilesInFolderAreAvailableOffline';
import { MakeStorageFileAvaliableOffline } from '../../../../context/storage/StorageFiles/application/offline/MakeStorageFileAvaliableOffline';
import { StorageFileIsAvailableOffline } from '../../../../context/storage/StorageFiles/application/offline/StorageFileIsAvailableOffline';
import { Optional } from '../../../../shared/types/Optional';
import { MakeFolderAvaliableOffline } from '../../../../context/storage/StorageFiles/application/offline/MakeFolderAvaliableOffline';

export function buildContentsController(container: Container) {
  async function isFileLocallyAvailable(
    path: string
  ): Promise<Optional<boolean>> {
    try {
      const fileIsAvaliable = await container
        .get(StorageFileIsAvailableOffline)
        .run(path);

      return Optional.of(fileIsAvaliable);
    } catch (error) {
      Logger.debug((error as Error).message);
      // If the path is from a folder it will not find it as a file
      return Optional.empty();
    }
  }

  async function isFolderLocallyAvailable(
    path: string
  ): Promise<Optional<boolean>> {
    try {
      const folderIsAvaliable = await container
        .get(AllFilesInFolderAreAvailableOffline)
        .run(path);
      return Optional.of(folderIsAvaliable);
    } catch (error) {
      Logger.debug((error as Error).message);
      // If the path is from a file it will not find it as a folder
      return Optional.empty();
    }
  }

  function seemsToBeFromAFile(path: string): boolean {
    return extname(path) !== '';
  }

  async function isLocallyAvailable(path: string): Promise<boolean> {
    if (seemsToBeFromAFile(path)) {
      const fileIsAvaliable = await isFileLocallyAvailable(path);

      if (fileIsAvaliable.isPresent()) return fileIsAvaliable.get();

      const folderIsAvaliable = await isFolderLocallyAvailable(path);

      if (folderIsAvaliable.isPresent()) return folderIsAvaliable.get();

      return false;
    }

    const folderIsAvaliable = await isFolderLocallyAvailable(path);
    if (folderIsAvaliable.isPresent()) return folderIsAvaliable.get();

    const fileIsAvaliable = await isFileLocallyAvailable(path);
    if (fileIsAvaliable.isPresent()) return fileIsAvaliable.get();

    return false;
  }

  const download = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const decodedBuffer = Buffer.from(req.params.path, 'base64');

      const path = decodedBuffer.toString('utf-8').replaceAll('%20', ' ');

      await container.get(MakeStorageFileAvaliableOffline).run(path);
    } catch {
      try {
        const decodedBuffer = Buffer.from(req.params.path, 'base64');

        const path = decodedBuffer.toString('utf-8').replaceAll('%20', ' ');
        await container.get(MakeFolderAvaliableOffline).run(path);
      } catch (error) {
        next(error);
        return;
      }
    }

    res.status(201).send();
  };

  const remove = async (req: Request, res: Response) => {
    const decodedBuffer = Buffer.from(req.params.path, 'base64');

    const path = decodedBuffer.toString('utf-8').replaceAll('%20', ' ');

    await container.get(StorageFileDeleter).run(path);

    res.status(201).send();
  };

  const get = async (req: Request, res: Response) => {
    const decodedBuffer = Buffer.from(req.params.path, 'base64');

    const path = decodedBuffer.toString('utf-8').replaceAll('%20', ' ');

    const locallyAvaliable = await isLocallyAvailable(path);

    res.json({ locallyAvaliable });
  };

  const getFile = async (req: Request, res: Response) => {
    const decodedBuffer = Buffer.from(req.params.path, 'base64');

    const path = decodedBuffer.toString('utf-8').replaceAll('%20', ' ');

    const fileIsAvaliable = await isFileLocallyAvailable(path);

    const locallyAvaliable =
      fileIsAvaliable.isPresent() && fileIsAvaliable.get();

    res.json({ locallyAvaliable });
  };

  const getFolder = async (req: Request, res: Response) => {
    const decodedBuffer = Buffer.from(req.params.path, 'base64');

    const path = decodedBuffer.toString('utf-8').replaceAll('%20', ' ');

    const folderIsAvaliable = await isFolderLocallyAvailable(path);

    const locallyAvaliable =
      folderIsAvaliable.isPresent() && folderIsAvaliable.get();

    res.json({ locallyAvaliable });
  };

  return {
    download,
    remove,
    get,
    getFile,
    getFolder,
  };
}
