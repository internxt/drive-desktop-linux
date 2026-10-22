import { getMailBridgeProcessEnvironment } from './get-mail-bridge-process-environment';

describe('getMailBridgeProcessEnvironment', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('provides a separate process environment with the embedded Mail configuration', () => {
    vi.stubEnv('MAIL_API_URL', 'https://mail.example.test');
    vi.stubEnv('MAIL_SERVER_PUBLIC_KEY', 'test-key');
    const result = getMailBridgeProcessEnvironment();
    expect(result.data).not.toBe(process.env);
    expect(result.data).toMatchObject({
      MAIL_API_URL: 'https://mail.example.test',
      MAIL_SERVER_PUBLIC_KEY: 'test-key',
    });
  });

  it('reports missing Mail process configuration', () => {
    vi.stubEnv('MAIL_API_URL', undefined);
    expect(getMailBridgeProcessEnvironment().error?.message).toBe('Mail Bridge requires MAIL_API_URL');
  });
});
