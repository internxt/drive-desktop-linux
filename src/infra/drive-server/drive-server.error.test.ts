import { mapStatusToErrorCause } from './drive-server.error';

describe('mapStatusToErrorCause', () => {
  it('maps 402 to FILE_TOO_BIG when the message mentions a size limit', () => {
    expect(mapStatusToErrorCause(402, 'The file is too big')).toBe('FILE_TOO_BIG');
  });

  it('maps 402 to EMPTY_FILE when the server rejects empty files', () => {
    expect(mapStatusToErrorCause(402, 'You can not have empty files, upgrade your plan to get more features')).toBe(
      'EMPTY_FILE',
    );
  });
});
