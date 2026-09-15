import { useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Flame,
  Lightbulb,
  ListChecks,
  LockKeyhole,
  PlayCircle,
  RotateCcw,
  Sprout,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Concept } from '@/types/content';
import type { Difficulty, ExerciseSession } from '@/types/exercise';
import {
  CHECKING_SESSION_STATE,
  type ResolvedSessionState,
} from '../session-status';
import { useSessionStates } from '../use-session-states';

export type TopicSessionResult =
  | { status: 'success'; sessions: ExerciseSession[] }
  | { status: 'error'; message: string };

interface TopicSessionListProps {
  concepts: Concept[];
  results: Readonly<Record<string, TopicSessionResult>>;
}

interface SessionWithConcept {
  session: ExerciseSession;
  concept: Concept;
}

interface DifficultyPresentation {
  difficulty: Difficulty;
  label: string;
  icon: LucideIcon;
  sectionClassName: string;
  iconClassName: string;
}

const DIFFICULTY_GROUPS: readonly DifficultyPresentation[] = [
  {
    difficulty: 'beginner',
    label: 'Principiante',
    icon: Sprout,
    sectionClassName: 'border-success/25 bg-success/[0.035]',
    iconClassName: 'bg-success/10 text-success',
  },
  {
    difficulty: 'intermediate',
    label: 'Intermedio',
    icon: Lightbulb,
    sectionClassName: 'border-warning/25 bg-warning/[0.035]',
    iconClassName: 'bg-warning/10 text-warning',
  },
  {
    difficulty: 'advanced',
    label: 'Avanzado',
    icon: Flame,
    sectionClassName: 'border-destructive/25 bg-destructive/[0.035]',
    iconClassName: 'bg-destructive/10 text-destructive',
  },
] as const;

export function TopicSessionList({ concepts, results }: TopicSessionListProps) {
  const sessionsWithConcept = useMemo(
    () => concepts.flatMap((concept) => {
      const result = results[concept.id];
      return result?.status === 'success'
        ? result.sessions.map((session) => ({ session, concept }))
        : [];
    }),
    [concepts, results],
  );
  const sessions = useMemo(
    () => sessionsWithConcept.map(({ session }) => session),
    [sessionsWithConcept],
  );
  const sessionStates = useSessionStates(sessions);
  const showConceptName = concepts.length > 1;
  const loadingConcepts = concepts.filter((concept) => results[concept.id] === undefined);
  const failedConcepts = concepts.filter((concept) => results[concept.id]?.status === 'error');

  return (
    <section
      aria-labelledby="practice-heading"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <ListChecks className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Práctica</p>
          <h2
            id="practice-heading"
            className="mt-1 break-normal whitespace-normal text-xl font-bold tracking-tight text-foreground"
          >
            Sesiones disponibles
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Aplica lo que acabas de repasar en ejercicios guiados.
          </p>
        </div>
      </div>

      {loadingConcepts.length > 0 ? (
        <p role="status" className="mt-5 text-sm text-muted-foreground">Cargando sesiones…</p>
      ) : null}

      {failedConcepts.map((concept) => {
        const result = results[concept.id];
        return result?.status === 'error' ? (
          <p
            key={concept.id}
            role="alert"
            className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            No pudimos cargar las sesiones de {concept.name}. {result.message}
          </p>
        ) : null;
      })}

      {loadingConcepts.length === 0 && failedConcepts.length === 0 && sessions.length === 0 ? (
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          No hay sesiones disponibles todavía.
        </p>
      ) : null}

      <div className="mt-5 space-y-4">
        {DIFFICULTY_GROUPS.map((presentation) => {
          const groupedSessions = sessionsWithConcept.filter(
            ({ session }) => session.difficulty === presentation.difficulty,
          );
          return groupedSessions.length > 0 ? (
            <DifficultyGroup
              key={presentation.difficulty}
              presentation={presentation}
              sessions={groupedSessions}
              sessionStates={sessionStates}
              showConceptName={showConceptName}
            />
          ) : null;
        })}
      </div>

      {sessions.length > 0 ? <PracticeProgress sessions={sessions} states={sessionStates} /> : null}
    </section>
  );
}

