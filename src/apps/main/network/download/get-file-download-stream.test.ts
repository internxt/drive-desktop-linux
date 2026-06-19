import fetch from 'electron-fetch';
import * as networkFacadeModule from '../NetworkFacade';
import * as streamModule from './stream';
import { ReadableStream } from 'node:stream/web';
import { deepMocked, partialSpyOn } from 'tests/vitest/utils.helper';
vi.mock(import('electron-fetch'));
import { getFileDownloadStream } from './get-file-download-stream';

describe('get-file-download-stream', () => {
  const convertToReadableStreamMock = partialSpyOn(networkFacadeModule, 'convertToReadableStream');
  const getDecryptedStreamMock = partialSpyOn(streamModule, 'getDecryptedStream');
  const fetchMock = deepMocked(fetch);

  it('should build decrypted stream from all download urls', async () => {
    // Given
    const encryptedPart = new ReadableStream<Uint8Array>();
    const decrypted = new ReadableStream<Uint8Array>();
    fetchMock.mockResolvedValue({ body: {} });
    convertToReadableStreamMock.mockReturnValue(encryptedPart);
    getDecryptedStreamMock.mockReturnValue(decrypted);

    // When
    const result = await getFileDownloadStream({
      downloadUrls: ['https://a', 'https://b'],
      decipher: {} as never,
    });

    // Then
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getDecryptedStreamMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(decrypted);
  });

  it('should throw when download is aborted before fetch', async () => {
    // Then
    await expect(
      getFileDownloadStream({
        downloadUrls: ['https://a'],
        decipher: {} as never,
        abortController: { signal: { aborted: true } } as AbortController,
      }),
    ).rejects.toThrow('Download aborted');
  });

  it('should throw when fetch response has no body', async () => {
    // Given
    fetchMock.mockResolvedValue({ body: null });

    // Then
    await expect(
      getFileDownloadStream({
        downloadUrls: ['https://a'],
        decipher: {} as never,
      }),
    ).rejects.toThrow('No content received');
  });
});
