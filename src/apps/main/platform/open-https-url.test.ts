import { shell } from 'electron';
import { call, calls } from 'tests/vitest/utils.helper';
import { loggerMock } from 'tests/vitest/mocks.helper';
import { openHttpsUrl } from './open-https-url';

describe('open-https-url', () => {
  const openExternalMock = vi.mocked(shell.openExternal);

  beforeEach(() => {
    openExternalMock.mockResolvedValue();
  });

  it('should open an https url', async () => {
    // When
    await openHttpsUrl({ url: 'https://drive.internxt.com/login?universalLink=true' });

    // Then
    call(openExternalMock).toBe('https://drive.internxt.com/login?universalLink=true');
    calls(loggerMock.warn).toHaveLength(0);
  });

  it.each(['http://drive.internxt.com', 'file:///etc/passwd', 'javascript:alert(1)'])(
    'should reject %s',
    async (url) => {
      // When
      await openHttpsUrl({ url });

      // Then
      calls(openExternalMock).toHaveLength(0);
      call(loggerMock.warn).toMatchObject({
        msg: 'Rejected open-url because the protocol is not https',
        protocol: new URL(url).protocol,
      });
    },
  );

  it('should reject an invalid url', async () => {
    // When
    await openHttpsUrl({ url: 'not a url' });

    // Then
    calls(openExternalMock).toHaveLength(0);
    call(loggerMock.warn).toMatchObject({
      msg: 'Rejected open-url because the URL is invalid',
    });
  });
});
