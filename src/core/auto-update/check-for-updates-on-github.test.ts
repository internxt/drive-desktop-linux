import { EventEmitter } from 'events';
import { checkForUpdatesOnGithub } from './check-for-updates-on-github';

const mockGet = vi.fn();

vi.mock('https', () => ({
  default: { get: (...args: unknown[]) => mockGet(...args) },
}));

function mockHttpsResponse(statusCode: number, body: string) {
  const res = new EventEmitter() as EventEmitter & { statusCode: number };
  res.statusCode = statusCode;

  const req = new EventEmitter();

  mockGet.mockImplementation((_options, callback) => {
    callback(res);
    res.emit('data', body);
    res.emit('end');
    return req;
  });
}

function mockHttpsError(error: Error) {
  const req = new EventEmitter();

  mockGet.mockImplementation(() => {
    setTimeout(() => req.emit('error', error), 0);
    return req;
  });
}

describe('checkForUpdatesOnGithub', () => {
  describe('when a newer version is available', () => {
    it('returns the latest version', async () => {
      mockHttpsResponse(200, JSON.stringify({ tag_name: 'v3.0.0' }));

      const result = await checkForUpdatesOnGithub({ currentVersion: '2.5.3' });

      expect(result).toEqual({ version: '3.0.0' });
    });

    it('strips the leading v from the tag name', async () => {
      mockHttpsResponse(200, JSON.stringify({ tag_name: 'v2.6.0' }));

      const result = await checkForUpdatesOnGithub({ currentVersion: '2.5.3' });

      expect(result).toEqual({ version: '2.6.0' });
    });
  });

  describe('when the current version is up to date', () => {
    it('returns null', async () => {
      mockHttpsResponse(200, JSON.stringify({ tag_name: 'v2.5.3' }));

      const result = await checkForUpdatesOnGithub({ currentVersion: '2.5.3' });

      expect(result).toBeNull();
    });
  });

  describe('when the GitHub API returns a non-200 status', () => {
    it('returns null', async () => {
      mockHttpsResponse(403, '');

      const result = await checkForUpdatesOnGithub({ currentVersion: '2.5.3' });

      expect(result).toBeNull();
    });
  });

  describe('when the GitHub API returns invalid JSON', () => {
    it('returns null', async () => {
      mockHttpsResponse(200, 'not-valid-json');

      const result = await checkForUpdatesOnGithub({ currentVersion: '2.5.3' });

      expect(result).toBeNull();
    });
  });

  describe('when the request fails with a network error', () => {
    it('returns null', async () => {
      mockHttpsError(new Error('ECONNREFUSED'));

      const result = await checkForUpdatesOnGithub({ currentVersion: '2.5.3' });

      expect(result).toBeNull();
    });
  });
});
