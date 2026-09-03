import type { DashboardConcept } from '../dashboard-view-model';

export interface NamedDashboardConcept extends DashboardConcept {
  name: string;
}

const STATUS_LABEL = {
  improvement: 'MEJORA',
  attention: 'ATENCIÓN',
  ok: 'OK',
} as const;

const STATUS_CLASS = {
  improvement: 'text-destructive',
  attention: 'text-warning',
  ok: 'text-success',
} as const;

export interface WeakConceptsProps {
  concepts: NamedDashboardConcept[];
  observedConcepts?: NamedDashboardConcept[];
}

export function WeakConcepts({
  concepts,
  observedConcepts = [],
}: WeakConceptsProps) {
  if (concepts.length === 0 && observedConcepts.length === 0) return null;

  return (
    <section aria-labelledby="other-concepts-title" className="border-t border-border pt-8">
      <h2 id="other-concepts-title" className="text-xl font-bold text-foreground">
        {concepts.length === 0 && observedConcepts.length > 0
          ? 'Conceptos en observación'
          : 'Otros conceptos'}
      </h2>

      {concepts.length > 0 ? (
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {concepts.map((concept) => (
            <li
              key={concept.conceptId}
              className="grid gap-1 py-4 sm:grid-cols-[7rem_1fr_auto] sm:items-baseline sm:gap-4"
            >
              {concept.status ? (
                <span
                  className={`font-mono text-xs font-semibold tracking-[0.12em] ${STATUS_CLASS[concept.status]}`}
                >
                  {STATUS_LABEL[concept.status]}
                </span>
              ) : null}
              <span className="font-semibold text-foreground">{concept.name}</span>
              <span className="font-mono text-sm text-muted-foreground">
                {concept.accuracy === undefined ? '—' : `${concept.accuracy} %`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No hay otros conceptos con evidencia suficiente.
        </p>
      )}

      {observedConcepts.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-foreground">En observación</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {observedConcepts.map((concept) => (
              <li key={concept.conceptId} className="flex justify-between gap-4">
                <span>{concept.name}</span>
                <span className="font-mono">{concept.totalAttempts} respuestas</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
