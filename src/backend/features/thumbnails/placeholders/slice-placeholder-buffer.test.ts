import { slicePlaceholderBuffer } from './slice-placeholder-buffer';

describe('slice-placeholder-buffer', () => {
  const sampleBuffer = Buffer.from([10, 20, 30, 40, 50]);

  it('should return slice within bounds', () => {
    const chunk = slicePlaceholderBuffer({ buffer: sampleBuffer, offset: 1, length: 3 });
    expect(chunk).toEqual(Buffer.from([20, 30, 40]));
  });

  it('should return remaining bytes if requested length exceeds buffer length', () => {
    const chunk = slicePlaceholderBuffer({ buffer: sampleBuffer, offset: 3, length: 10 });
    expect(chunk).toEqual(Buffer.from([40, 50]));
  });

  it('should return empty buffer if offset is beyond buffer length', () => {
    const chunk = slicePlaceholderBuffer({ buffer: sampleBuffer, offset: 10, length: 5 });
    expect(chunk.length).toBe(0);
  });
});
