import type { DashboardOverview } from '../dashboard-view-model';

export interface ProgressOverviewProps {
  overview: DashboardOverview;
}

export function ProgressOverview({ overview }: ProgressOverviewProps) {
  const metrics = [
    ['Respuestas', String(overview.totalAnswers)],
    ['Aciertos', String(overview.totalCorrect)],
    [
      'Precisión',
      overview.globalAccuracy === undefined ? '—' : `${overview.globalAccuracy} %`,
    ],
    ['Conceptos practicados', String(overview.conceptsPracticed)],
  ] as const;

  return (
    <section aria-labelledby="progress-overview-title" className="border-t border-border pt-8">
      <h2 id="progress-overview-title" className="text-xl font-bold text-foreground">
        Resumen de progreso
      </h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={label} className="border-t border-border pt-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-mono text-lg font-semibold text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {overview.lastPracticed ? (
        <p className="mt-5 text-sm text-muted-foreground">
          Última práctica:{' '}
          <time dateTime={overview.lastPracticed} className="text-foreground">
            {new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(
              new Date(overview.lastPracticed),
            )}
          </time>
        </p>
      ) : null}
    </section>
  );
}
