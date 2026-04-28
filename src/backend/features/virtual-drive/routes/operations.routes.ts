import { Router } from 'express';
import { Container } from 'diod';
import { OPERATION_PATHS } from '../constants';
import { getAttributesController } from '../controllers/operations/get-attributes.controller';
import { openController } from '../controllers/operations/open.controller';
import { openDirController } from '../controllers/operations/opendir.controller';
import { readController } from '../controllers/operations/read.controller';

// Routes for FUSE operation endpoints (POST /op/<name>).
// Each operation will be registered here as it is implemented in PB-6161.
export function buildOperationsRouter(container: Container): Router {
  const router = Router();
  router.post(OPERATION_PATHS.GET_ATTR, (req, res) => getAttributesController(req, res, container));
  router.post(OPERATION_PATHS.OPEN, (req, res) => openController(req, res, container));
  router.post(OPERATION_PATHS.OPEN_DIR, (req, res) => openDirController(req, res, container));
  router.post(OPERATION_PATHS.READ, (req, res) => readController(req, res, container));
  return router;
}
