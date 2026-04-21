import { Brand } from '../../../shared/domain/Brand';

export type AbsolutePath = Brand<string, 'AbsolutePath'>;

export function toAbsolutePath({ path }: { path: string }): AbsolutePath {
  if (!path.startsWith('/') && !path.includes(':/')) {
    throw new Error('No es una ruta absoluta válida');
  }
  return path as AbsolutePath;
}
