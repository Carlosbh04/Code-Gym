import { ArrowRight, BookCheck, PlayCircle, RotateCcw, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { NextPractice } from '../technology-page-model';

interface TechnologyProgressSummaryProps {
  technologyName: string;
  completedConcepts: number;
  totalConcepts: number;
  completionErrors?: number;
  nextPractice: NextPractice | null;
}

export function TechnologyProgressSummary({
  technologyName,
  completedConcepts,
  totalConcepts,
  completionErrors = 0,
  nextPractice,
}: TechnologyProgressSummaryProps) {
  const completionAvailable = completionErrors === 0;
  const percentage = totalConcepts === 0
    ? 0
    : Math.round((completedConcepts / totalConcepts) * 100);
  const progressText = completionAvailable
    ? `${completedConcepts} de ${totalConcepts} ${totalConcepts === 1 ? 'concepto completado' : 'conceptos completados'}`
    : `Progreso incompleto: no se pudo comprobar ${completionErrors} ${completionErrors === 1 ? 'sesión' : 'sesiones'}`;

  return (
    <section
      aria-label={`Resumen de progreso en ${technologyName}`}
      className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:mt-7"
    >
      <div className="grid md:grid-cols-2 xl:grid-cols-[1.1fr_0.72fr_1.25fr]">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Target className="size-4" aria-hidden="true" />
            Tu progreso
          </div>
          <div className="mt-4 flex items-end justify-between gap-4">
            <p className="text-4xl font-bold tracking-tight text-foreground">{completionAvailable ? `${percentage}%` : '—'}</p>
            <p className="text-right text-sm text-muted-foreground">{progressText}</p>
          </div>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={`Progreso total en ${technologyName}`}
            aria-valuemin={0}
            aria-valuemax={Math.max(totalConcepts, 1)}
            aria-valuenow={completionAvailable ? completedConcepts : undefined}
            aria-valuetext={progressText}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-slow ease-standard"
              style={{ width: `${completionAvailable ? percentage : 0}%` }}
            />
          </div>
        </div>

        <div className="border-t border-border p-5 sm:p-6 md:border-l md:border-t-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <BookCheck className="size-4 text-primary" aria-hidden="true" />
            Conceptos completados
          </div>
          <p className="mt-5 text-3xl font-bold tracking-tight text-foreground">
            {completionAvailable ? completedConcepts : '—'}{' '}
            <span className="text-lg font-semibold text-muted-foreground">/ {totalConcepts}</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Sesiones publicadas superadas por concepto.
          </p>
        </div>

        <div className="border-t border-border p-5 sm:p-6 md:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {nextPractice?.isRepeat ? (
              <RotateCcw className="size-4 text-primary" aria-hidden="true" />
            ) : (
              <PlayCircle className="size-4 text-primary" aria-hidden="true" />
            )}
            Siguiente práctica
          </div>

          {nextPractice === null ? (
            <div className="mt-4">
              <p className="font-semibold text-foreground">Sin sesiones publicadas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Explora los temas y conceptos disponibles.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="whitespace-normal break-normal font-semibold leading-snug text-foreground">
                  {nextPractice.session.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {nextPractice.session.steps.length}{' '}
                  {nextPractice.session.steps.length === 1 ? 'ejercicio' : 'ejercicios'}
                </p>
              </div>
              <Link
                to={`/practice/${nextPractice.session.id}`}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {nextPractice.isRepeat ? 'Repetir' : 'Continuar'}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
