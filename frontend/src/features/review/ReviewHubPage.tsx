import { useContext, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Clock3,
  History,
  Play,
  RotateCcw,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/codegym/EmptyState';
import { PageLoadTransition } from '@/components/codegym/PageLoadTransition';
import { Skeleton } from '@/components/codegym/Skeleton';
import { SessionRecoveryContext } from '@/contexts/session-recovery-context';
import { formatDuration } from '@/features/dashboard/components/dashboard-formatters';
import { useSessionRecoveryState } from '@/features/practice/use-session-states';
import { formatRelativeActivity } from '@/features/session/session-recovery-formatters';
import { useContent } from '@/hooks/useContent';
import { useDashboard } from '@/hooks/useDashboard';
import { useHistory } from '@/hooks/useHistory';
import { useProgress } from '@/hooks/useProgress';
import { cn } from '@/lib/utils';
import type {
  ReviewCatalog,
  ReviewConceptItem,
  ReviewHubModel,
  ReviewSessionItem,
} from './review-hub-model';
import { createReviewHubModel, loadReviewCatalog } from './review-hub-model';

type CatalogState =
  | { status: 'loading' }
  | { status: 'success'; catalog: ReviewCatalog }
  | { status: 'error'; message: string };

const PRIMARY_ACTION = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const SECONDARY_ACTION = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background/40 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const PANEL = 'min-w-0 rounded-xl border border-primary/15 bg-card shadow-sm';
const REVIEW_REFERENCE_TIME = Date.now();

function ReviewHubPage() {
  const {
    technologies,
    getTopics,
    getConceptsByTopic,
    getSessionsByConcept,
    isLoading: contentLoading,
  } = useContent();

  const {
    refresh: refreshDashboard,
  } = useDashboard();
  const {
    recentCompletedSessions,
    completedSessionsLoading,
    completedSessionsError,
    getCompletedSession,
  } = useHistory();
  const { progress, isLoading: progressLoading, error: progressError } = useProgress();
  const recovery = useSessionRecoveryState(useContext(SessionRecoveryContext));
  const [catalogState, setCatalogState] = useState<CatalogState>({ status: 'loading' });

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    if (contentLoading) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setCatalogState({ status: 'loading' });
      return loadReviewCatalog({
        technologies,
        getTopics,
        getConceptsByTopic,
        getSessionsByConcept,
        getCompletedSession,
      });
    }).then((catalog) => {
      if (active) setCatalogState({ status: 'success', catalog });
    }).catch((error: unknown) => {
      if (active) {
        setCatalogState({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
    return () => {
      active = false;
    };
  }, [
    contentLoading,
    getCompletedSession,
    getConceptsByTopic,
    getSessionsByConcept,
    getTopics,
    technologies,
  ]);

  const model = useMemo(() => {
    if (catalogState.status !== 'success') return null;
    return createReviewHubModel({
      catalog: catalogState.catalog,
      progress,
      recentCompletedSessions,
      recovery: recovery.status === 'ready' && recovery.sessionId !== null
        ? { sessionId: recovery.sessionId, currentStep: recovery.currentStep ?? 0 }
        : null,
    });
  }, [catalogState, progress, recentCompletedSessions, recovery]);

  const loading = contentLoading || progressLoading || completedSessionsLoading || catalogState.status === 'loading';
  const fatalError = progressError ?? (catalogState.status === 'error' ? catalogState.message : null);

  return (
    <section
      aria-labelledby="review-hub-title"
      className="mx-auto w-full max-w-7xl py-2 sm:py-4"
    >
      <header className="border-b border-border pb-5">
        <h1
          id="review-hub-title"
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Repasar
        </h1>

        <p className="mt-2 text-base text-muted-foreground sm:text-lg">
          Analiza tu rendimiento y refuerza tus puntos débiles.
        </p>
      </header>

      <PageLoadTransition
        loading={loading}
        presentationKey="review"
        ariaLabel="Contenido de Repasar"
        skeleton={<ReviewHubLoading />}
      >
      {fatalError !== null ? (
        <ReviewHubError message={fatalError} />
      ) : model === null
        || catalogState.status !== 'success' ? null : (
      <>
        <ReviewWarnings
        historyError={completedSessionsError}
        recoveryError={recovery.status === 'error' ? recovery.message : null}
        completionErrors={catalogState.catalog.completionErrors}
      />

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div
          data-entry-item
          data-entry-index="0"
          className="min-w-0"
        >
          <AccuracyDiagnostic overview={model.overview} />
        </div>

        <div
          data-entry-item
          data-entry-index="1"
          className="min-w-0"
        >
          <WeakConceptsDiagnostic concepts={model.reviewConcepts} />
        </div>
      </div>

        {!model.hasActivity ? (
          <div
            data-entry-item
            data-entry-index="2"
          >
            <ReviewEmptyState />
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div
              data-entry-item
              data-entry-index="2"
            >
              <ConceptReviewSection
                concepts={model.reviewConcepts}
                sessions={model.recommendedSessions}
              />
            </div>

            <div
              data-entry-item
              data-entry-index="3"
            >
              <ReviewActivitySection
                activities={model.recentActivity}
              />
            </div>
          </div>
        )}
      </>
      )}
      </PageLoadTransition>
    </section>
  );
}

function ReviewWarnings({
  historyError,
  recoveryError,
  completionErrors,
}: {
  historyError: string | null;
  recoveryError: string | null;
  completionErrors: number;
}) {
  return (
    <>
      {historyError !== null ? (
        <p role="alert" className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          El historial reciente no está disponible ahora: {historyError}
        </p>
      ) : null}
      {recoveryError !== null ? (
        <p role="alert" className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          No pudimos comprobar si hay una práctica en curso: {recoveryError}
        </p>
      ) : null}
      {completionErrors > 0 ? (
        <p role="status" className="mt-4 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
          Algunas sesiones no pudieron contrastarse con el historial; el diagnóstico sigue usando únicamente datos confirmados.
        </p>
      ) : null}
    </>
  );
}

function AccuracyDiagnostic({ overview }: { overview: ReviewHubModel['overview'] }) {
  const hasDiagnostic = overview.evidenceLevel === 'sufficient' && overview.accuracy !== undefined;
  const message = hasDiagnostic
    ? getAccuracyMessage(overview.accuracy ?? 0)
    : 'Practica algunas sesiones para generar un diagnóstico.';

  return (
    <section aria-labelledby="general-accuracy-title" className={cn(PANEL, 'p-5 sm:p-6')}>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BarChart3 className="size-5" />
        </span>
        <div>
          <h2 id="general-accuracy-title" className="text-lg font-bold text-foreground">Precisión general</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Respuestas registradas en tus conceptos</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
        {hasDiagnostic ? (
          <div
            role="progressbar"
            aria-label="Precisión general"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overview.accuracy}
            className="grid size-36 shrink-0 place-items-center rounded-full p-3"
            style={{
              background: `conic-gradient(hsl(var(--primary)) ${(overview.accuracy ?? 0) * 3.6}deg, hsl(var(--muted)) 0deg)`,
            }}
          >
            <div className="grid size-full place-items-center rounded-full border border-border bg-card">
              <strong className="text-3xl font-bold tabular-nums text-foreground">{overview.accuracy}%</strong>
            </div>
          </div>
        ) : (
          <div role="img" aria-label="Precisión general todavía no disponible" className="grid size-36 shrink-0 place-items-center rounded-full border-[12px] border-muted">
            <strong className="text-3xl font-bold text-muted-foreground">—</strong>
          </div>
        )}
        <div className="max-w-xs text-center sm:text-left">
          <p className="font-semibold text-foreground">{message}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {overview.completedSessions > 0
                ? `${overview.completedSessions} ${overview.completedSessions === 1 ? 'práctica completada' : 'prácticas completadas'}.`
                : 'Tu diagnóstico aparecerá después de empezar a practicar.'}
          </p>
        </div>
      </div>
    </section>
  );
}

function WeakConceptsDiagnostic({ concepts }: { concepts: ReviewConceptItem[] }) {
  const visibleConcepts = concepts.slice(0, 5);
  return (
    <section aria-labelledby="weak-concepts-title" className={cn(PANEL, 'p-5 sm:p-6')}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="size-5" />
          </span>
          <div>
            <h2 id="weak-concepts-title" className="text-lg font-bold text-foreground">Conceptos más débiles</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Según tu prioridad real de repaso</p>
          </div>
        </div>
        {concepts.length > visibleConcepts.length ? (
          <a href="#review-concepts-title" className="inline-flex min-h-11 shrink-0 items-center gap-1 self-end text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto">
            Ver todos <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        ) : null}
      </div>

      {visibleConcepts.length === 0 ? (
        <div className="mt-7 rounded-lg border border-dashed border-border px-4 py-7 text-center">
          <p className="text-2xl font-bold text-muted-foreground">—</p>
          <p className="mt-2 text-sm text-muted-foreground">Aún no hay conceptos con evidencia para comparar.</p>
        </div>
      ) : (
        <ol className="mt-5 space-y-4">
          {visibleConcepts.map((item) => {
            const hasEvidence = item.evidenceLevel === 'sufficient';
            return (
              <li key={item.concept.id}>
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.concept.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.technology.name} · {item.topic.name}</p>
                  </div>
                  <span className={cn('shrink-0 text-sm font-bold tabular-nums', hasEvidence ? accuracyTextTone(item.accuracy) : 'text-muted-foreground')}>
                    {hasEvidence ? `${item.accuracy}%` : '—'}
                  </span>
                </div>
                {hasEvidence ? (
                  <div
                    role="progressbar"
                    aria-label={`Precisión de ${item.concept.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.accuracy}
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <span className={cn('block h-full rounded-full', accuracyBarTone(item.accuracy))} style={{ width: `${item.accuracy}%` }} />
                  </div>
                ) : (
                  <div className="mt-2 h-1.5 rounded-full bg-muted" aria-label={`${item.concept.name}: evidencia inicial`} />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function ConceptReviewSection({
  concepts,
  sessions,
}: {
  concepts: ReviewConceptItem[];
  sessions: ReviewSessionItem[];
}) {
  const conceptsWithoutSession = concepts.filter(
    ({ concept }) => !sessions.some((session) => session.concept.id === concept.id),
  );

  return (
    <section aria-labelledby="review-concepts-title" className={cn(PANEL, 'p-5 sm:p-6')}>
      <SectionHeader
        id="review-concepts-title"
        icon={BrainCircuit}
        title="Conceptos a reforzar"
        description="Acciones concretas basadas en tu progreso y tus sesiones disponibles."
      />

      {concepts.length === 0 && sessions.length === 0 ? (
        <p className="mt-5 rounded-lg border border-success/20 bg-success/5 p-4 text-sm leading-relaxed text-muted-foreground">
          Tus conceptos con evidencia suficiente no muestran señales de refuerzo prioritario.
        </p>
      ) : (
        <ul className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {sessions.map((session) => (
            <ConceptReviewCard
              key={session.session.id}
              concept={concepts.find(({ concept }) => concept.id === session.concept.id) ?? null}
              session={session}
            />
          ))}
          {conceptsWithoutSession.map((concept) => (
            <ConceptReviewCard key={concept.concept.id} concept={concept} session={null} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ConceptReviewCard({
  concept,
  session,
}: {
  concept: ReviewConceptItem | null;
  session: ReviewSessionItem | null;
}) {
  const accuracy = concept?.accuracy ?? session?.conceptAccuracy;
  const conceptName = concept?.concept.name ?? session?.concept.name ?? '';
  const technology = concept?.technology ?? session?.technology;
  const topic = concept?.topic ?? session?.topic;
  const action = getConceptAction(session);
  const href = session === null
    ? `/tech/${technology?.id}/${topic?.id}`
    : `/practice/${session.session.id}`;

  return (
    <li className="min-w-0">
      <article className="flex h-full min-w-0 flex-col rounded-lg border border-border bg-background/35 p-4 transition-colors hover:border-primary/30">
        <div className="flex items-start justify-between gap-3">
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpenCheck className="size-4.5" />
          </span>
          <strong className={cn('text-lg tabular-nums', accuracy === undefined ? 'text-muted-foreground' : accuracyTextTone(accuracy))}>
            {accuracy === undefined ? '—' : `${accuracy}%`}
          </strong>
        </div>
        <h3 className="mt-4 text-sm font-bold leading-snug text-foreground">{conceptName}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {session?.session.title ?? `${technology?.name} · ${topic?.name}`}
        </p>
        {accuracy === undefined ? (
          <div className="mt-4 h-1.5 rounded-full bg-muted" aria-label={`${conceptName}: precisión no disponible`} />
        ) : (
          <div role="progressbar" aria-label={`Precisión de ${conceptName} en la tarjeta de repaso`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={accuracy} className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <span className={cn('block h-full rounded-full', accuracyBarTone(accuracy))} style={{ width: `${accuracy}%` }} />
          </div>
        )}
        <div className="mt-auto pt-4">
          {session !== null ? <SessionStatus session={session} /> : null}
          <Link to={href} className="mt-3 inline-flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {action} <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </article>
    </li>
  );
}

function SessionStatus({ session }: { session: ReviewSessionItem }) {
  const Icon = session.status === 'in-progress' ? Play : session.status === 'completed' ? BookOpenCheck : RotateCcw;
  const label = session.status === 'in-progress' ? 'En progreso' : session.status === 'completed' ? 'Completada' : 'Pendiente';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon aria-hidden="true" className="size-3.5 text-primary" /> {label}
      {session.status === 'in-progress' && session.currentStep !== null
        ? ` · Paso ${session.currentStep + 1} de ${session.session.steps.length}`
        : null}
    </span>
  );
}

function ReviewActivitySection({ activities }: { activities: ReviewHubModel['recentActivity'] }) {
  return (
    <section aria-labelledby="review-activity-title" className={cn(PANEL, 'p-5 sm:p-6')}>
      <SectionHeader
        id="review-activity-title"
        icon={History}
        title="Últimos repasos"
        description="Tus resultados recientes disponibles para volver a consultar."
      />
      {activities.length === 0 ? (
        <p className="mt-5 rounded-lg border border-border bg-background/35 p-4 text-sm text-muted-foreground">Aún no hay resultados recientes para revisar.</p>
      ) : (
        <ul className="mt-5 divide-y divide-border">
          {activities.map(({ session, concept, completedSession }) => (
            <li key={completedSession.id} className="grid min-w-0 gap-4 py-4 first:pt-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BookOpenCheck className="size-5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{session.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {concept.name} · <time dateTime={completedSession.completedAt}>{formatRelativeActivity(new Date(completedSession.completedAt).getTime(), REVIEW_REFERENCE_TIME)}</time>
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 aria-hidden="true" className="size-3.5" /> {formatDuration(completedSession.timeSpentMs)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <strong className={cn('text-lg tabular-nums', accuracyTextTone(completedSession.accuracy))}>{Math.round(completedSession.accuracy)}%</strong>
                <Link to={`/review/${session.id}`} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Abrir repaso</Link>
                <Link to={`/results/${session.id}`} className={SECONDARY_ACTION}>Ver resultado</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SectionHeader({
  id,
  icon: Icon,
  title,
  description,
}: {
  id: string;
  icon: typeof Target;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ReviewEmptyState() {
  return (
    <section aria-labelledby="review-empty-title" className="mt-5">
      <h2 id="review-empty-title" className="sr-only">Diagnóstico pendiente</h2>
      <EmptyState
        title="Todavía no hay suficiente actividad para generar un repaso personalizado."
        description="Completa algunas prácticas y usaremos tus resultados para señalar qué conviene reforzar."
        action={<Link to="/tech" className={PRIMARY_ACTION}>Ir a entrenar <ArrowRight aria-hidden="true" className="size-4" /></Link>}
        className={cn(PANEL, 'max-w-none py-10')}
      />
    </section>
  );
}

function ReviewHubLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      aria-label="Cargando contenido de Repasar"
    >
      <div
        aria-hidden="true"
        className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
      >
        <section className={cn(PANEL, 'p-5 sm:p-6')}>
          <LoadingSectionHeader />

          <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
            <Skeleton className="size-36 shrink-0 rounded-full" />

            <div className="w-full max-w-xs">
              <Skeleton className="h-5 w-44 max-w-full" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
            </div>
          </div>
        </section>

        <section className={cn(PANEL, 'p-5 sm:p-6')}>
          <LoadingSectionHeader />

          <ol className="mt-5 space-y-4">
            {Array.from({ length: 5 }, (_, index) => (
              <li key={index}>
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-44 max-w-full" />
                    <Skeleton className="mt-1 h-3 w-32 max-w-full" />
                  </div>

                  <Skeleton className="h-5 w-10 shrink-0" />
                </div>

                <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div
        aria-hidden="true"
        className="mt-5 space-y-5"
      >
        <section className={cn(PANEL, 'p-5 sm:p-6')}>
          <LoadingSectionHeader />

          <ul className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <li
                key={index}
                className="min-w-0"
              >
                <article className="flex h-full min-w-0 flex-col rounded-lg border border-border bg-background/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Skeleton className="size-9 shrink-0 rounded-lg" />
                    <Skeleton className="h-6 w-12" />
                  </div>

                  <Skeleton className="mt-4 h-4 w-4/5" />

                  <div className="mt-2 space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>

                  <Skeleton className="mt-4 h-1.5 w-full rounded-full" />

                  <div className="mt-auto pt-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-3 min-h-11 w-full rounded-lg" />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>

        <section className={cn(PANEL, 'p-5 sm:p-6')}>
          <LoadingSectionHeader />

          <ul className="mt-5 divide-y divide-border">
            {Array.from({ length: 3 }, (_, index) => (
              <li
                key={index}
                className="grid min-w-0 gap-4 py-4 first:pt-0 last:pb-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
              >
                <Skeleton className="size-10 shrink-0 rounded-lg" />

                <div className="min-w-0">
                  <Skeleton className="h-5 w-52 max-w-full" />
                  <Skeleton className="mt-2 h-4 w-44 max-w-full" />
                  <Skeleton className="mt-2 h-3 w-20" />
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-11 w-24 rounded-lg" />
                  <Skeleton className="h-11 w-28 rounded-lg" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function LoadingSectionHeader() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="size-10 shrink-0 rounded-lg" />

      <div className="min-w-0 flex-1">
        <Skeleton className="h-6 w-44 max-w-full" />
        <Skeleton className="mt-1 h-4 w-72 max-w-full" />
      </div>
    </div>
  );
}

function ReviewHubError({ message }: { message: string }) {
  return (
    <section aria-labelledby="review-hub-error-title" className="mx-auto w-full max-w-2xl py-8 sm:py-12">
      <h1 id="review-hub-error-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">No pudimos preparar el repaso</h1>
      <p role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{message}</p>
      <Link to="/tech" className={cn(PRIMARY_ACTION, 'mt-6')}>Ir a entrenar</Link>
    </section>
  );
}

function getConceptAction(session: ReviewSessionItem | null): string {
  if (session === null) return 'Ir al tema';
  if (session.status === 'in-progress') return 'Continuar';
  if (session.status === 'completed') return 'Repetir';
  return 'Practicar';
}

function getAccuracyMessage(accuracy: number): string {
  if (accuracy >= 80) return 'Muy buen dominio';
  if (accuracy >= 60) return 'Vas por buen camino';
  if (accuracy >= 40) return 'Conviene reforzar algunos temas';
  return 'Hay conceptos que necesitan repaso';
}

function accuracyTextTone(accuracy: number): string {
  if (accuracy < 40) return 'text-destructive';
  if (accuracy < 60) return 'text-warning';
  if (accuracy < 80) return 'text-primary';
  return 'text-success';
}

function accuracyBarTone(accuracy: number): string {
  if (accuracy < 40) return 'bg-destructive';
  if (accuracy < 60) return 'bg-warning';
  if (accuracy < 80) return 'bg-primary';
  return 'bg-success';
}

export default ReviewHubPage;
