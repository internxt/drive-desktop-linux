import type { FileDto } from '../../../../../../infra/drive-server/out/dto';

export function buildFileName(file: FileDto) {
  return file.type ? `${file.plainName}.${file.type}` : file.plainName;
}
