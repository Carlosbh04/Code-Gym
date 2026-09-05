import type { DashboardActivity } from './dashboard-types';

export function DashboardHeader({ latestActivity }: { latestActivity?: DashboardActivity }) {
  return (
    <header className="rounded-2xl border border-border bg-card px-5 py-6 shadow-sm sm:px-7 sm:py-8">
      <p className="text-sm font-semibold text-primary">Progreso</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 id="dashboard-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Tu progreso de aprendizaje, basado en la práctica que has guardado.
          </p>
        </div>
        {latestActivity ? (
          <p className="shrink-0 text-sm text-muted-foreground">
            Última actividad: <span className="font-medium text-foreground">{latestActivity.sessionTitle}</span>
          </p>
        ) : null}
      </div>
    </header>
  );
}
