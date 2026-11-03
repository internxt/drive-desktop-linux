import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import type { Request, Response, NextFunction } from 'express';

import { createFuseTelemetryMiddleware } from './fuse-telemetry.middleware';

describe('fuse-telemetry.middleware', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('should measure duration and record operation on response finish', () => {
    process.env.NODE_ENV = 'development';
    const recordMock = vi.fn();
    const middleware = createFuseTelemetryMiddleware({ onRecord: recordMock });

    const reqEmitter = new EventEmitter();
    const req = Object.assign(reqEmitter, {
      path: '/read',
      header: (name: string) => {
        if (name === 'X-Process-Name') return 'evince';
        return undefined;
      },
      body: { path: '/book.pdf', length: 4096 },
    }) as unknown as Request;

    const resEmitter = new EventEmitter();
    const res = Object.assign(resEmitter, {
      getHeader: (name: string) => (name === 'X-Errno' ? '0' : undefined),
    }) as unknown as Response;

    const next = vi.fn() as NextFunction;

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    resEmitter.emit('finish');

    expect(recordMock).toHaveBeenCalledTimes(1);
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'read',
        errno: '0',
        path: '/book.pdf',
        bytes: 4096,
        processName: 'evince',
        durationMs: expect.any(Number),
      }),
    );
  });

  it('should decode X-Path-B64 header for binary write operations', () => {
    process.env.NODE_ENV = 'development';
    const recordMock = vi.fn();
    const middleware = createFuseTelemetryMiddleware({ onRecord: recordMock });

    const reqEmitter = new EventEmitter();
    const pathBase64 = Buffer.from('/test/file.txt').toString('base64');
    const req = Object.assign(reqEmitter, {
      path: '/write',
      header: (name: string) => {
        if (name === 'X-Path-B64') return pathBase64;
        return undefined;
      },
      body: Buffer.from('hello world'),
    }) as unknown as Request;

    const resEmitter = new EventEmitter();
    const res = Object.assign(resEmitter, {
      getHeader: () => '0',
    }) as unknown as Response;

    const next = vi.fn() as NextFunction;

    middleware(req, res, next);
    resEmitter.emit('finish');

    expect(recordMock).toHaveBeenCalledTimes(1);
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'write',
        path: '/test/file.txt',
        bytes: 11,
      }),
    );
  });

  it('should bypass recording when telemetry is disabled', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_QA_TELEMETRY;
    const recordMock = vi.fn();
    const middleware = createFuseTelemetryMiddleware({ onRecord: recordMock });

    const resEmitter = new EventEmitter();
    const req = { path: '/getattr' } as unknown as Request;
    const res = resEmitter as unknown as Response;
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    resEmitter.emit('finish');
    expect(recordMock).not.toHaveBeenCalled();
  });
});
