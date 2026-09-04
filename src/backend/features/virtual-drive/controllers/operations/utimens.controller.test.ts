import { mockDeep } from 'vitest-mock-extended';
import { Request, Response } from 'express';
import { Container } from 'diod';
import { utimensController } from './utimens.controller';
import * as utimensServiceModule from '../../services/operations/utimens.service';
import { partialSpyOn } from '../../../../../../tests/vitest/utils.helper';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';

describe('utimensController', () => {
  const utimensMock = partialSpyOn(utimensServiceModule, 'utimens');
  let req: ReturnType<typeof mockDeep<Request>>;
  let res: ReturnType<typeof mockDeep<Response>>;
  let container: ReturnType<typeof mockDeep<Container>>;

  const modificationTime = '2024-03-04T05:06:07.000Z';

  beforeEach(() => {
    req = mockDeep<Request>();
    res = mockDeep<Response>();
    container = mockDeep<Container>();
  });

  it('should return errno EINVAL when path is missing', async () => {
    req.body = { modificationTime };

    await utimensController(req, res, container);

    expect(res.json).toBeCalledWith({ errno: FuseCodes.EINVAL });
    expect(utimensMock).not.toBeCalled();
  });

  // A body is JSON, so `path` can be any JSON type. Answering EINVAL is the
  // contract; throwing on `.startsWith` inside ensureLeadingSlash is not.
  it('should return errno EINVAL when path is not a string', async () => {
    req.body = { path: 123, modificationTime };

    await utimensController(req, res, container);

    expect(res.json).toBeCalledWith({ errno: FuseCodes.EINVAL });
    expect(utimensMock).not.toBeCalled();
  });

  it('should return errno EINVAL when the body is absent', async () => {
    req.body = undefined;

    await utimensController(req, res, container);

    expect(res.json).toBeCalledWith({ errno: FuseCodes.EINVAL });
    expect(utimensMock).not.toBeCalled();
  });

  it('should return errno EINVAL when the modification time is not a date', async () => {
    req.body = { path: '/a/path', modificationTime: 'not-a-date' };

    await utimensController(req, res, container);

    expect(res.json).toBeCalledWith({ errno: FuseCodes.EINVAL });
    expect(utimensMock).not.toBeCalled();
  });

  it('should return errno 0 when utimens succeeds', async () => {
    req.body = { path: 'a/path', modificationTime };
    utimensMock.mockResolvedValue({ data: undefined });

    await utimensController(req, res, container);

    expect(utimensMock).toBeCalledWith(
      expect.objectContaining({ path: '/a/path', modificationTime: new Date(modificationTime) }),
    );
    expect(res.json).toBeCalledWith({ errno: 0 });
  });
});
