import { useContext, useEffect, useMemo, useState, type ContextType } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, ListChecks, LockKeyhole, PlayCircle, RotateCcw, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DifficultyBadge } from '@/components/codegym/DifficultyBadge';
import { SessionRecoveryContext } from '@/contexts/session-recovery-context';
import { useHistory } from '@/hooks/useHistory';
import type { Concept } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { CompletedSession, ConceptProgress } from '@/types/progress';

export type TopicSessionResult =
  | { status: 'success'; sessions: ExerciseSession[] }
  | { status: 'error'; message: string };

export type SessionStatus =
  | 'completed'
  | 'in-progress'
  | 'available'
  | 'locked';

type ResolvedSessionState =
  | { status: 'checking' }
  | { status: 'error'; message: string }
  | {
    status: 'ready';
    sessionStatus: SessionStatus;
    completedSession: CompletedSession | null;
    currentStep: number | null;
  };

type CompletionLookup =
  | { status: 'checking' }
  | { status: 'error'; message: string }
  | { status: 'ready'; completedSession: CompletedSession | null };

type RecoveryState =
  | { status: 'checking' }
  | { status: 'ready'; sessionId: string | null; currentStep: number | null }
  | { status: 'error'; message: string };

const CHECKING_SESSION_STATE: ResolvedSessionState = { status: 'checking' };

interface TopicSessionListProps {
  concepts: Concept[];
  results: Readonly<Record<string, TopicSessionResult>>;
  progress: ReadonlyMap<string, ConceptProgress>;
}

export function TopicSessionList({ concepts, results, progress }: TopicSessionListProps) {
  const recoveryStore = useContext(SessionRecoveryContext);
  const recovery = useRecoveryState(recoveryStore);
  const { getCompletedSession } = useHistory();
  const sessions = useMemo(
    () => concepts.flatMap((concept) => {
      const result = results[concept.id];
      return result?.status === 'success' ? result.sessions : [];
    }),
    [concepts, results],
  );
  const [completions, setCompletions] = useState<ReadonlyMap<string, CompletionLookup>>(new Map());

  useEffect(() => {
    let active = true;

    void Promise.all(sessions.map(async (session): Promise<readonly [string, CompletionLookup]> => {
      try {
        const completedSession = await getCompletedSession(session.id);
        return [session.id, { status: 'ready', completedSession }];
      } catch (error: unknown) {
        return [session.id, {
          status: 'error',
          message: error instanceof Error ? error.message : 'No se pudo leer el historial de esta sesión.',
        }];
      }
    })).then((entries) => {
      if (active) setCompletions(new Map(entries));
    });

    return () => { active = false; };
  }, [getCompletedSession, sessions]);

  const sessionStates = useMemo(
    () => new Map(sessions.map((session) => [
      session.id,
      resolveSessionState(session, completions.get(session.id) ?? CHECKING_SESSION_STATE, recovery),
    ])),
    [completions, recovery, sessions],
  );

  return (
    <section
      aria-labelledby="practice-heading"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary" aria-hidden="true">
          <ListChecks className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Práctica</p>
          <h2 id="practice-heading" className="mt-1 text-xl font-bold tracking-tight text-foreground">
            Sesiones disponibles
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Aplica lo que acabas de repasar en ejercicios guiados.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {concepts.map((concept) => (
          <ConceptSessions
            key={concept.id}
            concept={concept}
            result={results[concept.id]}
            progress={progress.get(concept.id)}
            sessionStates={sessionStates}
          />
        ))}
      </div>

      {sessions.length > 0 ? <PracticeProgress sessions={sessions} states={sessionStates} /> : null}
    </section>
  );
}

