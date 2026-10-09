import type { Request, Response, NextFunction } from 'express';
import { recordFuseTelemetry } from './record-telemetry';
import { isTelemetryEnabled } from './telemetry-config';

type CreateFuseTelemetryMiddlewareProps = {
  onRecord?: typeof recordFuseTelemetry;
};

function extractFilePath({ req }: { req: Request }) {
  const headerPathB64 = req.header('X-Path-B64');
  if (typeof headerPathB64 === 'string') {
    try {
      return Buffer.from(headerPathB64, 'base64').toString('utf8');
    } catch {
      // Fallback to body path if decoding fails
    }
  }

  if (typeof req.body === 'object' && req.body !== null && typeof req.body.path === 'string') {
    return req.body.path;
  }

  return undefined;
}

function extractPayloadBytes({ req }: { req: Request }) {
  if (Buffer.isBuffer(req.body)) {
    return req.body.length;
  }

  if (typeof req.body === 'object' && req.body !== null && typeof req.body.length === 'number') {
    return req.body.length;
  }

  return undefined;
}

function extractProcessName({ req }: { req: Request }) {
  if (typeof req.body === 'object' && req.body !== null && typeof req.body.processName === 'string') {
    return req.body.processName;
  }

  const headerProcessName = req.header('X-Process-Name');
  if (typeof headerProcessName === 'string') {
    return headerProcessName;
  }

  return undefined;
}

export function createFuseTelemetryMiddleware(props?: CreateFuseTelemetryMiddlewareProps) {
  const onRecord = props?.onRecord ?? recordFuseTelemetry;

  return function fuseTelemetryMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!isTelemetryEnabled()) {
      next();
      return;
    }

    const startTime = performance.now();

    res.on('finish', () => {
      const durationMs = performance.now() - startTime;
      const errnoHeader = res.getHeader('X-Errno');
      const errno = errnoHeader !== undefined ? String(errnoHeader) : '0';

      onRecord({
        operation: req.path.replace(/^\//, ''),
        durationMs,
        errno,
        processName: extractProcessName({ req }),
        path: extractFilePath({ req }),
        bytes: extractPayloadBytes({ req }),
      });
    });

    next();
  };
}

export const fuseTelemetryMiddleware = createFuseTelemetryMiddleware();
