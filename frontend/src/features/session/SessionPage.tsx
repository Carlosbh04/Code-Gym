import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/codegym/EmptyState';
import { ExerciseCard } from '@/components/codegym/ExerciseCard';
import { HintReveal } from '@/components/codegym/HintReveal';
import { ResultFeedback } from '@/components/codegym/ResultFeedback';
import { SessionHeader } from '@/components/codegym/SessionHeader';
import { useSession } from '@/hooks/useSession';
import { useContent } from '@/hooks/useContent';
import { useAuth } from '@/features/auth/AuthContext';
import { browserLearningApi } from '@/features/learning/learning-api';
import {
  canEnterLearningSession,
} from '@/features/learning/session-learning-kind';
import type { UserAnswer } from '@/types/progress';
import type { ExerciseSession } from '@/types/exercise';
import { CodeReadingStep } from './steps/CodeReadingStep';
import { FindErrorStep } from './steps/FindErrorStep';
import { PredictOutputStep } from './steps/PredictOutputStep';
import { CodingWorkspace } from './workspace/CodingWorkspace';
import { SessionCompleteCelebration } from './components/feedback/SessionCompleteCelebration';
import { useSuccessCelebration } from './components/feedback/useSuccessCelebration';
import { SessionRecoveryDialog } from './components/SessionRecoveryDialog';

import { Skeleton } from '@/components/codegym/Skeleton';
/**
 * Página de una sesión de ejercicios (§18, D004).
 *
 * Solo orquesta la interfaz: el estado vive en el reducer y la validación en el
 * engine, ambos detrás de `useSession`. No duplica lógica de negocio ni conoce
 * repositorios.
 *
 * Tipos de paso disponibles: los cuatro de §7. Los tres que se resuelven
 * eligiendo —code-reading (T026), predict-output (T031) y find-error (T032)—
 * se comprueban aquí mismo; fix-code usa un preview funcional público mediante
 * «Ejecutar» y conserva «Comprobar» como verificación autoritativa del backend.
 *
 * Quién decide que una respuesta está completa es `useSession` con
 * `canSubmit`: find-error necesita sus dos mitades (D014) y esa regla es de
 * la sesión, no de la página.
 */

const BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

type SessionEntryAccessState =
  | {
      readonly sessionId:
        null;
      readonly status:
        'idle';
    }
  | {
      readonly sessionId:
        string;
      readonly status:
        'checking'
        | 'allowed'
        | 'blocked'
        | 'error';
    };

function SessionPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const { getTechnology } = useContent();
  const {
    accessToken,
  } = useAuth();
  const {
    session,
    currentStep,
    state,
    isLoading,
    selectedOptionId,
    selectedError,
    fixCodeDraft,
    canSubmit,
    isAnswered,
    isLastStep,
    executionError,
    executionStatus,
    previewStatus,
    previewError,
    verificationFeedback,
    isCompleting,
    completionError,
    hintError,
    isRevealingHint,
    recoveryStatus,
    recoverySessionId,
    recoverySnapshot,
    storageWarning,
    select,
    selectError,
    editCode,
    executePreview,
    revealHint,
    submit,
    next,
    continueRecovery,
    startNewSession,
    retryRecoveryPersistence,
    retryCompletion,
  } = useSession(sessionId);

  const [
    entryAccess,
    setEntryAccess,
  ] = useState<SessionEntryAccessState>({
    sessionId:
      null,
    status:
      'idle',
  });

  // SESSION_ENTRY_CANONICAL_GATE
  useEffect(
    () => {
      if (
        session === null
        || session.levelId
          === undefined
      ) {
        return;
      }

      const levelId =
        session.levelId;

      let active =
        true;

      setEntryAccess({
        sessionId:
          session.id,
        status:
          'checking',
      });

      const verifyAccess =
        async () => {
          if (
            accessToken
            === null
          ) {
            if (active) {
              setEntryAccess({
                sessionId:
                  session.id,
                status:
                  'error',
              });
            }

            return;
          }

          try {
            const levelState =
              await browserLearningApi
                .getLevelState(
                  session.conceptId,
                  levelId,
                  accessToken,
                );

            if (!active) {
              return;
            }

            setEntryAccess({
              sessionId:
                session.id,
              status:
                canEnterLearningSession(
                  session,
                  levelState,
                )
                  ? 'allowed'
                  : 'blocked',
            });
          } catch {
            if (active) {
              setEntryAccess({
                sessionId:
                  session.id,
                status:
                  'error',
              });
            }
          }
        };

      void verifyAccess();

      return () => {
        active =
          false;
      };
    },
    [
      accessToken,
      session?.conceptId,
      session?.id,
      session?.kind,
      session?.levelId,
      session?.requiredForProgression,
    ],
  );

  const isValidating = state.isValidating;
  // El resultado ya lo calculó el engine al responder (D012): aquí solo se lee.
  const answer = state.answers[state.currentStep];
  const successEventId = answer?.isCorrect && currentStep !== null
    ? `${sessionId}:${answer.stepId}:${state.startTime}`
    : null;
  const celebration = useSuccessCelebration(successEventId);

  if (recoveryStatus === 'available' && recoverySnapshot !== null) {
    return (
      <SessionRecoveryDialog
        snapshot={recoverySnapshot}
        onContinue={() => {
          const target = recoverySessionId;
          continueRecovery();
          if (target !== null && target !== sessionId) {
            navigate(`/practice/${target}`, { replace: true });
          }
        }}
        onRestart={startNewSession}
        onClose={(destination) => navigate(destination)}
      />
    );
  }

  if (recoveryStatus === 'invalid-json') {
    return (
      <section
        role="alert"
        className="mx-auto flex max-w-lg flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-6"
      >
        <h1 className="text-xl font-semibold text-foreground">
          No se pudo leer la sesión guardada
        </h1>
        <p className="text-sm text-muted-foreground">
          El recovery contiene JSON inválido y no puede restaurarse de forma segura.
        </p>
      </section>
    );
  }

  if (recoveryStatus === 'recovery-failed') {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="No se pudo recuperar"
        description="La sesión guardada no es compatible con el contenido actual."
        action={
          <button
            type="button"
            onClick={startNewSession}
            className={`${BUTTON} bg-primary text-primary-foreground hover:bg-primary/90`}
          >
            Empezar de nuevo
          </button>
        }
      />
    );
  }

  if (state.error !== null) {
    return (
      <EmptyState
        title="No hemos encontrado esta sesión"
        description={state.error}
        action={
          <Link to="/" className={`${BUTTON} bg-primary text-primary-foreground hover:bg-primary/90`}>
            Volver al inicio
          </Link>
        }
      />
    );
  }

  if (isLoading || session === null) {
    return <SessionLoading />;
  }

  if (
    session.levelId
    !== undefined
  ) {
    const currentAccess =
      entryAccess.sessionId
        === session.id
        ? entryAccess
        : null;

    if (
      currentAccess === null
      || currentAccess.status
        === 'checking'
    ) {
      return (
        <section
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="
            mx-auto
            w-full
            max-w-2xl
            rounded-2xl
            border
            border-border
            bg-card
            p-6
            text-center
            text-sm
            text-muted-foreground
            shadow-sm
          "
        >
          Verificando acceso a la sesión…
        </section>
      );
    }

    if (
      currentAccess.status
      === 'blocked'
    ) {
      return (
        <EmptyState
          icon={TriangleAlert}
          title="Sesión bloqueada"
          description="Esta sesión todavía no está disponible según tu progreso actual."
          action={
            <Link
              to={`/tech/${session.technologyId}`}
              className={`${BUTTON} bg-primary text-primary-foreground hover:bg-primary/90`}
            >
              Volver al recorrido
            </Link>
          }
        />
      );
    }

    if (
      currentAccess.status
      === 'error'
    ) {
      return (
        <EmptyState
          icon={TriangleAlert}
          title="No pudimos verificar el acceso"
          description="No abriremos esta sesión hasta confirmar su estado de aprendizaje."
          action={
            <Link
              to={`/tech/${session.technologyId}`}
              className={`${BUTTON} bg-primary text-primary-foreground hover:bg-primary/90`}
            >
              Volver al recorrido
            </Link>
          }
        />
      );
    }
  }

  if (state.isComplete) {
    if (
      session.kind === 'quiz'
      || session.kind === 'practice'
    ) {
      return (
        <StageComplete
          session={session}
          correct={state.answers.filter(
            answer => answer.isCorrect,
          ).length}
          total={state.answers.length}
        />
      );
    }

    if (
      session.kind === 'checkpoint'
      && session.levelId !== undefined
    ) {
      return (
        <CheckpointComplete
          session={session}
          answers={state.answers}
        />
      );
    }

    return (
      <SessionCompleteCelebration
        session={session}
        answers={state.answers}
      />
    );
  }

  const technology = getTechnology(session.technologyId)?.name ?? session.technologyId;

  return (
    <section className="relative flex min-w-0 flex-col gap-5 sm:gap-6">
      <SessionHeader
        title={session.title}
        concept={session.conceptId}
        technology={technology}
        difficulty={session.difficulty}
        totalSteps={session.steps.length}
        currentStep={state.currentStep}
        completedSteps={state.answers.length}
      />

      {storageWarning !== null && (
        <StorageWarning
          warning={storageWarning}
          onRetry={retryRecoveryPersistence}
        />
      )}

      <ExerciseCard state={isAnswered ? 'answered' : 'default'} className="min-w-0 rounded-2xl border-border bg-card shadow-sm">
        <div className="flex flex-col gap-6">
          {currentStep === null ? (
            <p role="status" className="text-sm text-muted-foreground">
              Este paso no existe en la sesión.
            </p>
          ) : currentStep.type === 'code-reading' ? (
            <CodeReadingStep
              step={currentStep}
              value={selectedOptionId}
              onChange={select}
              disabled={isAnswered}
                isCorrect={answer?.isCorrect}
            />
          ) : currentStep.type === 'predict-output' ? (
            <PredictOutputStep
              step={currentStep}
              value={selectedOptionId}
              onChange={select}
              disabled={isAnswered}
                isCorrect={answer?.isCorrect}
            />
          ) : currentStep.type === 'find-error' ? (
            <FindErrorStep
              step={currentStep}
              value={selectedError}
              onChange={selectError}
              disabled={isAnswered}
              isCorrect={answer?.isCorrect}
            />
          ) : currentStep.type === 'fix-code' ? (
            <CodingWorkspace
              sessionTitle={session.title}
              step={currentStep}
              value={fixCodeDraft}
              onChange={editCode}
              disabled={isAnswered}
              isChecking={isValidating}
              canExecute={canSubmit}
              canCheck={canSubmit}
              previewStatus={previewStatus}
              previewError={previewError}
              checkStatus={executionStatus}
              checkError={executionError}
              revealedHints={state.revealedHints}
              isRevealingHint={isRevealingHint}
              onExecute={executePreview}
              onCheck={submit}
              onRevealHint={revealHint}
            />
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              Los pasos de tipo «{currentStep.type}» todavía no están disponibles.
            </p>
          )}

          {currentStep !== null && currentStep.type !== 'fix-code' && (
            <HintReveal
              totalHints={currentStep.hintCount}
              revealedHints={state.revealedHints}
              onReveal={revealHint}
              disabled={isAnswered}
              isRevealing={isRevealingHint}
            />
          )}

          {hintError !== null && (
            <p
              role="alert"
              className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
            >
              No se pudo mostrar la pista: {hintError}. Puedes volver a intentarlo.
            </p>
          )}

          {executionError !== null && currentStep?.type !== 'fix-code' && (
            <p
              role="alert"
              className="flex min-w-0 items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
            >
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
              <span className="min-w-0">
                No se pudo ejecutar tu código: {executionError}. Puedes volver a
                intentarlo.
              </span>
            </p>
          )}

          {answer !== undefined && currentStep !== null && (
            <ResultFeedback
              isCorrect={answer.isCorrect}
              explanation={
                answer.isCorrect
                  ? 'El servidor confirmó que tu respuesta es correcta.'
                  : currentStep.type === 'fix-code'
                    && verificationFeedback.length > 0
                    ? verificationFeedback.join(' ')
                    : 'El servidor comprobó la respuesta y todavía necesita corrección.'
              }
              successMessage={answer.isCorrect ? celebration?.message : undefined}
              successEventId={answer.isCorrect ? celebration?.eventId ?? null : null}
            />
          )}

          <div aria-label="Acciones de la sesión" className="flex flex-wrap gap-3 rounded-2xl border border-border bg-background/30 p-4">
            {currentStep?.type !== 'fix-code' && (
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit || isAnswered || isValidating}
                aria-busy={isValidating}
                className={`${BUTTON} bg-primary text-primary-foreground hover:bg-primary/90`}
              >
                {isValidating ? 'Ejecutando…' : executionError !== null ? 'Reintentar' : 'Comprobar'}
              </button>
            )}

            <button
              type="button"
              onClick={next}
              disabled={!isAnswered || isCompleting}
              aria-busy={isCompleting}
              className={`${BUTTON} border border-border bg-card text-foreground hover:bg-accent`}
            >
              {isCompleting ? 'Guardando…' : isLastStep ? 'Terminar sesión' : 'Siguiente paso'}
            </button>
          </div>

          {completionError !== null && isLastStep && isAnswered && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
              <span>No se pudo guardar la finalización: {completionError}</span>
              <button type="button" onClick={retryCompletion} className={`${BUTTON} border border-border bg-card text-foreground hover:bg-accent`}>Reintentar</button>
            </div>
          )}
        </div>
      </ExerciseCard>
    </section>
  );
}

