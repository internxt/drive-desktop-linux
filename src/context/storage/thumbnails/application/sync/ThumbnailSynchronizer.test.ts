import { ThumbnailSynchronizer } from './ThumbnailSynchronizer';
import { FileMother } from '../../../../virtual-drive/files/domain/__test-helpers__/FileMother';
import { ThumbnailsRepositoryMock } from '../../__mock__/ThumbnailsRepositoryMock';

describe('Thumbnail Synchronizer', () => {
  let SUT: ThumbnailSynchronizer;

  let local: ThumbnailsRepositoryMock;

  beforeAll(() => {
    local = new ThumbnailsRepositoryMock();

    SUT = new ThumbnailSynchronizer(local);
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('does not create a default thumbnail if already exits', async () => {
    const file = FileMother.noThumbnable();

    local.hasWillReturn(true);

    await SUT.run([file]);

    local.assertHasHasBeenCalledWith(file);
    local.assertDefaultHasNotBeenCalled();
  });

  it('does not create a default thumbnail of a thumbnable file', async () => {
    const file = FileMother.thumbnable();

    local.hasWillReturn(true);

    await SUT.run([file]);

    local.assertHasHasNotBeenCalledWith();
    local.assertDefaultHasNotBeenCalled();
  });

  it('creates a default thumbnail if does not exits', async () => {
    const files = [
      FileMother.noThumbnable(),
      FileMother.noThumbnable(),
      FileMother.noThumbnable(),
      FileMother.noThumbnable(),
    ];

    local.hasWillReturn(false);

    await SUT.run(files);

    files.forEach((file) => {
      local.assertHasHasBeenCalledWith(file);
      local.assertDefaultBeenCalledWith(file);
    });
  });
});
