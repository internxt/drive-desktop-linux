export abstract class RemoteFileRepository {
  abstract create(
    id: string,
    name: string,
    type: string,
    size: number,
    folderId: number
  ): Promise<void>;

  abstract update(old: string, current: string, size: number): Promise<void>;

  abstract delete(id: string): Promise<void>;

  abstract getFolderId(path: string): Promise<number>;
}
