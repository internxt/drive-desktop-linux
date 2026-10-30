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
      expect(isVirtualTrashFolder({ path: '/.Trash' })).toBe(true);
      expect(isVirtualTrashFolder({ path: '/.Trash-1000' })).toBe(true);
      expect(isVirtualTrashFolder({ path: '/.Trash-1000/info' })).toBe(true);
    });

    it('should return false for normal folders', () => {
      expect(isVirtualTrashFolder({ path: '/' })).toBe(false);
      expect(isVirtualTrashFolder({ path: '/Documents' })).toBe(false);
      expect(isVirtualTrashFolder({ path: '/Photos' })).toBe(false);
    });
  });
});
