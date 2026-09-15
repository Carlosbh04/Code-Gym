import { Router } from 'express';
import type { Logger } from 'pino';

export type DatabaseHealthCheck = () => Promise<boolean>;

export interface HealthRouterDependencies {
  readonly databaseHealthCheck: DatabaseHealthCheck;
  readonly logger: Logger;
}

export function createHealthRouter({ databaseHealthCheck, logger }: HealthRouterDependencies): Router {
  const router = Router();

  router.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  router.get('/health/db', async (_request, response) => {
    let healthy = false;
    try {
      healthy = await databaseHealthCheck();
    } catch {
      // Dependency boundaries may throw; the public contract remains constant.
    }

    if (!healthy) {
      logger.warn({ event: 'databaseHealthUnavailable' }, 'Database health check unavailable');
      response.status(503).json({ status: 'unavailable' });
      return;
    }

    response.status(200).json({ status: 'ok' });
  });

  return router;
}
