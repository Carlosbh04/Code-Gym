import type {
  PublicConcept,
  PublicExerciseSession,
  PublicTechnology,
  PublicTopic,
} from './content-model.js';

import type {
  ContentRepository,
} from './content-repository.js';

export class ContentService {
  public constructor(
    private readonly repository:
      ContentRepository,
  ) {}

  public getTechnologies():
  Promise<readonly PublicTechnology[]> {
    return this.repository
      .getTechnologies();
  }

  public getTopicsByTechnology(
    technologyId: string,
  ): Promise<readonly PublicTopic[]> {
    return this.repository
      .getTopicsByTechnology(
        technologyId,
      );
  }

  public getConceptsByTopic(
    topicId: string,
  ): Promise<readonly PublicConcept[]> {
    return this.repository
      .getConceptsByTopic(
        topicId,
      );
  }

  public getConcept(
    conceptId: string,
  ): Promise<PublicConcept | null> {
    return this.repository
      .getConceptById(
        conceptId,
      );
  }

  public getSessionsByConcept(
    conceptId: string,
  ): Promise<
    readonly PublicExerciseSession[]
  > {
    return this.repository
      .getSessionsByConcept(
        conceptId,
      );
  }

  public getSession(
    sessionId: string,
  ): Promise<
    PublicExerciseSession | null
  > {
    return this.repository
      .getSessionById(
        sessionId,
      );
  }
}
