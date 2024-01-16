import { FolderSyncNotifier } from '../../../../../src/context/virtual-drive/folders/domain/FolderSyncNotifier';

export class FolderSyncNotifierMock implements FolderSyncNotifier {
  public creatingMock = jest.fn();
  public createdMock = jest.fn();
  public renameMock = jest.fn();
  public renamedMock = jest.fn();
  public errorMock = jest.fn();

  creating(name: string): Promise<void> {
    return this.creatingMock(name);
  }
  created(name: string): Promise<void> {
    return this.createdMock(name);
  }
  rename(name: string, newName: string): Promise<void> {
    return this.renameMock(name, newName);
  }
  renamed(name: string, newName: string): Promise<void> {
    return this.renamedMock(name, newName);
  }
  error(): Promise<void> {
    return this.errorMock();
  }
}