import { Router } from 'express';

// Routes for FUSE operation endpoints (POST /op/<name>).
// Each operation will be registered here as it is implemented in PB-6161.
export function buildOperationsRouter(): Router {
  const router = Router();

  return router;
}
