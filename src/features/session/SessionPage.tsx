import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/codegym/EmptyState';
import { HintReveal } from '@/components/codegym/HintReveal';
import { ResultFeedback } from '@/components/codegym/ResultFeedback';
import { StepIndicator } from '@/components/codegym/StepIndicator';
import { useSession } from '@/hooks/useSession';
import { CodeReadingStep } from './steps/CodeReadingStep';
import { FindErrorStep } from './steps/FindErrorStep';
import { PredictOutputStep } from './steps/PredictOutputStep';

/**
 * Página de una sesión de ejercicios (§18, D004).
 *
 * Solo orquesta la interfaz: el estado vive en el reducer y la validación en el
 * engine, ambos detrás de `useSession`. No duplica lógica de negocio ni conoce
 * repositorios.
 *
 * Tipos de paso disponibles: los tres que se resuelven eligiendo y que §24
 * valida sin ejecutar código —code-reading (T026), predict-output (T031) y
 * find-error (T032)—. fix-code llega en T041 y hasta entonces se indica como
 * no disponible en lugar de fingir que funciona.
 *
 * Quién decide que una respuesta está completa es `useSession` con
 * `canSubmit`: find-error necesita sus dos mitades (D014) y esa regla es de
 * la sesión, no de la página.
 */

const BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

function SessionPage() {
  const { sessionId = '' } = useParams();
  const {
    session,
    currentStep,
    state,
    isLoading,
    selectedOptionId,
    selectedError,
    canSubmit,
    isAnswered,
    isLastStep,
    select,
    selectError,
    revealHint,
    submit,
    next,
  } = useSession(sessionId);

  // El resultado ya lo calculó el engine al responder (D012): aquí solo se lee.
  const answer = state.answers[state.currentStep];

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
    return (
      <section>
        <h1 className="text-2xl font-bold text-foreground">Sesión completada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Has respondido los {session.steps.length} pasos de {session.title}.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          {session.title}
        </h1>
        <StepIndicator
          totalSteps={session.steps.length}
          currentStep={state.currentStep}
          completedSteps={state.answers.length}
          className="mt-3"
        />
      </header>

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
        />
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          Los pasos de tipo «{currentStep.type}» todavía no están disponibles.
        </p>
      )}

      {currentStep !== null && (
        <HintReveal
          hints={currentStep.hints}
          revealedCount={state.hintsRevealed.length}
          onReveal={revealHint}
          disabled={isAnswered}
        />
      )}

      {answer !== undefined && currentStep !== null && (
        <ResultFeedback
          isCorrect={answer.isCorrect}
          explanation={currentStep.explanation}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || isAnswered}
          className={`${BUTTON} bg-primary text-primary-foreground hover:bg-primary/90`}
        >
          Comprobar
        </button>

        <button
          type="button"
          onClick={next}
          disabled={!isAnswered}
          className={`${BUTTON} border border-border bg-card text-foreground hover:bg-accent`}
        >
          {isLastStep ? 'Terminar sesión' : 'Siguiente paso'}
        </button>
      </div>
    </section>
  );
}

export default SessionPage;
