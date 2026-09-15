import { Link } from 'react-router-dom';

import { CodeBlock } from '@/components/codegym/CodeBlock';

import type {
  ExerciseSession,
  ExerciseStep,
} from '@/types/exercise';

import type {
  DashboardStatus,
} from '../dashboard-view-model';

const CTA_CLASSES: Record<
  DashboardStatus,
  string
> = {
  ok:
    'bg-success text-background hover:bg-success/90',
  attention:
    'bg-warning text-background hover:bg-warning/90',
  improvement:
    'bg-destructive text-background hover:bg-destructive/90',
};

const STEP_LABELS: Record<
  ExerciseStep['type'],
  string
> = {
  'code-reading':
    'Lectura de código',
  'predict-output':
    'Predecir resultado',
  'find-error':
    'Encontrar el error',
  'fix-code':
    'Corregir código',
};

export interface EvidencePieceProps {
  conceptName: string;
  status: DashboardStatus;
  session: ExerciseSession;
  step: ExerciseStep | null;
}

export function EvidencePiece({
  conceptName,
  status,
  session,
  step,
}: EvidencePieceProps) {
  return (
    <section
      aria-labelledby="recommended-practice-title"
      className="border-t border-border pt-8"
    >
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {status === 'ok'
          ? 'Siguiente práctica'
          : 'Práctica recomendada'}
      </p>

      <h2
        id="recommended-practice-title"
        className="mt-2 text-2xl font-bold text-foreground"
      >
        {status === 'ok'
          ? 'Concepto para consolidar'
          : 'Concepto prioritario'}
      </h2>

      <p className="mt-2 text-lg font-semibold text-foreground">
        {conceptName}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
        <span>
          {session.title}
        </span>

        {step ? (
          <>
            <span aria-hidden="true">
              ·
            </span>

            <span>
              Paso {step.stepOrder} ·{' '}
              {STEP_LABELS[step.type]}
            </span>
          </>
        ) : null}
      </div>

      {step?.code ? (
        <div className="mt-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Una muestra real de la práctica
            que encontrarás en esta sesión.
          </p>

          <CodeBlock
            code={step.code}
            language={
              step.language
              ?? 'javascript'
            }
            showLineNumbers
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Esta sesión no necesita una pieza
          de código para comenzar.
        </p>
      )}

      <Link
        to={`/practice/${session.id}`}
        className={`mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto ${CTA_CLASSES[status]}`}
      >
        {status === 'ok'
          ? 'Seguir entrenando'
          : 'Practicar este concepto'}
      </Link>
    </section>
  );
}