type CheckpointResolution =
  | {
      readonly status:
        'checking';
    }
  | {
      readonly status:
        'retry';
    }
  | {
      readonly status:
        'level-complete';
    }
  | {
      readonly status:
        'concept-complete';
    }
  | {
      readonly status:
        'verification-error';
    };

function CheckpointComplete({
  session,
  answers,
}: {
  readonly session:
    ExerciseSession;

  readonly answers:
    UserAnswer[];
}) {
  const {
    accessToken,
  } = useAuth();

  const {
    getConcept,
  } = useContent();

  const [
    destination,
    setDestination,
  ] = useState(
    `/tech/${session.technologyId}`,
  );

  const [
    resolution,
    setResolution,
  ] =
    useState<CheckpointResolution>({
      status:
        'checking',
    });

  useEffect(
    () => {
      let active =
        true;

      void Promise
        .resolve(
          getConcept(
            session.conceptId,
          ),
        )
        .then(
          concept => {
            if (
              !active
              || concept === null
            ) {
              return;
            }

            setDestination(
              `/tech/${session.technologyId}/${concept.topicId}`,
            );
          },
        )
        .catch(
          () => {
            // El fallback de tecnología sigue siendo navegable.
          },
        );

      return () => {
        active =
          false;
      };
    },
    [
      getConcept,
      session.conceptId,
      session.technologyId,
    ],
  );

  useEffect(
    () => {
      let active =
        true;

      const resolveCompletion =
        async () => {
          if (
            accessToken === null
            || session.levelId
              === undefined
          ) {
            if (active) {
              setResolution({
                status:
                  'verification-error',
              });
            }

            return;
          }

          try {
            const levelState =
              await browserLearningApi
                .getLevelState(
                  session.conceptId,
                  session.levelId,
                  accessToken,
                );

            if (!active) {
              return;
            }

            if (
              !levelState.completed
            ) {
              setResolution({
                status:
                  'retry',
              });

              return;
            }

            if (
              levelState.nextLevelId
              !== null
            ) {
              setResolution({
                status:
                  'level-complete',
              });

              return;
            }

            const conceptState =
              await browserLearningApi
                .getConceptState(
                  session.conceptId,
                  accessToken,
                );

            if (!active) {
              return;
            }

            setResolution(
              conceptState.completed
                ? {
                    status:
                      'concept-complete',
                  }
                : {
                    status:
                      'verification-error',
                  },
            );
          } catch {
            if (active) {
              setResolution({
                status:
                  'verification-error',
              });
            }
          }
        };

      void resolveCompletion();

      return () => {
        active =
          false;
      };
    },
    [
      accessToken,
      session.conceptId,
      session.levelId,
    ],
  );

  if (
    resolution.status
    === 'checking'
  ) {
    return (
      <section
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="
          mx-auto
          flex
          w-full
          max-w-2xl
          flex-col
          items-center
          rounded-2xl
          border
          border-border
          bg-card
          p-6
          text-center
          text-sm
          text-muted-foreground
          shadow-sm
          sm:p-10
        "
      >
        Verificando el progreso del checkpoint…
      </section>
    );
  }

  if (
    resolution.status
    === 'concept-complete'
  ) {
    return (
      <SessionCompleteCelebration
        session={session}
        answers={answers}
      />
    );
  }

  const isLevelComplete =
    resolution.status
    === 'level-complete';

  const needsRetry =
    resolution.status
    === 'retry';

  return (
    <section
      aria-labelledby="checkpoint-complete-title"
      className="
        mx-auto
        flex
        w-full
        max-w-2xl
        flex-col
        items-center
        rounded-2xl
        border
        border-success/30
        bg-card
        p-6
        text-center
        shadow-sm
        sm:p-10
      "
    >
      <span
        className="
          flex
          size-14
          items-center
          justify-center
          rounded-full
          bg-success/10
          text-success
        "
      >
        <CheckCircle2
          aria-hidden="true"
          className="size-7"
        />
      </span>

      <p
        className="
          mt-5
          text-sm
          font-semibold
          text-success
        "
      >
        {
          isLevelComplete
            ? 'Nivel completado'
            : needsRetry
              ? 'Checkpoint completado'
              : 'Progreso guardado'
        }
      </p>

      <h1
        id="checkpoint-complete-title"
        className="
          mt-2
          text-2xl
          font-bold
          text-foreground
          sm:text-3xl
        "
      >
        {
          isLevelComplete
            ? 'Has desbloqueado el siguiente nivel'
            : needsRetry
              ? 'Aún no has superado este nivel'
              : 'No pudimos verificar el siguiente paso'
        }
      </h1>

      <p
        className="
          mt-3
          max-w-lg
          text-sm
          leading-relaxed
          text-muted-foreground
        "
      >
        {
          isLevelComplete
            ? (
              'Has superado correctamente el checkpoint. '
              + 'Continúa el recorrido para seguir aprendiendo.'
            )
            : needsRetry
              ? (
                'El intento quedó guardado, pero este nivel '
                + 'todavía no está completado. Vuelve al '
                + 'recorrido para intentarlo de nuevo.'
              )
              : (
                'La sesión quedó finalizada, pero todavía no '
                + 'podemos confirmar si el concepto está '
                + 'completado. Vuelve al recorrido para '
                + 'continuar desde el estado autoritativo.'
              )
        }
      </p>

      <Link
        to={destination}
        className={`
          ${BUTTON}
          mt-7
          bg-primary
          text-primary-foreground
          hover:bg-primary/90
        `}
      >
        Volver al recorrido
      </Link>
    </section>
  );
}

