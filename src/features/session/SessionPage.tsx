import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/codegym/EmptyState';
import { useSession } from '@/hooks/useSession';
import { CodeReadingStep } from './steps/CodeReadingStep';

/**
 * Página de una sesión de ejercicios (§18, D004).
 *
 * Solo orquesta la interfaz: el estado vive en el reducer y la validación en el
 * engine, ambos detrás de `useSession`. No duplica lógica de negocio ni conoce
 * repositorios.
 *
 * Alcance de T027: únicamente el paso de lectura de código, que es el que
 * existe (T026). Los demás tipos llegan en T031, T032 y T041, y hasta entonces
 * se indican como no disponibles en lugar de fingir que funcionan.
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
    isAnswered,
    isLastStep,
    select,
    submit,
    next,
  } = useSession(sessionId);

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
        <p className="mt-1 text-sm text-muted-foreground">
          Paso {state.currentStep + 1} de {session.steps.length}
        </p>
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
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          Los pasos de tipo «{currentStep.type}» todavía no están disponibles.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={selectedOptionId === null || isAnswered || currentStep?.type !== 'code-reading'}
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
