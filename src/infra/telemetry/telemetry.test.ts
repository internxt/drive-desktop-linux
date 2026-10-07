import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { EventEmitter } from 'node:events';
import type { Request, Response, NextFunction } from 'express';
import { isTelemetryEnabled, getTelemetryFilePath, QA_TELEMETRY_FILENAME } from './telemetry-config';
import { writeTelemetryEntry } from './telemetry-writer';
import { recordHttpTelemetry, recordFuseTelemetry } from './record-telemetry';
import {
  attachHttpTelemetryInterceptor,
  createHttpTelemetryInterceptors,
  setupHttpTelemetry,
} from './http-telemetry.interceptor';
import http from 'node:http';
import { createFuseTelemetryMiddleware } from './fuse-telemetry.middleware';

describe('telemetry', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('configuration', () => {
    it('should be enabled when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ENABLE_QA_TELEMETRY;

      expect(isTelemetryEnabled()).toBe(true);
    });

    it('should be enabled when ENABLE_QA_TELEMETRY is true even in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_QA_TELEMETRY = 'true';

      expect(isTelemetryEnabled()).toBe(true);
    });

    it('should be disabled when NODE_ENV is production and ENABLE_QA_TELEMETRY is not set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_QA_TELEMETRY;

      expect(isTelemetryEnabled()).toBe(false);
    });

    it('should build destination path ending with qa-telemetry.json in the logs directory', () => {
      const logsPath = '/test/logs/directory';
      const resolved = getTelemetryFilePath({ logsPath });

      expect(resolved).toBe(`/test/logs/directory/${QA_TELEMETRY_FILENAME}`);
    });
  });

  describe('writer', () => {
    it('should append entry to file when telemetry is enabled', () => {
      process.env.NODE_ENV = 'development';
      const mockAppend = vi.fn((_path, _data, cb) => cb(null));

      writeTelemetryEntry({
        entry: {
          category: 'HTTP',
          timestamp: '2026-10-07T12:00:00.000Z',
          method: 'GET',
          url: '/api/files',
          durationMs: 120.5,
          status: 200,
        },
        logsPath: '/tmp/logs',
        appendFn: mockAppend,
      });

      expect(mockAppend).toHaveBeenCalledTimes(1);
      const callArgs = mockAppend.mock.calls[0];
      expect(callArgs[0]).toBe(`/tmp/logs/${QA_TELEMETRY_FILENAME}`);
      expect(callArgs[1]).toContain('"category":"HTTP"');
      expect(callArgs[1]).toContain('"durationMs":120.5');
    });

    it('should not append entry when telemetry is disabled', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_QA_TELEMETRY;
      const mockAppend = vi.fn();

      writeTelemetryEntry({
        entry: {
          category: 'HTTP',
          timestamp: '2026-10-07T12:00:00.000Z',
          method: 'GET',
          url: '/api/files',
          durationMs: 120.5,
          status: 200,
        },
        logsPath: '/tmp/logs',
        appendFn: mockAppend,
      });

      expect(mockAppend).not.toHaveBeenCalled();
    });
  });

  describe('record-telemetry', () => {
    it('should record HTTP telemetry with category and timestamp', () => {
      process.env.NODE_ENV = 'development';
      const mockAppend = vi.fn((_path, _data, cb) => cb(null));

      recordHttpTelemetry({
        method: 'POST',
        url: '/api/folders',
        durationMs: 250,
        status: 201,
        logsPath: '/tmp/logs',
        appendFn: mockAppend,
      });

      expect(mockAppend).toHaveBeenCalledTimes(1);
      const serialized = String(mockAppend.mock.calls[0][1]);
      const parsed = JSON.parse(serialized);

      expect(parsed).toMatchObject({
        category: 'HTTP',
        method: 'POST',
        url: '/api/folders',
        durationMs: 250,
        status: 201,
      });
      expect(parsed.timestamp).toBeDefined();
    });

    it('should record FUSE telemetry with operation and errno', () => {
      process.env.NODE_ENV = 'development';
      const mockAppend = vi.fn((_path, _data, cb) => cb(null));

      recordFuseTelemetry({
        operation: 'getattr',
        durationMs: 15.2,
        errno: '0',
        path: '/Documents',
        processName: 'nautilus',
        logsPath: '/tmp/logs',
        appendFn: mockAppend,
      });

      expect(mockAppend).toHaveBeenCalledTimes(1);
      const serialized = String(mockAppend.mock.calls[0][1]);
      const parsed = JSON.parse(serialized);

      expect(parsed).toMatchObject({
        category: 'FUSE',
        operation: 'getattr',
        durationMs: 15.2,
        errno: '0',
        path: '/Documents',
        processName: 'nautilus',
      });
    });
  });

  describe('http-telemetry.interceptor', () => {
    it('should attach interceptors to axios instance when enabled', () => {
      process.env.NODE_ENV = 'development';
      const requestUse = vi.fn();
      const responseUse = vi.fn();
      const mockHttp = {
        interceptors: {
          request: { use: requestUse },
          response: { use: responseUse },
        },
      } as unknown as AxiosInstance;

      attachHttpTelemetryInterceptor({ http: mockHttp });

      expect(requestUse).toHaveBeenCalledTimes(1);
      expect(responseUse).toHaveBeenCalledTimes(1);
    });

    it('should not attach interceptors when disabled', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_QA_TELEMETRY;
      const requestUse = vi.fn();
      const responseUse = vi.fn();
      const mockHttp = {
        interceptors: {
          request: { use: requestUse },
          response: { use: responseUse },
        },
      } as unknown as AxiosInstance;

      attachHttpTelemetryInterceptor({ http: mockHttp });

      expect(requestUse).not.toHaveBeenCalled();
      expect(responseUse).not.toHaveBeenCalled();
    });

    it('should record successful HTTP request duration through interceptors', () => {
      const recordMock = vi.fn();
      const { onRequestFulfilled, onResponseFulfilled } = createHttpTelemetryInterceptors({
        onRecord: recordMock,
      });

      const config = {
        method: 'get',
        url: 'https://example.com/api/test',
      } as InternalAxiosRequestConfig;

      const configured = onRequestFulfilled(config);
      expect(configured).toBe(config);

      const response = {
        status: 200,
        config,
      } as AxiosResponse;

      const returned = onResponseFulfilled(response);
      expect(returned).toBe(response);

      expect(recordMock).toHaveBeenCalledTimes(1);
      expect(recordMock).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'https://example.com/api/test',
          status: 200,
          durationMs: expect.any(Number),
        }),
      );
    });

    it('should record rejected HTTP request error through interceptors', async () => {
      const recordMock = vi.fn();
      const { onRequestFulfilled, onResponseRejected } = createHttpTelemetryInterceptors({
        onRecord: recordMock,
      });

      const config = {
        method: 'post',
        url: 'https://example.com/api/fail',
      } as InternalAxiosRequestConfig;

      onRequestFulfilled(config);

      const error = {
        message: 'Network error',
        config,
        response: { status: 500 },
      } as unknown as AxiosError;

      await expect(onResponseRejected(error)).rejects.toBe(error);

      expect(recordMock).toHaveBeenCalledTimes(1);
      expect(recordMock).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://example.com/api/fail',
          status: 500,
          error: 'Network error',
          durationMs: expect.any(Number),
        }),
      );
    });

    it('should intercept node http.request calls via setupHttpTelemetry', () => {
      process.env.NODE_ENV = 'development';
      const recordMock = vi.fn();
      setupHttpTelemetry({ onRecord: recordMock });

      const req = http.request('http://example.com/items', () => undefined);
      req.emit('response', { statusCode: 200 });

      expect(recordMock).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'http://example.com/items',
          status: 200,
          durationMs: expect.any(Number),
        }),
      );
    });

    it('should intercept node http.request error events via setupHttpTelemetry', () => {
      process.env.NODE_ENV = 'development';
      const recordMock = vi.fn();
      setupHttpTelemetry({ onRecord: recordMock });

      const req = http.request('http://example.com/broken', () => undefined);
      req.emit('error', new Error('Connection failed'));

      expect(recordMock).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'http://example.com/broken',
          status: 0,
          error: 'Connection failed',
          durationMs: expect.any(Number),
        }),
      );
    });
  });

  describe('fuse-telemetry.middleware', () => {
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
});
