import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import {
  SessionCompletionContext,
  type SessionCompletionContextValue,
} from '@/contexts/session-completion-context';
import { useProgress } from '@/hooks/useProgress';
import { calculateScore } from '@/lib/engine/scoring';
import { calculateDomainImpact } from '@/lib/progress/domain-calculator';
import type { ExerciseSession } from '@/types/exercise';
import type {
  Attempt,
  CompletedSession,
  ConceptProgress,
  SessionScore,
  UserAnswer,
} from '@/types/progress';
import type {
  IAttemptRepository,
  ICompletedSessionRepository,
} from '@/types/repository';

const PROGRESS_SCHEMA_VERSION = 1;

interface CompletionPlan {
  progress: ConceptProgress;
  attempts: Attempt[];
  completedSession: CompletedSession;
  score: SessionScore;
  progressPersisted: boolean;
  nextAttemptIndex: number;
  completedSessionPersisted: boolean;
  inFlight: Promise<SessionScore> | null;
}

export interface SessionCompletionProviderProps {
  attemptRepository: IAttemptRepository;
  completedSessionRepository: ICompletedSessionRepository;
  now?: () => Date;
  createId?: () => string;
  children: ReactNode;
}

const systemNow = (): Date => new Date();
const systemCreateId = (): string => crypto.randomUUID();

function buildProgress(
  session: ExerciseSession,
  answers: UserAnswer[],
  previous: ConceptProgress | undefined,
  completedAt: string,
): ConceptProgress {
  const correct = answers.filter((answer) => answer.isCorrect).length;
  const difficultyDistribution = previous?.difficultyDistribution ?? {
    beginner: { total: 0, correct: 0 },
    intermediate: { total: 0, correct: 0 },
    advanced: { total: 0, correct: 0 },
  };
  const difficulty = difficultyDistribution[session.difficulty];

  return {
    conceptId: session.conceptId,
    // D018: 0 significa «todavía no calculado» para el primer progreso. T050
    // conserva el dominio porque D013 no permite derivar aún sus cinco factores.
    domain: previous?.domain ?? 0,
    totalAttempts: (previous?.totalAttempts ?? 0) + answers.length,
    correctAttempts: (previous?.correctAttempts ?? 0) + correct,
    difficultyDistribution: {
      beginner: { ...difficultyDistribution.beginner },
      intermediate: { ...difficultyDistribution.intermediate },
      advanced: { ...difficultyDistribution.advanced },
      [session.difficulty]: {
        total: difficulty.total + answers.length,
        correct: difficulty.correct + correct,
      },
    },
    // UserAnswer no contiene un errorType canónico. No se fabrican ErrorRecord.
    recentErrors: previous?.recentErrors ?? [],
    lastPracticed: completedAt,
    schemaVersion: previous?.schemaVersion ?? PROGRESS_SCHEMA_VERSION,
  };
}

function buildPlan(
  session: ExerciseSession,
  answers: UserAnswer[],
  previous: ConceptProgress | undefined,
  now: () => Date,
  createId: () => string,
): CompletionPlan {
  // Fecha, IDs y datos derivados se fijan una sola vez. Los retries reutilizan
  // este mismo objeto y nunca reconstruyen el plan.
  const completedAt = now().toISOString();
  const progress = buildProgress(session, answers, previous, completedAt);
  const previousDomain = previous?.domain ?? 0;
  const domainImpact = calculateDomainImpact(previousDomain, previousDomain);
  const score = calculateScore(session, answers, domainImpact);
  const attempts = answers.map<Attempt>((answer) => ({
    id: createId(),
    sessionId: session.id,
    stepId: answer.stepId,
    stepType: answer.stepType,
    answer: answer.answer,
    isCorrect: answer.isCorrect,
    timeSpentMs: answer.timeSpentMs,
    hintsUsed: answer.hintsUsed,
    createdAt: completedAt,
  }));
  const completedSession: CompletedSession = {
    id: createId(),
    sessionId: session.id,
    technologyId: session.technologyId,
    conceptId: session.conceptId,
    totalSteps: score.totalSteps,
    correctSteps: score.correctSteps,
    accuracy: score.accuracy,
    timeSpentMs: score.timeSpentMs,
    completedAt,
  };

  return {
    progress,
    attempts,
    completedSession,
    score,
    progressPersisted: false,
    nextAttemptIndex: 0,
    completedSessionPersisted: false,
    inFlight: null,
  };
}

/**
 * Coordina la finalización durable de una sesión (T050, D018).
 *
 * No es una transacción: conserva en memoria la última etapa confirmada y un
 * retry continúa desde ahí. La garantía termina al desmontar este provider.
 */
export function SessionCompletionProvider({
  attemptRepository,
  completedSessionRepository,
  now = systemNow,
  createId = systemCreateId,
  children,
}: SessionCompletionProviderProps) {
  const { progress, updateProgress, isLoading, error } = useProgress();
  const plans = useRef(new Map<string, CompletionPlan>());

  const completeSession = useCallback<
    SessionCompletionContextValue['completeSession']
  >(
    (operationId, session, answers) => {
      let plan = plans.current.get(operationId);

      if (plan === undefined) {
        if (isLoading) {
          return Promise.reject(
            new Error('El progreso todavía no está inicializado'),
          );
        }
        if (error !== null) {
          return Promise.reject(new Error(`No se pudo cargar el progreso: ${error}`));
        }

        plan = buildPlan(
          session,
          answers,
          progress.get(session.conceptId),
          now,
          createId,
        );
        plans.current.set(operationId, plan);
      }

      if (plan.inFlight !== null) {
        return plan.inFlight;
      }

      const persist = async (): Promise<SessionScore> => {
        if (!plan.progressPersisted) {
          await updateProgress(plan.progress.conceptId, plan.progress);
          plan.progressPersisted = true;
        }

        while (plan.nextAttemptIndex < plan.attempts.length) {
          await attemptRepository.saveAttempt(
            plan.attempts[plan.nextAttemptIndex],
          );
          plan.nextAttemptIndex += 1;
        }

        if (!plan.completedSessionPersisted) {
          await completedSessionRepository.save(plan.completedSession);
          plan.completedSessionPersisted = true;
        }

        return plan.score;
      };

      plan.inFlight = persist().finally(() => {
        plan.inFlight = null;
      });

      return plan.inFlight;
    },
    [
      attemptRepository,
      completedSessionRepository,
      createId,
      error,
      isLoading,
      now,
      progress,
      updateProgress,
    ],
  );

  const value = useMemo<SessionCompletionContextValue>(
    () => ({ completeSession }),
    [completeSession],
  );

  return (
    <SessionCompletionContext.Provider value={value}>
      {children}
    </SessionCompletionContext.Provider>
  );
}
