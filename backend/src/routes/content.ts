import {
  Router,
} from 'express';

import {
  conceptIdSchema,
  contentSessionIdSchema,
  technologyIdSchema,
  topicIdSchema,
} from '../content/content-id.js';

import type {
  ContentService,
} from '../content/content-service.js';

export function createContentRouter(
  service: ContentService,
): Router {
  const router = Router();

  router.get(
    '/technologies',
    async (_request, response, next) => {
      try {
        const technologies =
          await service.getTechnologies();

        response.json(
          technologies,
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/technologies/:technologyId/topics',
    async (request, response, next) => {
      try {
        const technologyId =
          technologyIdSchema.parse(
            request.params.technologyId,
          );

        const topics =
          await service.getTopicsByTechnology(
            technologyId,
          );

        response.json(
          topics,
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/topics/:topicId/concepts',
    async (request, response, next) => {
      try {
        const topicId =
          topicIdSchema.parse(
            request.params.topicId,
          );

        const concepts =
          await service.getConceptsByTopic(
            topicId,
          );

        response.json(
          concepts,
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/concepts/:conceptId',
    async (request, response, next) => {
      try {
        const conceptId =
          conceptIdSchema.parse(
            request.params.conceptId,
          );

        const concept =
          await service.getConcept(
            conceptId,
          );

        if (concept === null) {
          response.status(404).json({
            error: 'CONTENT_NOT_FOUND',
          });

          return;
        }

        response.json(
          concept,
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/concepts/:conceptId/sessions',
    async (request, response, next) => {
      try {
        const conceptId =
          conceptIdSchema.parse(
            request.params.conceptId,
          );

        const sessions =
          await service.getSessionsByConcept(
            conceptId,
          );

        response.json(
          sessions,
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/sessions/:sessionId',
    async (request, response, next) => {
      try {
        const sessionId =
          contentSessionIdSchema.parse(
            request.params.sessionId,
          );

        const session =
          await service.getSession(
            sessionId,
          );

        if (session === null) {
          response.status(404).json({
            error: 'CONTENT_NOT_FOUND',
          });

          return;
        }

        response.json(
          session,
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
