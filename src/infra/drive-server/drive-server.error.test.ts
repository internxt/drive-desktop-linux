import { mapStatusToErrorCause } from './drive-server.error';

describe('mapStatusToErrorCause', () => {
  it('maps 400 to EMPTY_FILE when the server rejects additional empty files', () => {
    expect(mapStatusToErrorCause(400, 'You can not have more empty files')).toBe('EMPTY_FILE');
  });

  it('maps 400 to FILE_TOO_BIG when the message indicates a size limit', () => {
    expect(mapStatusToErrorCause(400, 'File size exceeds the maximum allowed by your plan')).toBe('FILE_TOO_BIG');
  });

  it('maps 400 to BAD_REQUEST when the message does not match known cases', () => {
    expect(mapStatusToErrorCause(400, 'Invalid payload')).toBe('BAD_REQUEST');
  });

  it('maps 402 to FILE_TOO_BIG when the message mentions a size limit', () => {
    expect(mapStatusToErrorCause(402, 'The file is too big')).toBe('FILE_TOO_BIG');
  });

  it('maps 402 to FILE_TOO_BIG when the server reports plan upload size exceeded', () => {
    expect(mapStatusToErrorCause(402, 'File size exceeds the maximum allowed by your plan')).toBe('FILE_TOO_BIG');
  });

  it('maps 402 to EMPTY_FILE when the server rejects empty files', () => {
    expect(mapStatusToErrorCause(402, 'You can not have empty files, upgrade your plan to get more features')).toBe(
      'EMPTY_FILE',
    );
  });

  it('maps 402 to FILE_TOO_BIG when no known message is provided', () => {
    expect(mapStatusToErrorCause(402)).toBe('FILE_TOO_BIG');
  });

  it('maps 401 to NO_PERMISSION', () => {
    expect(mapStatusToErrorCause(401)).toBe('NO_PERMISSION');
  });

  it('maps 403 to FORBIDDEN', () => {
    expect(mapStatusToErrorCause(403)).toBe('FORBIDDEN');
  });

  it('maps 404 to NOT_FOUND', () => {
    expect(mapStatusToErrorCause(404)).toBe('NOT_FOUND');
  });

  it('maps 409 to CONFLICT', () => {
    expect(mapStatusToErrorCause(409)).toBe('CONFLICT');
  });

  it('maps 429 to TOO_MANY_REQUESTS', () => {
    expect(mapStatusToErrorCause(429)).toBe('TOO_MANY_REQUESTS');
  });

  it('maps other 4xx statuses to BAD_REQUEST', () => {
    expect(mapStatusToErrorCause(418)).toBe('BAD_REQUEST');
  });

  it('maps 5xx statuses to SERVER_ERROR', () => {
    expect(mapStatusToErrorCause(500)).toBe('SERVER_ERROR');
  });

  it('maps non-error statuses to UNKNOWN', () => {
    expect(mapStatusToErrorCause(200)).toBe('UNKNOWN');
  });
});
