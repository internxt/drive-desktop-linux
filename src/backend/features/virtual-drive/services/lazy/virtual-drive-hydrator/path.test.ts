import { describe, expect, it } from 'vitest';
import { isRootPath, joinVirtualPath, normalizePath } from './path';

describe('path', () => {
  it('should normalize paths', () => {
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('folder')).toBe('/folder');
    expect(normalizePath('/folder//sub')).toBe('/folder/sub');
  });

  it('should detect root paths', () => {
    expect(isRootPath('/')).toBe(true);
    expect(isRootPath('')).toBe(true);
    expect(isRootPath('/folder')).toBe(false);
  });

  it('should join virtual paths', () => {
    expect(joinVirtualPath('/folder', 'file.txt')).toBe('/folder/file.txt');
    expect(joinVirtualPath('/folder/', 'file.txt')).toBe('/folder/file.txt');
  });
});
