import { Router } from 'express';
import { Container } from 'diod';
import { OPERATION_PATHS } from '../constants';
import { getAttributesController } from '../controllers/operations/get-attributes.controller';
import { getXAttrController } from '../controllers/operations/get-x-attr.controller';

// Routes for FUSE operation endpoints (POST /op/<name>).
// Each operation will be registered here as it is implemented in PB-6161.
export function buildOperationsRouter(container: Container): Router {
  const router = Router();
  router.post(OPERATION_PATHS.GET_ATTR, (req, res) => getAttributesController(req, res, container));
  router.post(OPERATION_PATHS.GET_X_ATTR, (req, res) => getXAttrController(req, res, container));
  return router;
}
