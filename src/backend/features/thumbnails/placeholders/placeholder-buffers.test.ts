import { getPlaceholderBufferByCategory } from './placeholder-buffers';

describe('placeholder-buffers', () => {
  it('should return valid PNG buffer for image category', () => {
    const buffer = getPlaceholderBufferByCategory({ category: 'image' });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    // PNG signature: 0x89 0x50 0x4E 0x47
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);
  });

  it('should return valid buffer for all defined categories', () => {
    const categories = ['image', 'video', 'document', 'audio', 'unknown'] as const;
    for (const category of categories) {
      const buffer = getPlaceholderBufferByCategory({ category });
      expect(buffer.length).toBeGreaterThan(0);
    }
  });
});