function StageComplete({
  session,
  correct,
  total,
}: {
  readonly session: {
    readonly id: string;
    readonly title: string;
    readonly conceptId: string;
    readonly technologyId: string;
    readonly kind?: 'quiz' | 'practice' | 'checkpoint';
  };
  readonly correct: number;
  readonly total: number;
}) {
  const {
    getConcept,
  } = useContent();

  const [
    destination,
    setDestination,
  ] = useState(
    `/tech/${session.technologyId}`,
  );

  useEffect(() => {
    let active = true;

    void Promise
      .resolve(
        getConcept(
          session.conceptId,
        ),
      )
      .then(concept => {
        if (
          !active
          || concept === null
        ) {
          return;
        }

        setDestination(
          `/tech/${session.technologyId}/${concept.topicId}`,
        );
      })
      .catch(() => {
        // El fallback de tecnología sigue siendo navegable.
      });

    return () => {
      active = false;
    };
  }, [
    getConcept,
    session.conceptId,
    session.technologyId,
  ]);

  const isQuiz =
    session.kind === 'quiz';

  return (
    <section
      aria-labelledby="stage-complete-title"
      className="
        mx-auto
        flex
        w-full
        max-w-2xl
        flex-col
        items-center
        rounded-2xl
        border
        border-success/30
        bg-card
        p-6
        text-center
        shadow-sm
        sm:p-10
      "
    >
      <span
        className="
          flex
          size-14
          items-center
          justify-center
          rounded-full
          bg-success/10
          text-success
        "
      >
        <CheckCircle2
          aria-hidden="true"
          className="size-7"
        />
      </span>

      <p
        className="
          mt-5
          text-sm
          font-semibold
          text-success
        "
      >
        {
          isQuiz
            ? 'Test superado'
            : 'Práctica completada'
        }
      </p>

      <h1
        id="stage-complete-title"
        className="
          mt-2
          text-2xl
          font-bold
          text-foreground
          sm:text-3xl
        "
      >
        {
          isQuiz
            ? 'Has desbloqueado la práctica'
            : 'Progreso guardado'
        }
      </h1>

      <p
        className="
          mt-3
          max-w-lg
          text-sm
          leading-relaxed
          text-muted-foreground
        "
      >
        Has completado {
          correct
        } de {
          total
        } ejercicios correctamente en {
          session.title
        }.
      </p>

      <Link
        to={destination}
        className={`
          ${BUTTON}
          mt-7
          bg-primary
          text-primary-foreground
          hover:bg-primary/90
        `}
      >
        {
          isQuiz
            ? 'Continuar a práctica'
            : 'Continuar recorrido'
        }
      </Link>
    </section>
  );
}