function DifficultyGroup({
  presentation,
  sessions,
  sessionStates,
  showConceptName,
}: {
  presentation: DifficultyPresentation;
  sessions: SessionWithConcept[];
  sessionStates: ReadonlyMap<string, ResolvedSessionState>;
  showConceptName: boolean;
}) {
  const Icon = presentation.icon;
  const headingId = `practice-${presentation.difficulty}`;
  const sessionLabel = sessions.length === 1 ? 'sesión' : 'sesiones';

  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-xl border p-3 sm:p-4 ${presentation.sectionClassName}`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${presentation.iconClassName}`}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
        <h3 id={headingId} className="text-sm font-semibold text-foreground">
          {presentation.label} · {sessions.length} {sessionLabel}
        </h3>
      </div>

      <ul className="mt-3 space-y-2.5">
        {sessions.map(({ session, concept }) => (
          <TopicSessionCard
            key={session.id}
            session={session}
            conceptName={showConceptName ? concept.name : null}
            state={sessionStates.get(session.id) ?? CHECKING_SESSION_STATE}
          />
        ))}
      </ul>
    </section>
  );
}

function TopicSessionCard({
  session,
  conceptName,
  state,
}: {
  session: ExerciseSession;
  conceptName: string | null;
  state: ResolvedSessionState;
}) {
  const stepLabel = session.steps.length === 1 ? 'ejercicio' : 'ejercicios';
  const hasAction = state.status !== 'checking'
    && !(state.status === 'ready' && state.sessionStatus === 'locked');
  const inProgress = state.status === 'ready' && state.sessionStatus === 'in-progress';
  const recoveredProgress = inProgress && state.currentStep !== null && session.steps.length > 0
    ? `${Math.min(state.currentStep + 1, session.steps.length)}/${session.steps.length} ${stepLabel}`
    : null;

  return (
    <li>
      <article className={cardClassName(state)}>
        <div className={`grid min-w-0 gap-3 ${hasAction ? 'sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center' : ''}`}>
          <div className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-3">
            <SessionStatusIcon state={state} />
            <div className="min-w-0">
              <h4 className="min-w-0 break-normal whitespace-normal text-base font-semibold leading-snug text-foreground">
                {session.title}
              </h4>
              {conceptName !== null ? (
                <p className="mt-1 break-normal whitespace-normal text-xs leading-relaxed text-muted-foreground">
                  {conceptName}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <SessionStatusBadge state={state} />
                <span className="text-xs text-muted-foreground">
                  {recoveredProgress ?? `${session.steps.length} ${stepLabel}`}
                </span>
                {state.status === 'ready' && state.completedSession !== null ? (
                  <span className="text-xs text-muted-foreground">
                    {Math.round(state.completedSession.accuracy)}% de aciertos
                  </span>
                ) : null}
              </div>
              {state.status === 'error' ? (
                <p role="alert" className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  No se pudo comprobar el estado: {state.message}
                </p>
              ) : null}
              {state.status === 'ready' && state.sessionStatus === 'locked' ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Esta sesión aún no está publicada.
                </p>
              ) : null}
            </div>
          </div>
          <SessionAction session={session} state={state} />
        </div>
      </article>
    </li>
  );
}

function cardClassName(state: ResolvedSessionState): string {
  const emphasis = state.status !== 'ready'
    ? 'border-border bg-card/80'
    : state.sessionStatus === 'completed'
      ? 'border-success/35 bg-success/[0.055]'
      : state.sessionStatus === 'in-progress'
        ? 'border-primary/45 bg-primary/[0.055]'
        : state.sessionStatus === 'locked'
          ? 'border-border/80 bg-background/45'
          : 'border-border bg-card/80';

  return `rounded-xl border p-3.5 shadow-sm transition-colors sm:p-4 ${emphasis}`;
}

function SessionStatusBadge({ state }: { state: ResolvedSessionState }) {
  if (state.status === 'checking') {
    return <StatusBadge icon={Clock3} className="bg-muted text-muted-foreground">Comprobando estado</StatusBadge>;
  }
  if (state.status === 'error') {
    return <StatusBadge icon={CircleAlert} className="border border-border bg-muted text-muted-foreground">Estado no disponible</StatusBadge>;
  }
  if (state.sessionStatus === 'completed') {
    return <StatusBadge icon={CheckCircle2} className="bg-success/10 text-success">Completado</StatusBadge>;
  }
  if (state.sessionStatus === 'in-progress') {
    return <StatusBadge icon={Clock3} className="bg-primary/10 text-primary">En progreso</StatusBadge>;
  }
  if (state.sessionStatus === 'locked') {
    return <StatusBadge icon={LockKeyhole} className="bg-muted text-muted-foreground">Bloqueado</StatusBadge>;
  }
  return <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Disponible</span>;
}

function StatusBadge({
  icon: Icon,
  className,
  children,
}: {
  icon: LucideIcon;
  className: string;
  children: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

function SessionStatusIcon({ state }: { state: ResolvedSessionState }) {
  const icon = state.status === 'ready' && state.sessionStatus === 'completed'
    ? <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
    : state.status === 'ready' && state.sessionStatus === 'locked'
      ? <LockKeyhole className="size-5 text-muted-foreground" aria-hidden="true" />
      : state.status === 'error'
        ? <CircleAlert className="size-5 text-muted-foreground" aria-hidden="true" />
        : state.status === 'checking'
          ? <Clock3 className="size-5 text-muted-foreground" aria-hidden="true" />
          : <PlayCircle className={`size-5 ${state.sessionStatus === 'in-progress' ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />;
  const background = state.status === 'ready' && state.sessionStatus === 'completed'
    ? 'bg-success/15'
    : state.status === 'ready' && state.sessionStatus === 'in-progress'
      ? 'bg-primary/15'
      : 'bg-muted';

  return (
    <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${background}`} aria-hidden="true">
      {icon}
    </span>
  );
}

function SessionAction({ session, state }: { session: ExerciseSession; state: ResolvedSessionState }) {
  if (state.status === 'checking' || (state.status === 'ready' && state.sessionStatus === 'locked')) {
    return null;
  }

  const completed = state.status === 'ready' && state.sessionStatus === 'completed';
  const inProgress = state.status === 'ready' && state.sessionStatus === 'in-progress';
  const label = completed ? 'Repetir' : inProgress ? 'Continuar' : 'Empezar';
  const accessibleLabel = `${label} práctica`;
  const Icon = completed ? RotateCcw : ArrowRight;

  return (
    <div className="grid w-full shrink-0 grid-cols-1 gap-2 sm:w-auto">
      <Link
        to={`/practice/${session.id}`}
        aria-label={accessibleLabel}
        className="inline-flex min-h-11 min-w-28 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {label}
        <Icon className="size-4" aria-hidden="true" />
      </Link>
      {completed ? (
        <Link
          to={`/results/${session.id}`}
          className="inline-flex min-h-11 min-w-28 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Ver resultado
        </Link>
      ) : null}
    </div>
  );
}

function PracticeProgress({
  sessions,
  states,
}: {
  sessions: ExerciseSession[];
  states: ReadonlyMap<string, ResolvedSessionState>;
}) {
  const completed = sessions.filter((session) => {
    const state = states.get(session.id);
    return state?.status === 'ready' && state.sessionStatus === 'completed';
  }).length;
  const resolved = sessions.filter((session) => states.get(session.id)?.status !== 'checking').length;
  const valueText = resolved === sessions.length
    ? `${completed} de ${sessions.length} sesiones completadas`
    : `Comprobando el estado de las sesiones: ${completed} de ${sessions.length} completadas`;
  const percentage = Math.round((completed / sessions.length) * 100);

  return (
    <aside
      className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-4"
      aria-busy={resolved !== sessions.length}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
          aria-hidden="true"
        >
          <Target className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="break-normal whitespace-normal font-semibold text-foreground">
            Completa todas las sesiones
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Pon en práctica lo aprendido y domina este tema.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Sesiones completadas"
              aria-valuemin={0}
              aria-valuemax={sessions.length}
              aria-valuenow={completed}
              aria-valuetext={valueText}
            >
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percentage}%` }} />
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {completed} / {sessions.length}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
