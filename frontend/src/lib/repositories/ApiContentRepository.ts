import {
  ApiError,
  apiRequest,
} from '@/lib/api/http-client';

import type {
  Concept,
  Technology,
  Topic,
} from '@/types/content';

import type {
  ExerciseSession,
} from '@/types/exercise';

import type {
  IContentRepository,
} from '@/types/repository';

export class ApiContentRepository
implements IContentRepository {
  public getTechnologies():
  Promise<Technology[]> {
    return apiRequest<Technology[]>(
      '/content/technologies',
      {
        method: 'GET',
        cache: 'no-store',
      },
    );
  }

  public getTopicsByTechnology(
    technologyId: string,
  ): Promise<Topic[]> {
    return apiRequest<Topic[]>(
      `/content/technologies/${
        encodeURIComponent(
          technologyId,
        )
      }/topics`,
      {
        method: 'GET',
        cache: 'no-store',
      },
    );
  }

  public getConceptsByTopic(
    topicId: string,
  ): Promise<Concept[]> {
    return apiRequest<Concept[]>(
      `/content/topics/${
        encodeURIComponent(
          topicId,
        )
      }/concepts`,
      {
        method: 'GET',
        cache: 'no-store',
      },
    );
  }

  public async getConceptById(
    conceptId: string,
  ): Promise<Concept | null> {
    try {
      return await apiRequest<Concept>(
        `/content/concepts/${
          encodeURIComponent(
            conceptId,
          )
        }`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      );
    } catch (error) {
      if (
        error instanceof ApiError
        && error.status === 404
      ) {
        return null;
      }

      throw error;
    }
  }

  public getSessionsByConcept(
    conceptId: string,
  ): Promise<ExerciseSession[]> {
    return apiRequest<ExerciseSession[]>(
      `/content/concepts/${
        encodeURIComponent(
          conceptId,
        )
      }/sessions`,
      {
        method: 'GET',
        cache: 'no-store',
      },
    );
  }

  public async getSessionById(
    sessionId: string,
  ): Promise<ExerciseSession | null> {
    try {
      return await apiRequest<ExerciseSession>(
        `/content/sessions/${
          encodeURIComponent(
            sessionId,
          )
        }`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      );
    } catch (error) {
      if (
        error instanceof ApiError
        && error.status === 404
      ) {
        return null;
      }

      throw error;
    }
  }
}
