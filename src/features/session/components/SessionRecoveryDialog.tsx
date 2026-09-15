import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Clock3, RotateCcw, X } from 'lucide-react';

import { TechnologyIcon } from '@/components/codegym/TechnologyIcon';
import { useContent } from '@/hooks/useContent';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import type { SessionRecoverySnapshot } from '@/lib/recovery/ISessionRecoveryStore';
import type { Concept, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import { formatRelativeActivity } from '../session-recovery-formatters';

const REFRESH_INTERVAL_MS = 60_000;

interface RecoveryDetails {
  session: ExerciseSession;
  concept: Concept | null;
  topic: Topic | null;
  technology: Technology | undefined;
}

type RecoveryDetailsState =
  | { status: 'loading' }
  | { status: 'success'; details: RecoveryDetails }
  | { status: 'error' };

interface SessionRecoveryDialogProps {
  snapshot: SessionRecoverySnapshot;
  onContinue: () => void;
  onRestart: () => void;
  onClose: (destination: string) => void;
}

export function SessionRecoveryDialog({
  snapshot,
  onContinue,
  onRestart,
  onClose,
}: SessionRecoveryDialogProps) {
  const { getSession, getConcept, getTopics, getTechnology } = useContent();
  const dialogRef = useRef<HTMLElement>(null);
  const [detailsState, setDetailsState] = useState<RecoveryDetailsState>({ status: 'loading' });

  useDialogFocus(true, dialogRef);

  useEffect(() => {
    let active = true;

    void getSession(snapshot.sessionId)
      .then(async (session) => {
        if (session === null) return null;
        const concept = await getConcept(session.conceptId);
        const topics = await getTopics(session.technologyId);
        const topic = concept === null
          ? null
          : topics.find((candidate) => candidate.id === concept.topicId) ?? null;
        return {
          session,
          concept,
          topic,
          technology: getTechnology(session.technologyId),
        } satisfies RecoveryDetails;
      })
      .then((details) => {
        if (!active) return;
        setDetailsState(details === null ? { status: 'error' } : { status: 'success', details });
      })
      .catch(() => {
        if (active) setDetailsState({ status: 'error' });
      });

    return () => {
      active = false;
    };
  }, [getConcept, getSession, getTechnology, getTopics, snapshot.sessionId]);

  const details = detailsState.status === 'success' ? detailsState.details : null;
  const closeDestination = details?.topic !== null && details?.topic !== undefined
    ? `/tech/${details.session.technologyId}/${details.topic.id}`
    : details !== null
      ? `/tech/${details.session.technologyId}`
      : '/tech';
  const totalSteps = details?.session.steps.length ?? 0;
  const completedSteps = totalSteps === 0 ? 0 : Math.min(snapshot.answers.length, totalSteps);
  const percentage = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/85 p-3 backdrop-blur-sm sm:p-6">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-title"
        aria-describedby="recovery-description"
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          event.stopPropagation();
          onClose(closeDestination);
        }}
        className="relative my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/35"
      >
        <header className="relative p-5 pr-16 sm:p-6 sm:pr-20">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => onClose(closeDestination)}
            className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-4 sm:top-4"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <div className="flex items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary" aria-hidden="true">
              <RotateCcw className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 id="recovery-title" className="break-normal whitespace-normal text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Tienes una sesión incompleta
              </h1>
              <p id="recovery-description" className="mt-1.5 break-normal whitespace-normal text-sm leading-relaxed text-muted-foreground">
                Puedes continuar donde lo dejaste o descartar esta sesión y empezar una nueva.
              </p>
            </div>
          </div>
        </header>

        <div className="border-t border-border px-5 py-5 sm:px-6">
          {detailsState.status === 'loading' ? (
            <p role="status" className="text-sm text-muted-foreground">Cargando detalles de la sesión…</p>
          ) : detailsState.status === 'error' || details === null ? (
            <p role="alert" className="text-sm text-muted-foreground">
              No pudimos cargar el resumen, pero todavía puedes continuar o empezar de nuevo.
            </p>
          ) : (
            <div className="grid min-w-0 gap-5 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center sm:gap-6">
              <div className="flex min-w-0 items-start gap-3">
                <TechnologyIcon
                  technologyId={details.technology?.id ?? details.session.technologyId}
                  technologyName={details.technology?.name ?? details.session.technologyId}
                  fallback={details.technology?.icon ?? details.session.technologyId.slice(0, 2)}
                  className="size-12 rounded-xl border-warning/30 bg-warning/10 text-warning"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {details.technology?.name ?? details.session.technologyId}
                  </p>
                  <p className="mt-0.5 break-normal whitespace-normal text-sm font-medium leading-snug text-foreground">
                    {details.session.title}
                  </p>
                  <p className="mt-1 break-normal whitespace-normal text-xs leading-relaxed text-muted-foreground">
                    {[details.topic?.name, details.concept?.name].filter(Boolean).join(' · ') || details.session.conceptId}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Paso {Math.min(snapshot.currentStep + 1, totalSteps)} de {totalSteps}
                  </p>
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-muted-foreground">Progreso</p>
                  <p className="text-sm font-bold tabular-nums text-primary">{percentage}%</p>
                </div>
                <div
                  role="progressbar"
                  aria-label="Progreso de la sesión recuperable"
                  aria-valuemin={0}
                  aria-valuemax={totalSteps}
                  aria-valuenow={completedSteps}
                  aria-valuetext={`${completedSteps} de ${totalSteps} ejercicios completados`}
                  className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percentage}%` }} />
                </div>
                <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                  {completedSteps} de {totalSteps} ejercicios
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-4 sm:px-6">
          <div className="flex min-h-11 items-center gap-3 text-sm text-muted-foreground">
            <Clock3 className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span>Última actividad: <RelativeActivityTime timestamp={snapshot.lastActivityAt ?? snapshot.startTime} /></span>
          </div>
        </div>

        <footer className="grid gap-3 border-t border-border p-5 sm:grid-cols-2 sm:p-6">
          <button
            type="button"
            data-dialog-autofocus
            onClick={onContinue}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Continuar
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Empezar de nuevo
          </button>
        </footer>
      </section>
    </div>
  );
}

export function RelativeActivityTime({ timestamp }: { timestamp: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timestamp === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [timestamp]);

  return timestamp === null ? <>no disponible</> : <>{formatRelativeActivity(timestamp, now)}</>;
}
