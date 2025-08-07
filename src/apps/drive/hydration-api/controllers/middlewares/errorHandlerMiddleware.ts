import { Request, Response, NextFunction } from 'express';
import { logger } from '@internxt/drive-desktop-core/build/backend';

export function errorHandlerMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  logger.error({ msg: 'Hydration API error:', error: err });

  res.sendStatus(500);
}
