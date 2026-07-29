import { mapStatusToErrorCause } from './drive-server.error';

describe('mapStatusToErrorCause', () => {
  it('maps 400 to EMPTY_FILE when the server rejects additional empty files', () => {
    expect(mapStatusToErrorCause(400, 'You can not have more empty files')).toBe('EMPTY_FILE');
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
});
