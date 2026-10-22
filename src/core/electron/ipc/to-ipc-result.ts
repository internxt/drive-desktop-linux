import { Result } from '@internxt/drive-desktop-core/build/common/result';

/**
 * Converts errors to plain objects so Electron IPC preserves their enumerable custom fields,
 * along with the name and message.
 * Successful results pass through.
 * This is a shallow conversionnested so values must also support IPC serialization.
 */
export function toIpcResult<T, E extends Error>(result: Result<T, E>): Result<T, E> {
  return Result.mapError(result, (error) => ({ ...error, name: error.name, message: error.message }));
}
