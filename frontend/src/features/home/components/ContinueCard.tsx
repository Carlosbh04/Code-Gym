import {
  ArrowRight,
  CheckCircle2,
  ListChecks,
  Play,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Skeleton } from '@/components/codegym/Skeleton';

import { TechnologyIcon } from '@/components/codegym/TechnologyIcon';
import type { Technology } from '@/types/content';

import type {
  HomeContinueItem,
  HomePrimaryCardState,
} from '../home-types';

interface ContinueCardProps {
  item: HomeContinueItem | null;
  fallbackTechnology: Technology | null;
  isLoading: boolean;
  error: string | null;
  state: HomePrimaryCardState;
  compact?: boolean;
  variant?: 'default' | 'advanced';
}

const sourceLabels: Record<
  HomeContinueItem['source'],
  string
> = {
  recovery: 'Sesión en progreso',
  recommended: 'Recomendado para ti',
  available: 'Próxima práctica',
  repeat: 'Lista para repetir',
};

const cardLabels: Record<
  HomePrimaryCardState,
  string
> = {
  'first-time': 'Empieza a practicar',
  recovery: 'Continúa donde lo dejaste',
  returning: 'Sigue entrenando',
};

export function ContinueCard({
  item,
  fallbackTechnology,
  isLoading,
  error,
  state,
  compact = false,
  variant = 'default',
}: ContinueCardProps) {
  const totalSteps =
    item?.session.steps.length ?? 0;

  const percentage =
    item === null || totalSteps === 0
      ? 0
      : Math.round(
          (
            item.completedSteps
            / totalSteps
          ) * 100,
        );

  const action =
    variant === 'advanced'
      ? 'Continuar práctica'
      : state === 'first-time'
        ? 'Empezar'
        : state === 'recovery'
          ? 'Continuar'
          : 'Practicar';

  const detailLabel =
    state === 'first-time'
      ? 'Tu primera práctica'
      : item === null
        ? null
        : sourceLabels[item.source];

  const showProgress =
    state === 'recovery'
    || item?.state === 'completed';

  const fallbackHref =
    fallbackTechnology === null
      ? '/#technologies'
      : `/tech/${fallbackTechnology.id}`;

  if (variant === 'advanced') {
    const difficultyLabel =
      item?.session.difficulty === 'beginner'
        ? 'Principiante'
        : item?.session.difficulty === 'intermediate'
          ? 'Intermedio'
          : item?.session.difficulty === 'advanced'
            ? 'Avanzado'
            : item?.session.difficulty ?? '';

    return (
      <section
        aria-labelledby={
          isLoading || item === null
            ? 'continue-card-label'
            : 'continue-title'
        }
        className="relative min-w-0 overflow-hidden rounded-xl border border-primary/20 bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--primary)/0.045))] px-4 py-4 shadow-sm sm:px-5 sm:py-4"
      >
        <div className="relative min-w-0">
          <div className="flex min-w-0 items-center">
            <p
              id="continue-card-label"
              className="text-sm font-semibold text-foreground"
            >
              Continúa tu práctica
            </p>
          </div>

          {isLoading ? (
            <div
              role="status"
              aria-live="polite"
              className="mt-4"
            >
              <span className="sr-only">
                Preparando tu próxima práctica…
              </span>

              <div
                aria-hidden="true"
                className="flex min-w-0 items-start gap-3.5"
              >
                <Skeleton className="size-[58px] shrink-0 rounded-xl" />

                <div className="min-w-0 flex-1 pt-0.5">
                  <Skeleton className="h-5 w-2/3 max-w-64" />
                  <Skeleton className="mt-2 h-3 w-1/2 max-w-44" />

                  <div className="mt-3 flex gap-2">
                    <Skeleton className="h-8 w-24 rounded-lg" />
                    <Skeleton className="h-8 w-28 rounded-lg" />
                  </div>
                </div>
              </div>

              <div
                aria-hidden="true"
                className="mt-4 flex items-center gap-3"
              >
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>

              <Skeleton
                aria-hidden="true"
                className="mt-4 h-10 w-40 rounded-lg"
              />
            </div>
          ) : error !== null ? (
            <div className="mt-5">
              <h2
                id="continue-title"
                className="text-base font-bold text-foreground"
              >
                No pudimos preparar tu sesión
              </h2>

              <p
                role="alert"
                className="mt-2 text-sm text-muted-foreground"
              >
                {error}
              </p>
            </div>
          ) : item === null ? (
            <div className="mt-5 flex min-h-[124px] flex-col justify-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Play
                    className="size-5"
                    aria-hidden="true"
                  />
                </span>

                <p className="text-sm text-muted-foreground">
                  Elige una tecnología disponible y comienza a practicar.
                </p>
              </div>

              <Link
                to={fallbackHref}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Explorar tecnologías

                <ArrowRight
                  className="size-4"
                  aria-hidden="true"
                />
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-3 flex min-w-0 items-start gap-3.5">
                <TechnologyIcon
                  technologyId={item.technology.id}
                  technologyName={item.technology.name}
                  fallback={item.technology.icon}
                  className="size-[58px] shrink-0 rounded-xl"
                />

                <div className="min-w-0 flex-1 pt-0.5">
                  <h2
                    id="continue-title"
                    className="truncate text-[17px] font-semibold leading-tight text-foreground sm:text-lg"
                  >
                    {item.session.title}
                  </h2>

                  <p className="mt-1 truncate text-[13px] text-muted-foreground">
                    {item.topic.name}
                    {' · '}
                    {item.concept.name}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-border/60 bg-background/45 px-3 py-1.5 text-xs font-medium text-foreground">
                      <span
                        className="size-2 rounded-full bg-emerald-400"
                        aria-hidden="true"
                      />

                      {difficultyLabel}
                    </span>

                    <span className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-border/60 bg-background/45 px-3 py-1.5 text-xs text-muted-foreground">
                      <ListChecks
                        className="size-3.5"
                        aria-hidden="true"
                      />

                      {state === 'recovery'
                        ? `${item.completedSteps} de ${totalSteps} ${
                            totalSteps === 1
                              ? 'ejercicio'
                              : 'ejercicios'
                          }`
                        : `${totalSteps} ${
                            totalSteps === 1
                              ? 'ejercicio'
                              : 'ejercicios'
                          }`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex min-w-0 items-center gap-3">
                <div
                  className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-primary/15"
                  role="progressbar"
                  aria-label={`Progreso de ${item.session.title}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percentage}
                  aria-valuetext={
                    state === 'recovery'
                      ? `${item.completedSteps} de ${totalSteps} ${
                          totalSteps === 1
                            ? 'ejercicio'
                            : 'ejercicios'
                        }`
                      : `${percentage}%`
                  }
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>

                <span className="w-9 shrink-0 text-right text-xs font-semibold text-foreground">
                  {percentage}%
                </span>
              </div>

              <div className="mt-3.5">
                <Link
                  to={`/practice/${item.session.id}`}
                  className="inline-flex min-h-10 items-center justify-center gap-3 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {item.state === 'completed'
                    && state === 'returning' ? (
                    <CheckCircle2
                      className="size-4"
                      aria-hidden="true"
                    />
                  ) : null}

                  {action}

                  <ArrowRight
                    className="size-4"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={
        isLoading || item === null
          ? 'continue-card-label'
          : 'continue-title'
      }
      className={`relative min-w-0 overflow-hidden rounded-2xl border border-primary/25 bg-card p-5 shadow-sm ${
        compact
          ? 'sm:p-5'
          : 'sm:p-6'
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative">
        <p
          id="continue-card-label"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-primary"
        >
          {isLoading
            ? 'Tu próxima práctica'
            : cardLabels[state]}
        </p>

        {isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-5"
          >
            <span className="sr-only">
              Preparando tu próxima práctica…
            </span>

            <div
              aria-hidden="true"
              className="flex min-w-0 items-start gap-4"
            >
              <Skeleton className="size-12 shrink-0 rounded-xl" />

              <div className="min-w-0 flex-1">
                <Skeleton className="h-6 w-2/3 max-w-72" />
                <Skeleton className="mt-2 h-4 w-1/2 max-w-52" />
                <Skeleton className="mt-4 h-2 w-full rounded-full" />
              </div>
            </div>

            <Skeleton
              aria-hidden="true"
              className="mt-5 h-11 w-40 rounded-xl"
            />
          </div>
        ) : error !== null ? (
          <div className="mt-5">
            <h2
              id="continue-title"
              className="text-xl font-bold text-foreground"
            >
              No pudimos preparar tu sesión
            </h2>

            <p
              role="alert"
              className="mt-2 text-sm text-muted-foreground"
            >
              {error}
            </p>
          </div>
        ) : item === null ? (
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <Play
                  className="size-5"
                  aria-hidden="true"
                />
              </span>

              <p className="text-sm leading-relaxed text-muted-foreground">
                Elige una tecnología disponible y comienza a construir tu progreso.
              </p>
            </div>

            <Link
              to={fallbackHref}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Explorar tecnologías
              <ArrowRight
                className="size-4"
                aria-hidden="true"
              />
            </Link>
          </div>
        ) : (
          <>
            <div
              className={`${
                compact
                  ? 'mt-4'
                  : 'mt-5'
              } flex min-w-0 items-start gap-4`}
            >
              <TechnologyIcon
                technologyId={
                  item.technology.id
                }
                technologyName={
                  item.technology.name
                }
                fallback={
                  item.technology.icon
                }
                className="size-12 rounded-xl border-primary/25"
              />

              <div className="min-w-0 flex-1">
                {detailLabel === null ? null : (
                  <p className="text-xs font-semibold text-primary">
                    {detailLabel}
                  </p>
                )}

                <h2
                  id="continue-title"
                  className={`${
                    detailLabel === null
                      ? ''
                      : 'mt-1'
                  } break-words text-xl font-bold tracking-tight text-foreground sm:text-2xl`}
                >
                  {item.session.title}
                </h2>

                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.technology.name}
                  {' · '}
                  {item.topic.name}
                  {' · '}
                  {item.concept.name}
                </p>
              </div>
            </div>

            <div
              className={`${
                compact
                  ? 'mt-4'
                  : 'mt-5'
              } grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end`}
            >
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    {state === 'recovery'
                      ? `${item.completedSteps} de `
                      : ''}
                    {state === 'recovery'
                      || variant === 'default'
                      ? `${totalSteps} ${
                          totalSteps === 1
                            ? 'ejercicio'
                            : 'ejercicios'
                        }`
                      : ''}
                  </span>

                  {showProgress ? (
                    <span className="font-semibold text-foreground">
                      {percentage}%
                    </span>
                  ) : null}
                </div>

                {showProgress ? (
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label={`Progreso de ${item.session.title}`}
                    aria-valuemin={0}
                    aria-valuemax={
                      totalSteps
                    }
                    aria-valuenow={
                      item.completedSteps
                    }
                    aria-valuetext={`${item.completedSteps} de ${totalSteps} ejercicios`}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width:
                          `${percentage}%`,
                      }}
                    />
                  </div>
                ) : null}
              </div>

              <Link
                to={`/practice/${item.session.id}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {item.state === 'completed'
                  && state
                    === 'returning' ? (
                  <CheckCircle2
                    className="size-4"
                    aria-hidden="true"
                  />
                ) : null}

                {action}

                <ArrowRight
                  className="size-4"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
