import { ChildProcess } from 'node:child_process';
import * as core from '@internxt/drive-desktop-core/build/backend/features/mail-bridge';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { PATHS } from '../../../../core/electron/paths';
import { linuxMailBridgePlatform } from './mail-bridge-platform';
const { createMailBridgeStateDirectory, spawnMailBridge } = linuxMailBridgePlatform;

vi.mock('@internxt/drive-desktop-core/build/backend/features/mail-bridge', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@internxt/drive-desktop-core/build/backend/features/mail-bridge')>();
  return { ...actual, spawnMailBridge: vi.fn(), createMailBridgeStateDirectory: vi.fn() };
});

describe('Linux Mail Bridge platform', () => {
  let child: ChildProcess;

  beforeEach(() => {
    child = new ChildProcess();
    vi.mocked(core.spawnMailBridge).mockReturnValue(Result.ok(child));
    vi.mocked(core.createMailBridgeStateDirectory).mockResolvedValue(Result.ok('account-state'));
    vi.stubEnv('MAIL_API_URL', 'https://mail.example.test');
    vi.stubEnv('MAIL_SERVER_PUBLIC_KEY', 'server-public-key');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('passes embedded Mail configuration and Linux executable paths to core', () => {
    const result = spawnMailBridge({ endpoint: 'control-endpoint', stateDirectory: 'state-directory' });

    expect(result).toEqual(Result.ok(child));
    const props = vi.mocked(core.spawnMailBridge).mock.calls[0]?.[0];
    expect(props?.environment).not.toBe(process.env);
    expect(props?.environment).toMatchObject({
      MAIL_API_URL: 'https://mail.example.test',
      MAIL_SERVER_PUBLIC_KEY: 'server-public-key',
    });
    expect(props?.executablePath).toBe(`${process.cwd()}/.mail-bridge/mail-bridge`);
    expect(props?.workingDirectory).toBe(`${process.cwd()}/.mail-bridge`);
    expect(props?.endpoint).toBe('control-endpoint');
    expect(props?.stateDirectory).toBe('state-directory');
  });

  it('does not delegate process startup without a Mail API URL', () => {
    vi.stubEnv('MAIL_API_URL', undefined);

    expect(spawnMailBridge({ endpoint: 'control-endpoint', stateDirectory: 'state-directory' })).toEqual(
      Result.err(new Error('Mail Bridge requires MAIL_API_URL')),
    );
    expect(core.spawnMailBridge).not.toHaveBeenCalled();
  });

  it('supplies the Linux app data path and account ID to shared directory creation', async () => {
    expect(await createMailBridgeStateDirectory('account-id')).toEqual(Result.ok('account-state'));
    expect(core.createMailBridgeStateDirectory).toHaveBeenCalledWith({
      baseDirectory: PATHS.INTERNXT,
      accountId: 'account-id',
    });
  });
});
