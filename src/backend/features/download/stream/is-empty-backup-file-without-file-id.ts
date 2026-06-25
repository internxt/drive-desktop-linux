type Props = { size: number | string; fileId: string | null };

export function isEmptyBackupFileWithoutFileId({ size, fileId }: Props) {
  const fileSize = typeof size === 'string' ? Number(size) : size;

  return fileSize === 0 && !fileId;
}