function ConceptSessions({
  concept,
  result,
  progress,
  sessionStates,
}: {
  concept: Concept;
  result: TopicSessionResult | undefined;
  progress: ConceptProgress | undefined;
  sessionStates: ReadonlyMap<string, ResolvedSessionState>;
}) {
  return (
    <section aria-labelledby={`sessions-${concept.id}`} className="border-t border-border pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p id={`sessions-${concept.id}`} className="text-sm font-semibold text-foreground">
          {concept.name}
        </p>
        {progress !== undefined && progress.totalAttempts > 0 ? (
          <p className="text-xs text-muted-foreground">{progress.totalAttempts} {progress.totalAttempts === 1 ? 'intento' : 'intentos'}</p>
        ) : null}
      </div>

      {result === undefined ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">Cargando sesiones…</p>
      ) : result.status === 'error' ? (
        <p role="alert" className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          No pudimos cargar las sesiones. {result.message}
        </p>
      ) : result.sessions.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">No hay sesiones disponibles todavía.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {result.sessions.map((session) => (
            <TopicSessionCard
              key={session.id}
              session={session}
              state={sessionStates.get(session.id) ?? CHECKING_SESSION_STATE}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TopicSessionCard({ session, state }: { session: ExerciseSession; state: ResolvedSessionState }) {
  const stepLabel = session.steps.length === 1 ? 'ejercicio' : 'ejercicios';
  const hasAction = state.status !== 'checking' && !(state.status === 'ready' && state.sessionStatus === 'locked');
  const inProgress = state.status === 'ready' && state.sessionStatus === 'in-progress';
  const recoveredProgress = inProgress && state.currentStep !== null && session.steps.length > 0
    ? `${Math.min(state.currentStep + 1, session.steps.length)}/${session.steps.length} ${stepLabel}`
    : null;

  return (
    <li>
      <article className={cardClassName(state)}>
        <div className={`grid gap-4 ${hasAction ? 'xl:grid-cols-[minmax(0,1fr)_13rem] xl:items-center xl:gap-5' : ''}`}>
          <div className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-start gap-3">
            <SessionStatusIcon state={state} />
            <div className="min-w-0 flex-1">
              <h3 className="min-w-0 break-normal whitespace-normal text-xl font-semibold leading-tight text-foreground">{session.title}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SessionStatusBadge state={state} />
                <DifficultyBadge difficulty={session.difficulty} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span className="whitespace-nowrap">{recoveredProgress ?? `${session.steps.length} ${stepLabel}`}</span>
                {state.status === 'ready' && state.completedSession !== null ? <><span aria-hidden="true">·</span><span className="whitespace-nowrap">{Math.round(state.completedSession.accuracy)}% de aciertos</span></> : null}
              </div>
              {state.status === 'error' ? <p role="alert" className="mt-3 text-sm leading-relaxed text-muted-foreground">No se pudo comprobar el estado: {state.message}</p> : null}
              {state.status === 'ready' && state.sessionStatus === 'locked' ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Esta sesión aún no está publicada.</p> : null}
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
    ? 'border-border bg-background'
    : state.sessionStatus === 'completed'
      ? 'border-success/30 bg-success/5'
      : state.sessionStatus === 'in-progress'
        ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
        : 'border-border bg-background';

  return `rounded-xl border p-4 shadow-sm transition-colors sm:p-5 ${emphasis}`;
}

function resolveSessionState(
  session: ExerciseSession,
  completion: CompletionLookup,
  recovery: RecoveryState,
): ResolvedSessionState {
  if (completion.status === 'checking') return completion;
  if (completion.status === 'error') return completion;
  if (completion.completedSession !== null) {
    return { status: 'ready', sessionStatus: 'completed', completedSession: completion.completedSession, currentStep: null };
  }
  if (recovery.status === 'checking') return recovery;
  if (recovery.status === 'error') return recovery;
  return {
    status: 'ready',
    sessionStatus: session.status === 'published'
      ? recovery.sessionId === session.id ? 'in-progress' : 'available'
      : 'locked',
    completedSession: null,
    currentStep: recovery.sessionId === session.id ? recovery.currentStep : null,
  };
}

function SessionStatusBadge({ state }: { state: ResolvedSessionState }) {
  if (state.status === 'checking') return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />Comprobando estado</span>;
  if (state.status === 'error') return <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"><CircleAlert className="size-3.5" aria-hidden="true" />Estado no disponible</span>;
  if (state.sessionStatus === 'completed') return <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success"><CheckCircle2 className="size-3.5" aria-hidden="true" />Completada</span>;
  if (state.sessionStatus === 'in-progress') return <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"><Clock3 className="size-3.5" aria-hidden="true" />En progreso</span>;
  if (state.sessionStatus === 'locked') return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"><LockKeyhole className="size-3.5" aria-hidden="true" />Bloqueada</span>;
  return <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Disponible</span>;
}

function SessionStatusIcon({ state }: { state: ResolvedSessionState }) {
  const iconClassName = 'size-5';
  const icon = state.status === 'ready' && state.sessionStatus === 'completed'
    ? <CheckCircle2 className={`${iconClassName} text-success`} aria-hidden="true" />
    : state.status === 'ready' && state.sessionStatus === 'locked'
      ? <LockKeyhole className={`${iconClassName} text-muted-foreground`} aria-hidden="true" />
      : state.status === 'error'
        ? <CircleAlert className={`${iconClassName} text-muted-foreground`} aria-hidden="true" />
        : state.status === 'checking'
          ? <Clock3 className={`${iconClassName} text-muted-foreground`} aria-hidden="true" />
          : <PlayCircle className={`${iconClassName} ${state.sessionStatus === 'in-progress' ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />;
  const background = state.status === 'ready' && state.sessionStatus === 'completed'
    ? 'bg-success/15'
    : state.status === 'ready' && state.sessionStatus === 'in-progress'
      ? 'bg-primary/15'
      : 'bg-muted';

  return <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${background}`}>{icon}</span>;
}

function SessionAction({ session, state }: { session: ExerciseSession; state: ResolvedSessionState }) {
  if (state.status === 'checking' || (state.status === 'ready' && state.sessionStatus === 'locked')) return null;
  const completed = state.status === 'ready' && state.sessionStatus === 'completed';
  const inProgress = state.status === 'ready' && state.sessionStatus === 'in-progress';
  const label = completed ? 'Repetir práctica' : inProgress ? 'Continuar práctica' : 'Empezar práctica';
  const Icon = completed ? RotateCcw : ArrowRight;
  return <div className="grid w-full shrink-0 grid-cols-1 gap-2 xl:w-52"><Link to={`/practice/${session.id}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">{label}<Icon className="size-4" aria-hidden="true" /></Link>{completed ? <Link to={`/results/${session.id}`} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">Ver resultado</Link> : null}</div>;
}

function PracticeProgress({ sessions, states }: { sessions: ExerciseSession[]; states: ReadonlyMap<string, ResolvedSessionState> }) {
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
    <aside className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5" aria-busy={resolved !== sessions.length}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary" aria-hidden="true">
          <Target className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground">Completa todas las sesiones</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Pon en práctica lo aprendido y domina este tema.</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Sesiones completadas" aria-valuemin={0} aria-valuemax={sessions.length} aria-valuenow={completed} aria-valuetext={valueText}>
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percentage}%` }} />
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{completed} / {sessions.length}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function useRecoveryState(recoveryStore: ContextType<typeof SessionRecoveryContext>): RecoveryState {
  const [recovery] = useState<RecoveryState>(() => {
    if (recoveryStore === null) return { status: 'ready', sessionId: null, currentStep: null };
    try {
      const snapshot = recoveryStore.load();
      return { status: 'ready', sessionId: snapshot?.sessionId ?? null, currentStep: snapshot?.currentStep ?? null };
    } catch (error: unknown) {
      return { status: 'error', message: error instanceof Error ? error.message : 'No se pudo leer la práctica en curso.' };
    }
  });

  return recovery;
}
