const mapFileSizeToChunkSize: Record<'small' | 'medium' | 'big', number> = {
  small: 16,
  medium: 6,
  big: 2,
};

export function calculateNumberOfBatches(
  type: 'small' | 'medium' | 'big',
  numberOfFiles: number
) {
  const size = mapFileSizeToChunkSize[type];

  return Math.ceil(numberOfFiles / size);
}
