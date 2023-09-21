import axios from 'axios';
import { Traverser } from '../../../items/application/Traverser';
import { FolderPath } from '../../domain/FolderPath';
import { HttpFolderRepository } from '../../infrastructure/HttpFolderRepository';
import { fakeDecryptor } from '../../../shared/test/domain/FakeCrypt';
import { IpcRendererSyncEngineMock } from '../../../shared/test/__mock__/IpcRendererSyncEngineMock';
import { ServerFolderMother } from '../../../items/test/persistance/ServerFolderMother';

jest.mock('axios');

const rootFolderId = 4206870830;

describe('Http Folder Repository', () => {
  let ipc: IpcRendererSyncEngineMock;
  let SUT: HttpFolderRepository;

  describe('save', () => {
    beforeEach(() => {
      const traverser = new Traverser(fakeDecryptor, rootFolderId);

      ipc = new IpcRendererSyncEngineMock();

      SUT = new HttpFolderRepository(axios, axios, traverser, ipc);
    });

    it.skip('after a folder is saved it has to have all its properties set', async () => {
      const serverFolder = ServerFolderMother.any();

      axios.post = jest
        .fn()
        .mockResolvedValueOnce({ status: 201, data: serverFolder });

      ipc.onInvokeMock.mockImplementationOnce(() => {
        //no op
      });

      await SUT.create(
        new FolderPath(`/${serverFolder.name}`),
        serverFolder.parentId as unknown as number
      );

      const savedFolder = SUT.search(`/${serverFolder.name}`);

      expect(savedFolder).toBeDefined();
      expect(savedFolder?.updatedAt).toBeDefined();
      expect(savedFolder?.createdAt).toBeDefined();
    });
  });
});