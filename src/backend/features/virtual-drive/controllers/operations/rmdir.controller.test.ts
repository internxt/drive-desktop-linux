import { mockDeep } from 'vitest-mock-extended';
import { Request, Response } from 'express';
import { Container } from 'diod';
import { rmdirController } from './rmdir.controller';
import * as rmdirServiceModule from '../../services/operations/rmdir.service';
import { partialSpyOn } from '../../../../../../tests/vitest/utils.helper';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';

vi.mock('@internxt/drive-desktop-core/build/backend');
vi.mock('../../services/operations/rmdir.service');

describe('rmdirController', () => {
  const rmdirMock = partialSpyOn(rmdirServiceModule, 'rmdir');
  let req: ReturnType<typeof mockDeep<Request>>;
  let res: ReturnType<typeof mockDeep<Response>>;
  let container: ReturnType<typeof mockDeep<Container>>;

  beforeEach(() => {
    req = mockDeep<Request>();
    res = mockDeep<Response>();
    container = mockDeep<Container>();
    res.status.mockReturnValue(res);
  });

  it('should return 200 when rmdir succeeds', async () => {
    req.body = { path: '/some/folder' };
    rmdirMock.mockResolvedValue({ data: undefined });

    await rmdirController(req, res, container);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
  });

  it('should return 404 when rmdir returns ENOENT', async () => {
    req.body = { path: '/missing/folder' };
    rmdirMock.mockResolvedValue({ error: new FuseError(FuseCodes.ENOENT, 'not found') });

    await rmdirController(req, res, container);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalled();
  });

  it('should return 500 when rmdir returns non-ENOENT error', async () => {
    req.body = { path: '/some/folder' };
    rmdirMock.mockResolvedValue({ error: new FuseError(FuseCodes.EIO, 'io error') });

    await rmdirController(req, res, container);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalled();
  });
});
