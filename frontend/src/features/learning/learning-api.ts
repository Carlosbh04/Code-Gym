import { apiRequest } from '@/lib/api/http-client';

import type {
  ConceptLearningState,
  LearningLevelId,
  LearningLevelState,
  LearningLevelStateResponse,
  LearningStateResponse,
} from './learning-types';

export interface LearningHttpClient {
  get<T>(
    path: string,
    accessToken: string,
  ): Promise<T>;

  post<T>(
    path: string,
    body: unknown,
    accessToken: string,
  ): Promise<T>;
}

export class LearningApi {
  public constructor(
    private readonly http:
      LearningHttpClient,
  ) {}

  public async getConceptState(
    conceptId: string,
    accessToken: string,
  ): Promise<ConceptLearningState> {
    const response =
      await this.http
        .get<LearningStateResponse>(
          `/learning/concepts/${encodeURIComponent(
            conceptId,
          )}/state`,
          accessToken,
        );

    return response.state;
  }

  public async getLevelState(
    conceptId: string,
    levelId: LearningLevelId,
    accessToken: string,
  ): Promise<LearningLevelState> {
    const response =
      await this.http
        .get<LearningLevelStateResponse>(
          `/learning/concepts/${encodeURIComponent(
            conceptId,
          )}/levels/${encodeURIComponent(
            levelId,
          )}/state`,
          accessToken,
        );

    return response.state;
  }

  public async completeLevelTheory(
    conceptId: string,
    levelId: LearningLevelId,
    accessToken: string,
  ): Promise<LearningLevelState> {
    const response =
      await this.http
        .post<LearningLevelStateResponse>(
          `/learning/concepts/${encodeURIComponent(
            conceptId,
          )}/levels/${encodeURIComponent(
            levelId,
          )}/theory/complete`,
          {},
          accessToken,
        );

    return response.state;
  }

  public async completeTheory(
    conceptId: string,
    accessToken: string,
  ): Promise<ConceptLearningState> {
    const response =
      await this.http
        .post<LearningStateResponse>(
          `/learning/concepts/${encodeURIComponent(
            conceptId,
          )}/theory/complete`,
          {},
          accessToken,
        );

    return response.state;
  }
}


const browserLearningHttpClient:
  LearningHttpClient = {
    get:
      <T>(
        path: string,
        accessToken: string,
      ): Promise<T> =>
        apiRequest<T>(
          path,
          {
            method:
              'GET',

            cache:
              'no-store',
            accessToken,
          },
        ),

    post:
      <T>(
        path: string,
        body: unknown,
        accessToken: string,
      ): Promise<T> =>
        apiRequest<T>(
          path,
          {
            method:
              'POST',

            cache:
              'no-store',

            body,
            accessToken,
          },
        ),
  };

export const browserLearningApi =
  new LearningApi(
    browserLearningHttpClient,
  );
