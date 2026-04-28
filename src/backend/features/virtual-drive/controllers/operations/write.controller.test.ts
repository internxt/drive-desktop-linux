import { mockDeep } from 'vitest-mock-extended';
import { Request, Response } from 'express';
import { Container } from 'diod';
import { writeController } from './write.controller';
import * as writeServiceModule from '../../services/operations/write.service';
import { partialSpyOn } from '../../../../../../tests/vitest/utils.helper';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';

describe('writeController', () => {
  const writeMock = partialSpyOn(writeServiceModule, 'write');
  let req: ReturnType<typeof mockDeep<Request>>;
  let res: ReturnType<typeof mockDeep<Response>>;
  let container: ReturnType<typeof mockDeep<Container>>;

  beforeEach(() => {
    req = mockDeep<Request>();
    res = mockDeep<Response>();
    container = mockDeep<Container>();
  });

  it('should return errno EINVAL when payload is invalid', async () => {
    req.body = { path: '/some/file.txt', offset: 'wrong', data: 'aGVsbG8=' };

    await writeController(req, res, container);

    expect(res.json).toHaveBeenCalledWith({ errno: FuseCodes.EINVAL });
    expect(writeMock).not.toHaveBeenCalled();
  });

  it('should return errno 0 and written bytes when write succeeds', async () => {
    req.body = { path: '/some/file.txt', offset: 0, data: 'aGVsbG8=' };
    writeMock.mockResolvedValue({ data: 5 });

    await writeController(req, res, container);

    expect(res.json).toHaveBeenCalledWith({ errno: 0, written: 5 });
  });

  it('should return errno EIO when write fails', async () => {
    req.body = { path: '/some/file.txt', offset: 0, data: 'aGVsbG8=' };
    writeMock.mockResolvedValue({ error: new FuseError(FuseCodes.EIO, 'io error') });

    await writeController(req, res, container);

    expect(res.json).toHaveBeenCalledWith({ errno: FuseCodes.EIO });
  });
});
