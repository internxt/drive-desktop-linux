import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import { buildOperationsRouter } from './operations.routes';
import { OPERATION_PATHS } from '../constants';

describe('buildOperationsRouter', () => {
  it('should register POST /getattributes', () => {
    const container = mockDeep<Container>();
    const router = buildOperationsRouter(container);

    const routes = router.stack.filter((layer) => layer.route).map((layer) => layer.route!.path);

    expect(routes).toContain(OPERATION_PATHS.GET_ATTR);
    expect(routes).toContain(OPERATION_PATHS.GET_X_ATTR);
  });
});