function SessionLoading() {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-labelledby="session-loading-title"
      className="relative flex min-w-0 flex-col gap-5 sm:gap-6"
    >
      <h1 id="session-loading-title" className="sr-only">
        Cargando la sesión…
      </h1>

      <div aria-hidden="true" className="contents">
        <header className="min-w-0 rounded-2xl border border-border bg-card/70 p-4 shadow-sm sm:p-6">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-56 max-w-full" />
              <Skeleton className="mt-2 h-7 w-80 max-w-full" />
            </div>

            <Skeleton className="h-7 w-24 rounded-full" />
          </div>

          <div className="mt-5 flex items-center gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton
                key={index}
                className="h-1.5 flex-1 rounded-full"
              />
            ))}
          </div>

          <div className="mt-3 flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </header>

        <div className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="space-y-3">
            <Skeleton className="h-6 w-4/5 max-w-2xl" />
            <Skeleton className="h-4 w-full max-w-3xl" />
            <Skeleton className="h-4 w-3/4 max-w-2xl" />
          </div>

          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-background/30 p-3"
              >
                <Skeleton className="size-5 shrink-0 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-border bg-background/30 p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
          </div>

          <div className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-border bg-background/30 p-4">
            <Skeleton className="h-11 w-28 rounded-md" />
            <Skeleton className="h-11 w-32 rounded-md" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default SessionPage;

function StorageWarning({
  warning,
  onRetry,
}: {
  warning: { message: string; canRetry: boolean };
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground"
    >
      <span className="flex min-w-0 items-start gap-2">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
        <span>{warning.message}</span>
      </span>
      {warning.canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`${BUTTON} border border-border bg-card text-foreground hover:bg-accent`}
        >
          Reintentar guardado
        </button>
      )}
    </div>
  );
}
