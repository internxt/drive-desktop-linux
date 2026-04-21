import { Router } from 'express';
import { getAttributesController } from '../controllers/operations.controller';
import { Container } from 'diod';

// Routes for FUSE operation endpoints (POST /op/<name>).
// Each operation will be registered here as it is implemented in PB-6161.
export function buildOperationsRouter(container: Container): Router {
  const router = Router();
  router.post('/getattributes', (req, res) => getAttributesController(req, res, container));
  return router;
}
