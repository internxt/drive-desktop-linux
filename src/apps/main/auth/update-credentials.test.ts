import { safeStorage } from 'electron';
import { updateCredentials } from './update-credentials';
import ConfigStore from '../config';
import { partialSpyOn } from 'tests/vitest/utils.helper';
import { User } from '../types';

describe('updateCredentials', () => {
  const configGetMock = partialSpyOn(ConfigStore, 'get');
  const configSetMock = partialSpyOn(ConfigStore, 'set');
  const safeStorageIsAvailableMock = partialSpyOn(safeStorage, 'isEncryptionAvailable');
  const safeStorageEncryptMock = partialSpyOn(safeStorage, 'encryptString');

  const plainToken = 'plain-token-123';
  const plainMnemonic = 'plain mnemonic words here';
  const existingMnemonic = 'existing mnemonic from config';
  const encryptedTokenBuffer = Buffer.from('encrypted-token-data');
  const encryptedMnemonicBuffer = Buffer.from('encrypted-mnemonic-data');

  const fakeUser: User = {
    uuid: 'user-uuid',
    email: 'test@test.com',
    userId: 'user-id',
    name: 'Test',
    lastname: 'User',
    username: 'testuser',
    bridgeUser: 'bridge-user',
    bucket: 'bucket',
    backupsBucket: 'backups-bucket',
    root_folder_id: 1,
    rootFolderId: 'root-folder-id',
    mnemonic: 'user-mnemonic',
    createdAt: '2025-01-01',
    privateKey: '',
    publicKey: '',
    revocateKey: '',
    credit: 0,
    registerCompleted: true,
    sharedWorkspace: false,
    hasReferralsProgram: false,
    teams: false,
  };

  beforeEach(() => {
    safeStorageEncryptMock.mockReset();
  });

  describe('when safeStorage is available', () => {
    beforeEach(() => {
      safeStorageIsAvailableMock.mockReturnValue(true);
    });

    it('should encrypt and store token with encryption flag', async () => {
      safeStorageEncryptMock.mockReturnValueOnce(encryptedTokenBuffer).mockReturnValueOnce(encryptedMnemonicBuffer);
      configGetMock.mockReturnValue(existingMnemonic);

      await updateCredentials({ newToken: plainToken });

      expect(safeStorageEncryptMock).toBeCalledWith(plainToken);
      expect(configSetMock).toBeCalledWith('newToken', encryptedTokenBuffer.toString('latin1'));
      expect(configSetMock).toBeCalledWith('newTokenEncrypted', true);
    });

    it('should encrypt both token and mnemonic when mnemonic is provided', async () => {
      safeStorageEncryptMock.mockReturnValueOnce(encryptedTokenBuffer).mockReturnValueOnce(encryptedMnemonicBuffer);

      await updateCredentials({ newToken: plainToken, mnemonic: plainMnemonic });

      expect(safeStorageEncryptMock).toHaveBeenNthCalledWith(1, plainToken);
      expect(safeStorageEncryptMock).toHaveBeenNthCalledWith(2, plainMnemonic);
      expect(configSetMock).toBeCalledWith('newToken', encryptedTokenBuffer.toString('latin1'));
      expect(configSetMock).toBeCalledWith('mnemonic', encryptedMnemonicBuffer.toString('latin1'));
      expect(configSetMock).toBeCalledWith('newTokenEncrypted', true);
      expect(configSetMock).toBeCalledWith('mnemonicEncrypted', true);
    });

    it('should use existing mnemonic from ConfigStore when not provided', async () => {
      safeStorageEncryptMock.mockReturnValueOnce(encryptedTokenBuffer);
      configGetMock.mockReturnValue(existingMnemonic);

      await updateCredentials({ newToken: plainToken });

      expect(configGetMock).toBeCalledWith('mnemonic');
      expect(safeStorageEncryptMock).toHaveBeenCalledTimes(1);
      expect(safeStorageEncryptMock).toBeCalledWith(plainToken);
      expect(configSetMock).toBeCalledWith('mnemonic', existingMnemonic);
      expect(configSetMock).toBeCalledWith('mnemonicEncrypted', true);
    });

    it('should store userData when provided', async () => {
      safeStorageEncryptMock.mockReturnValueOnce(encryptedTokenBuffer).mockReturnValueOnce(encryptedMnemonicBuffer);
      configGetMock.mockReturnValue(existingMnemonic);

      await updateCredentials({ newToken: plainToken, userData: fakeUser });

      expect(configSetMock).toBeCalledWith('userData', fakeUser);
    });

    it('should not store userData when not provided', async () => {
      safeStorageEncryptMock.mockReturnValueOnce(encryptedTokenBuffer).mockReturnValueOnce(encryptedMnemonicBuffer);
      configGetMock.mockReturnValue(existingMnemonic);

      await updateCredentials({ newToken: plainToken });

      expect(configSetMock).not.toBeCalledWith('userData', expect.anything());
    });
  });

  describe('when safeStorage is not available', () => {
    beforeEach(() => {
      safeStorageIsAvailableMock.mockReturnValue(false);
    });

    it('should store plaintext token with encryption flag set to false', async () => {
      configGetMock.mockReturnValue(existingMnemonic);

      await updateCredentials({ newToken: plainToken });

      expect(safeStorageEncryptMock).not.toHaveBeenCalled();
      expect(configSetMock).toBeCalledWith('newToken', plainToken);
      expect(configSetMock).toBeCalledWith('newTokenEncrypted', false);
    });

    it('should store plaintext mnemonic when provided', async () => {
      await updateCredentials({ newToken: plainToken, mnemonic: plainMnemonic });

      expect(configSetMock).toBeCalledWith('mnemonic', plainMnemonic);
      expect(configSetMock).toBeCalledWith('mnemonicEncrypted', false);
    });

    it('should use existing mnemonic from ConfigStore when not provided', async () => {
      configGetMock.mockReturnValue(existingMnemonic);

      await updateCredentials({ newToken: plainToken });

      expect(configGetMock).toBeCalledWith('mnemonic');
      expect(configSetMock).toBeCalledWith('mnemonic', existingMnemonic);
      expect(configSetMock).toBeCalledWith('mnemonicEncrypted', false);
    });

    it('should store userData when provided', async () => {
      configGetMock.mockReturnValue(existingMnemonic);

      await updateCredentials({ newToken: plainToken, userData: fakeUser });

      expect(configSetMock).toBeCalledWith('userData', fakeUser);
    });
  });

  describe('complete flow with all parameters', () => {
    it('should handle all parameters with encryption enabled', async () => {
      safeStorageIsAvailableMock.mockReturnValue(true);
      safeStorageEncryptMock.mockReturnValueOnce(encryptedTokenBuffer).mockReturnValueOnce(encryptedMnemonicBuffer);

      await updateCredentials({
        newToken: plainToken,
        mnemonic: plainMnemonic,
        userData: fakeUser,
      });

      expect(configSetMock).toBeCalledWith('newToken', encryptedTokenBuffer.toString('latin1'));
      expect(configSetMock).toBeCalledWith('newTokenEncrypted', true);
      expect(configSetMock).toBeCalledWith('mnemonic', encryptedMnemonicBuffer.toString('latin1'));
      expect(configSetMock).toBeCalledWith('mnemonicEncrypted', true);
      expect(configSetMock).toBeCalledWith('userData', fakeUser);
    });

    it('should handle all parameters without encryption', async () => {
      safeStorageIsAvailableMock.mockReturnValue(false);

      await updateCredentials({
        newToken: plainToken,
        mnemonic: plainMnemonic,
        userData: fakeUser,
      });

      expect(configSetMock).toBeCalledWith('newToken', plainToken);
      expect(configSetMock).toBeCalledWith('newTokenEncrypted', false);
      expect(configSetMock).toBeCalledWith('mnemonic', plainMnemonic);
      expect(configSetMock).toBeCalledWith('mnemonicEncrypted', false);
      expect(configSetMock).toBeCalledWith('userData', fakeUser);
    });
  });

  describe('latin1 encoding', () => {
    it('should use latin1 encoding for encrypted strings', async () => {
      safeStorageIsAvailableMock.mockReturnValue(true);
      const testTokenBuffer = Buffer.from('test-encrypted-token-data');
      safeStorageEncryptMock.mockReturnValueOnce(testTokenBuffer);
      configGetMock.mockReturnValue(existingMnemonic);

      await updateCredentials({ newToken: plainToken });

      expect(configSetMock).toBeCalledWith('newToken', testTokenBuffer.toString('latin1'));
      expect(configSetMock).toBeCalledWith('mnemonic', existingMnemonic);
    });
  });

  describe('edge cases', () => {
    it('should handle empty token string', async () => {
      safeStorageIsAvailableMock.mockReturnValue(false);
      configGetMock.mockReturnValue(existingMnemonic);

      await updateCredentials({ newToken: '' });

      expect(configSetMock).toBeCalledWith('newToken', '');
    });

    it('should handle empty mnemonic string', async () => {
      safeStorageIsAvailableMock.mockReturnValue(false);
      configGetMock.mockReturnValue(existingMnemonic);

      await updateCredentials({ newToken: plainToken, mnemonic: '' });

      expect(configSetMock).toBeCalledWith('mnemonic', existingMnemonic);
    });

    it('should handle undefined userData gracefully', async () => {
      safeStorageIsAvailableMock.mockReturnValue(false);
      configGetMock.mockReturnValue(existingMnemonic);

      await updateCredentials({ newToken: plainToken, userData: undefined });

      expect(configSetMock).not.toBeCalledWith('userData', expect.anything());
    });
  });
});
