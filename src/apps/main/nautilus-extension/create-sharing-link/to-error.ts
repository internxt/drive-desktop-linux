import { DriveServerError } from '../../../../infra/drive-server/drive-server.error';

type Props = {
  context: string;
  error: DriveServerError;
};

export function toError({ context, error }: Props) {
  const message = error.message ? `${context}: ${error.message}` : `${context}: ${error.cause}`;
  return new Error(message);
}
