import { mockDeep } from 'vitest-mock-extended';
import { Request, Response } from 'express';
import { Container } from 'diod';
import { getXAttrController } from './get-x-attr.controller';
import * as getXAttrServiceModule from '../../services/operations/get-x-attr.service';
import { partialSpyOn } from '../../../../../../tests/vitest/utils.helper';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';

vi.mock('@internxt/drive-desktop-core/build/backend');
vi.mock('../../services/operations/get-x-attr.service');

describe('get-x-attr.controller', () => {
  const getXAttrMock = partialSpyOn(getXAttrServiceModule, 'getXAttr');
  let req: ReturnType<typeof mockDeep<Request>>;
  let res: ReturnType<typeof mockDeep<Response>>;
  let container: ReturnType<typeof mockDeep<Container>>;

  beforeEach(() => {
    req = mockDeep<Request>();
    res = mockDeep<Response>();
    container = mockDeep<Container>();
    res.status.mockReturnValue(res);
  });

  it('should return 404 when getXAttr returns ENOENT', async () => {
    req.body = { path: '/missing.txt', attr: 'SYNC_STATUS' };
    getXAttrMock.mockResolvedValue({
      error: new FuseError(FuseCodes.ENOENT, 'File not found'),
    });

    await getXAttrController(req, res, container);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalled();
  });

  it('should return 501 when getXAttr returns ENOSYS', async () => {
    req.body = { path: '/', attr: 'SYNC_STATUS' };
    getXAttrMock.mockResolvedValue({
      error: new FuseError(FuseCodes.ENOSYS, 'Not implemented for root'),
    });

    await getXAttrController(req, res, container);

    expect(res.status).toHaveBeenCalledWith(501);
    expect(res.send).toHaveBeenCalled();
  });

  it('should return JSON xattr value when operation succeeds', async () => {
    req.body = { path: '/some/file.txt', attr: 'SYNC_STATUS' };
    getXAttrMock.mockResolvedValue({
      data: { value: 'on_local' },
    });

    await getXAttrController(req, res, container);

    expect(res.json).toHaveBeenCalledWith({ value: 'on_local' });
  });
});