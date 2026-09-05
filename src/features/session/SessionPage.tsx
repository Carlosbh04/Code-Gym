import { useRef } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/codegym/EmptyState';
import { ExerciseCard } from '@/components/codegym/ExerciseCard';
import { HintReveal } from '@/components/codegym/HintReveal';
import { ResultFeedback } from '@/components/codegym/ResultFeedback';
import { SessionHeader } from '@/components/codegym/SessionHeader';
import { useSession } from '@/hooks/useSession';
import { useContent } from '@/hooks/useContent';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { CodeReadingStep } from './steps/CodeReadingStep';
import { FindErrorStep } from './steps/FindErrorStep';
import { PredictOutputStep } from './steps/PredictOutputStep';
import { CodingWorkspace } from './workspace/CodingWorkspace';
import { SessionCompleteCelebration } from './components/feedback/SessionCompleteCelebration';
import { useSuccessCelebration } from './components/feedback/useSuccessCelebration';

/**
 * Página de una sesión de ejercicios (§18, D004).
 *
 * Solo orquesta la interfaz: el estado vive en el reducer y la validación en el
 * engine, ambos detrás de `useSession`. No duplica lógica de negocio ni conoce
 * repositorios.
 *
 * Tipos de paso disponibles: los cuatro de §7. Los tres que se resuelven
 * eligiendo —code-reading (T026), predict-output (T031) y find-error (T032)—
 * se comprueban aquí mismo; fix-code (T041) se puede editar, pero comprobarlo
 * exige ejecutar en el Worker y esa integración es T042, así que su botón
 * sigue deshabilitado.
 *
 * Quién decide que una respuesta está completa es `useSession` con
 * `canSubmit`: find-error necesita sus dos mitades (D014) y esa regla es de
 * la sesión, no de la página.
 */

const BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

function SessionPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const { getTechnology } = useContent();
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
    executionResult,
    executionStatus,
    isCompleting,
    completionError,
    recoveryStatus,
    recoverySessionId,
    storageWarning,
    select,
    selectError,
    editCode,
    revealHint,
    submit,
    execute,
    next,
    continueRecovery,
    startNewSession,
    retryRecoveryPersistence,
    retryCompletion,
  } = useSession(sessionId);

  const isValidating = state.isValidating;
  const recoveryDialogRef = useRef<HTMLElement>(null);

  useDialogFocus(recoveryStatus === 'available', recoveryDialogRef);

  // El resultado ya lo calculó el engine al responder (D012): aquí solo se lee.
  const answer = state.answers[state.currentStep];
  const successEventId = answer?.isCorrect && currentStep !== null
    ? `${sessionId}:${answer.stepId}:${state.startTime}`
    : null;
  const celebration = useSuccessCelebration(successEventId);

  if (recoveryStatus === 'available') {
    return (
      <section
        ref={recoveryDialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-title"
        aria-describedby="recovery-description"
        className="mx-auto flex max-w-lg flex-col gap-4 rounded-lg border border-border bg-card p-6"
      >
        <div className="space-y-2">
          <h1 id="recovery-title" className="text-xl font-semibold text-foreground">
            Tienes una sesión incompleta
          </h1>
          <p id="recovery-description" className="text-sm text-muted-foreground">
            Puedes continuar donde lo dejaste o descartar esa sesión y empezar
            una nueva.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              const target = recoverySessionId;
              continueRecovery();
              if (target !== null && target !== sessionId) {
                navigate(`/practice/${target}`, { replace: true });
              }
            }}
            className={`${BUTTON} bg-primary text-primary-foreground hover:bg-primary/90`}
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={startNewSession}
            className={`${BUTTON} border border-border bg-card text-foreground hover:bg-accent`}
          >
            Empezar de nuevo
          </button>
        </div>
      </section>
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
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Cargando la sesión…
      </p>
    );
  }

  if (state.isComplete) {
    return <SessionCompleteCelebration session={session} answers={state.answers} />;
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
            />
          ) : currentStep.type === 'predict-output' ? (
            <PredictOutputStep
              step={currentStep}
              value={selectedOptionId}
              onChange={select}
              disabled={isAnswered}
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
              isRunning={isValidating}
              canRun={canSubmit}
              status={executionStatus}
              result={executionResult}
              error={executionError}
              hintsRevealed={state.hintsRevealed.length}
              onRun={execute}
              onCheck={submit}
              onRevealHint={revealHint}
              successEventId={answer?.isCorrect ? celebration?.eventId ?? null : null}
            />
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              Los pasos de tipo «{currentStep.type}» todavía no están disponibles.
            </p>
          )}

          {currentStep !== null && currentStep.type !== 'fix-code' && (
            <HintReveal
              hints={currentStep.hints}
              revealedCount={state.hintsRevealed.length}
              onReveal={revealHint}
              disabled={isAnswered}
            />
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
              explanation={currentStep.explanation}
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
