import { Check, CircleArrowUp, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  DashboardStatus,
  DashboardVerdict,
} from '../dashboard-view-model';

const STATUS_PRESENTATION: Record<
  DashboardStatus,
  { label: string; icon: typeof Check; classes: string }
> = {
  ok: {
    label: 'OK',
    icon: Check,
    classes: 'border-l-2 border-success text-success',
  },
  attention: {
    label: 'ATENCIÓN',
    icon: TriangleAlert,
    classes: 'border-l-4 border-warning text-warning',
  },
  improvement: {
    label: 'MEJORA',
    icon: CircleArrowUp,
    classes: 'border-l-[6px] border-destructive text-destructive',
  },
};

export interface DiagnosisVerdictProps {
  verdict: DashboardVerdict;
  accuracy?: number;
  totalAnswers: number;
}

export function DiagnosisVerdict({
  verdict,
  accuracy,
  totalAnswers,
}: DiagnosisVerdictProps) {
  const presentation = verdict.status
    ? STATUS_PRESENTATION[verdict.status]
    : null;
  const Icon = presentation?.icon;

  return (
    <section
      aria-labelledby="dashboard-verdict-title"
      className={cn(
        'border-l-2 border-border py-2 pl-5 sm:pl-7',
        presentation?.classes,
      )}
    >
      <div className="flex items-center gap-2 font-mono text-xs font-semibold tracking-[0.18em]">
        {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
        <span>{presentation?.label ?? 'EVIDENCIA INICIAL'}</span>
      </div>
      <h1
        id="dashboard-verdict-title"
        className="mt-4 max-w-[24ch] text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
      >
        {verdict.headline}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
        {verdict.explanation}
      </p>
      <dl className="mt-6 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
        <div className="flex items-baseline justify-between gap-4 sm:block">
          <dt className="text-muted-foreground">Respuestas analizadas</dt>
          <dd className="font-mono font-semibold text-foreground">{totalAnswers}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 sm:block">
          <dt className="text-muted-foreground">Precisión actual</dt>
          <dd className="font-mono font-semibold text-foreground">
            {accuracy === undefined ? '—' : `${accuracy} %`}
          </dd>
        </div>
      </dl>
    </section>
  );
}
