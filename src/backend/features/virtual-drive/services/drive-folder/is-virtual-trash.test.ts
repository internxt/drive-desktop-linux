import { TRASH_FOLDER_ID, TRASH_UID_FOLDER_ID } from './constants';
import { isVirtualTrashFolder, isVirtualTrashPath } from './is-virtual-trash';

describe('is-virtual-trash', () => {
  describe('isVirtualTrashPath', () => {
    it('should return true for paths starting with /.Trash', () => {
      expect(isVirtualTrashPath('/.Trash')).toBe(true);
      expect(isVirtualTrashPath('/.Trash-1000')).toBe(true);
      expect(isVirtualTrashPath('/.Trash-1000/info')).toBe(true);
    });

    it('should return false for paths outside the virtual trash folders', () => {
      expect(isVirtualTrashPath('/')).toBe(false);
      expect(isVirtualTrashPath('/Trash')).toBe(false);
      expect(isVirtualTrashPath('/Documents/.Trash')).toBe(false);
      expect(isVirtualTrashPath('/.Trashcan')).toBe(false);
      expect(isVirtualTrashPath('/.Trash-1000-old')).toBe(false);
    });
  });

  describe('isVirtualTrashFolder', () => {
    it('should return true for /.Trash and /.Trash-* paths', () => {
      expect(isVirtualTrashFolder({ path: '/.Trash', id: 1 })).toBe(true);
      expect(isVirtualTrashFolder({ path: '/.Trash-1000', id: 2 })).toBe(true);
      expect(isVirtualTrashFolder({ path: '/.Trash-1000/info', id: 3 })).toBe(true);
    });

    it('should return true for TRASH_FOLDER_ID and TRASH_UID_FOLDER_ID', () => {
      expect(isVirtualTrashFolder({ path: '/some-path', id: TRASH_FOLDER_ID })).toBe(true);
      expect(isVirtualTrashFolder({ path: '/some-path', id: TRASH_UID_FOLDER_ID })).toBe(true);
    });

    it('should return false for normal folders', () => {
      expect(isVirtualTrashFolder({ path: '/', id: 100 })).toBe(false);
      expect(isVirtualTrashFolder({ path: '/Documents', id: 101 })).toBe(false);
      expect(isVirtualTrashFolder({ path: '/Photos', id: 102 })).toBe(false);
    });
  });
});
