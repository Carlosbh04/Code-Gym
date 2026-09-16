import { ArrowRight, Compass, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Skeleton } from '@/components/codegym/Skeleton';
import type { DashboardRecommendation } from './dashboard-types';

export function NextPracticeCard({
  recommendation,
  isLoading,
}: {
  recommendation: DashboardRecommendation | null;
  isLoading: boolean;
}) {
  return (
    <section aria-labelledby="next-practice-title" className="relative min-h-full overflow-hidden rounded-2xl border border-primary/20 bg-card p-5 shadow-sm sm:p-6">
      <Flag className="absolute -right-3 top-5 size-24 rotate-6 text-primary opacity-[0.06]" aria-hidden="true" />
      <div className="relative flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true"><Compass className="size-5" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Práctica recomendada</p><h2 id="next-practice-title" className="mt-0.5 text-xl font-bold text-foreground">Siguiente paso</h2></div></div>
      {isLoading ? (
        <div
          aria-hidden="true"
          className="mt-5"
        >
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-52 max-w-full" />
          <Skeleton className="mt-5 h-11 w-full rounded-xl" />
        </div>
      )
        : recommendation ? <><p className="mt-5 text-lg font-semibold text-foreground">{recommendation.conceptName}</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{recommendation.technologyName} · {recommendation.session.title}</p><Link to={`/practice/${recommendation.session.id}`} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><span>Continuar práctica</span><ArrowRight className="size-4" aria-hidden="true" /></Link></> : <><p className="mt-5 text-sm leading-relaxed text-muted-foreground">Explora una tecnología para elegir tu siguiente sesión.</p><Link to="/#technologies" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Explorar tecnologías</Link></>}
    </section>
  );
}
