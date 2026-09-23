import { useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Code2,
  LockKeyhole,
  PlayCircle,
  RotateCcw,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { DifficultyBadge } from '@/components/codegym/DifficultyBadge';
import { EmptyState } from '@/components/codegym/EmptyState';
import { SessionRecoveryContext } from '@/contexts/session-recovery-context';
import type { ExerciseSession } from '@/types/exercise';
import {
  resolveSessionState,
  type ResolvedSessionState,
  type SessionStatus,
} from '../session-status';
import type { TechnologySessionItem } from '../technology-page-model';
import { useSessionRecoveryState } from '../use-session-states';

type ExerciseFilter = 'all' | 'in-progress' | 'completed' | 'pending';

const EXERCISES_PER_PAGE = 8;

const FILTERS: Array<{ id: ExerciseFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'in-progress', label: 'En progreso' },
  { id: 'completed', label: 'Completados' },
  { id: 'pending', label: 'Pendientes' },
];

interface TechnologyExerciseListProps {
  technologyName: string;
  sessions: TechnologySessionItem[];
}

export function TechnologyExerciseList({
  technologyName,
  sessions,
}: TechnologyExerciseListProps) {
  const [filter, setFilter] = useState<ExerciseFilter>('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const recoveryStore = useContext(SessionRecoveryContext);
  const recovery = useSessionRecoveryState(recoveryStore);
  const entries = useMemo(
    () => sessions.map((item) => ({
      ...item,
      state: resolveSessionState(item.session, item.completion, recovery),
    })),
    [recovery, sessions],
  );
  const visibleEntries = entries.filter(({ state }) => matchesFilter(state, filter));
  const totalPages = Math.max(1, Math.ceil(visibleEntries.length / EXERCISES_PER_PAGE));
  const requestedPage = parsePage(searchParams.get('page'));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * EXERCISES_PER_PAGE;
  const pageEntries = visibleEntries.slice(pageStart, pageStart + EXERCISES_PER_PAGE);
  const groups = groupByTopic(pageEntries);

  useEffect(() => {
    const rawPage = searchParams.get('page');
    if (rawPage === null || (requestedPage === currentPage && rawPage === String(currentPage))) return;

    const nextParams = new URLSearchParams(searchParams);
    if (currentPage === 1) nextParams.delete('page');
    else nextParams.set('page', String(currentPage));
    setSearchParams(nextParams, { replace: true });
  }, [currentPage, requestedPage, searchParams, setSearchParams]);

  function changePage(page: number, replace = false) {
    const nextParams = new URLSearchParams(searchParams);
    if (page === 1) nextParams.delete('page');
    else nextParams.set('page', String(page));
    setSearchParams(nextParams, { replace });
  }

  function changeFilter(nextFilter: ExerciseFilter) {
    setFilter(nextFilter);
    changePage(1, true);
  }

  return (
    <section aria-labelledby="exercises-heading" className="mt-3 sm:mt-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Práctica
            </p>
            <h2 id="exercises-heading" className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Ejercicios de {technologyName}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Sesiones publicadas, organizadas por tema y concepto.
            </p>
          </div>

          <div role="group" aria-label="Filtrar ejercicios" className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => changeFilter(id)}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  filter === id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon={Code2}
          title="Todavía no hay ejercicios publicados"
          description={`Los ejercicios de ${technologyName} aparecerán aquí cuando estén disponibles.`}
          className="mt-4 rounded-2xl border border-border bg-card"
        />
      ) : visibleEntries.length === 0 ? (
        <EmptyState
          icon={Code2}
          title={emptyFilterTitle(filter)}
          description="Prueba otro filtro para ver las sesiones disponibles."
          className="mt-4 rounded-2xl border border-border bg-card"
        />
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map(({ topicId, topicName, entries: topicEntries }) => (
            <section key={topicId} aria-labelledby={`exercise-topic-${topicId}`} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <h3 id={`exercise-topic-${topicId}`} className="text-lg font-bold text-foreground">
                {topicName}
              </h3>
              <ul className="mt-3 space-y-3">
                {topicEntries.map((entry) => (
                  <ExerciseRow key={entry.session.id} entry={entry} />
                ))}
              </ul>
            </section>
          ))}

          {visibleEntries.length > EXERCISES_PER_PAGE ? (
            <ExercisePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={visibleEntries.length}
              pageStart={pageStart}
              pageSize={pageEntries.length}
              onPageChange={changePage}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}

function parsePage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function ExercisePagination({
  currentPage,
  totalPages,
  totalItems,
  pageStart,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageStart: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Paginación de ejercicios"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <p className="text-center text-sm text-muted-foreground sm:text-left" aria-live="polite">
        Mostrando <span className="font-semibold text-foreground">{pageStart + 1}–{pageStart + pageSize}</span> de{' '}
        <span className="font-semibold text-foreground">{totalItems}</span> ejercicios
      </p>

      <div className="flex items-center justify-center gap-2">
        <PaginationButton
          label="Página anterior"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </PaginationButton>

        <div className="hidden items-center gap-2 xl:flex">
          {Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1;
            return (
              <button
                key={page}
                type="button"
                aria-label={`Ir a la página ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
                onClick={() => onPageChange(page)}
                className={`flex size-11 items-center justify-center rounded-xl border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  page === currentPage
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <span className="flex min-h-11 min-w-16 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 px-3 text-sm font-semibold text-primary xl:hidden">
          {currentPage} / {totalPages}
        </span>

        <PaginationButton
          label="Página siguiente"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </PaginationButton>
      </div>
    </nav>
  );
}

function PaginationButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

type ResolvedEntry = TechnologySessionItem & { state: ResolvedSessionState };

function groupByTopic(entries: ResolvedEntry[]) {
  const groups = new Map<string, { topicId: string; topicName: string; entries: ResolvedEntry[] }>();
  for (const entry of entries) {
    const group = groups.get(entry.topic.id);
    if (group === undefined) {
      groups.set(entry.topic.id, {
        topicId: entry.topic.id,
        topicName: entry.topic.name,
        entries: [entry],
      });
    } else {
      group.entries.push(entry);
    }
  }
  return [...groups.values()];
}

function matchesFilter(state: ResolvedSessionState, filter: ExerciseFilter): boolean {
  if (filter === 'all') return true;
  if (state.status !== 'ready') return false;
  if (filter === 'pending') {
    return state.sessionStatus === 'available' || state.sessionStatus === 'locked';
  }
  return state.sessionStatus === filter;
}

function emptyFilterTitle(filter: ExerciseFilter): string {
  if (filter === 'completed') return 'No hay ejercicios completados todavía';
  if (filter === 'in-progress') return 'No hay ejercicios en progreso';
  if (filter === 'pending') return 'No hay ejercicios pendientes';
  return 'No hay ejercicios con este estado';
}

function ExerciseRow({ entry }: { entry: ResolvedEntry }) {
  const { concept, session, state } = entry;
  const recoveredProgress = state.status === 'ready' &&
    state.sessionStatus === 'in-progress' &&
    state.currentStep !== null &&
    session.steps.length > 0
    ? `${Math.min(state.currentStep + 1, session.steps.length)}/${session.steps.length} ejercicios`
    : null;

  return (
    <li>
      <article className={`rounded-xl border p-4 sm:p-5 ${cardTone(state)}`}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-3">
            <StatusIcon state={state} />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {concept.name}
              </p>
              <h4 className="mt-1 whitespace-normal text-base font-semibold leading-snug text-foreground sm:text-lg">
                {session.title}
              </h4>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge state={state} />
                <DifficultyBadge difficulty={session.difficulty} />
                <span className="text-sm text-muted-foreground">
                  {recoveredProgress ?? `${session.steps.length} ${session.steps.length === 1 ? 'ejercicio' : 'ejercicios'}`}
                </span>
                {state.status === 'ready' && state.completedSession !== null ? (
                  <span className="text-sm text-muted-foreground">
                    {Math.round(state.completedSession.accuracy)}% de aciertos
                  </span>
                ) : null}
              </div>
              {state.status === 'error' ? (
                <p role="alert" className="mt-3 text-sm text-muted-foreground">
                  No se pudo comprobar el estado: {state.message}
                </p>
              ) : null}
            </div>
          </div>
          <SessionActions session={session} state={state} />
        </div>
      </article>
    </li>
  );
}

function cardTone(state: ResolvedSessionState): string {
  if (state.status !== 'ready') return 'border-border bg-background';
  if (state.sessionStatus === 'completed') return 'border-success/30 bg-success/5';
  if (state.sessionStatus === 'in-progress') return 'border-primary/50 bg-primary/5 ring-1 ring-primary/20';
  return 'border-border bg-background';
}

function StatusIcon({ state }: { state: ResolvedSessionState }) {
  const status = state.status === 'ready' ? state.sessionStatus : null;
  const Icon = status === 'completed'
    ? CheckCircle2
    : status === 'locked'
      ? LockKeyhole
      : state.status === 'error'
        ? CircleAlert
        : status === 'in-progress' || status === 'available'
          ? PlayCircle
          : Clock3;
  return (
    <span aria-hidden="true" className={`flex size-11 items-center justify-center rounded-full ${
      status === 'completed' ? 'bg-success/15 text-success' : status === 'in-progress' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
    }`}>
      <Icon className="size-5" />
    </span>
  );
}

function StatusBadge({ state }: { state: ResolvedSessionState }) {
  if (state.status === 'checking') return <Badge icon={Clock3} label="Comprobando estado" />;
  if (state.status === 'error') return <Badge icon={CircleAlert} label="Estado no disponible" />;
  const values: Record<SessionStatus, { label: string; icon?: typeof Clock3; className?: string }> = {
    completed: { label: 'Completado', icon: CheckCircle2, className: 'border-success/30 bg-success/10 text-success' },
    'in-progress': { label: 'En progreso', icon: Clock3, className: 'border-primary/30 bg-primary/10 text-primary' },
    available: { label: 'Disponible' },
    locked: { label: 'Bloqueado', icon: LockKeyhole },
  };
  return <Badge {...values[state.sessionStatus]} />;
}

function Badge({ label, icon: Icon, className = 'border-border bg-muted text-muted-foreground' }: { label: string; icon?: typeof Clock3; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {Icon === undefined ? null : <Icon className="size-3.5" aria-hidden="true" />}
      {label}
    </span>
  );
}

function SessionActions({ session, state }: { session: ExerciseSession; state: ResolvedSessionState }) {
  if (state.status === 'checking' || (state.status === 'ready' && state.sessionStatus === 'locked')) return null;
  if (state.status === 'error') return null;
  const completed = state.sessionStatus === 'completed';
  const inProgress = state.sessionStatus === 'in-progress';
  const label = completed ? 'Repetir' : inProgress ? 'Continuar' : 'Empezar práctica';
  const Icon = completed ? RotateCcw : ArrowRight;

  return (
    <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-1 xl:grid-cols-2">
      <Link to={`/practice/${session.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {label}<Icon className="size-4" aria-hidden="true" />
      </Link>
      {completed ? (
        <Link to={`/results/${session.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Ver resultado
        </Link>
      ) : null}
    </div>
  );
}
