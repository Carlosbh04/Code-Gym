import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TechnologyIcon } from '@/components/codegym/TechnologyIcon';
import type { HomeTechnologyProgress } from '../home-types';

const accentStyles: Record<string, string> = {
  javascript: 'border-yellow-500/45 bg-yellow-500/[0.035] hover:border-yellow-400/80',
  html: 'border-orange-500/45 bg-orange-500/[0.035] hover:border-orange-400/80',
  css: 'border-sky-500/45 bg-sky-500/[0.035] hover:border-sky-400/80',
  react: 'border-cyan-400/45 bg-cyan-400/[0.035] hover:border-cyan-300/80',
  node: 'border-emerald-500/45 bg-emerald-500/[0.035] hover:border-emerald-400/80',
  'node.js': 'border-emerald-500/45 bg-emerald-500/[0.035] hover:border-emerald-400/80',
  nodejs: 'border-emerald-500/45 bg-emerald-500/[0.035] hover:border-emerald-400/80',
  sql: 'border-violet-500/45 bg-violet-500/[0.035] hover:border-violet-400/80',
};

const onboardingActionStyles: Record<string, string> = {
  javascript:
    'border-yellow-500/45 bg-yellow-500/[0.07] text-yellow-400 group-hover:border-yellow-400/75',
  html:
    'border-orange-500/45 bg-orange-500/[0.07] text-orange-400 group-hover:border-orange-400/75',
  css:
    'border-sky-500/45 bg-sky-500/[0.07] text-sky-400 group-hover:border-sky-400/75',
  react:
    'border-cyan-400/45 bg-cyan-400/[0.07] text-cyan-300 group-hover:border-cyan-300/75',
  node:
    'border-emerald-500/45 bg-emerald-500/[0.07] text-emerald-400 group-hover:border-emerald-400/75',
  'node.js':
    'border-emerald-500/45 bg-emerald-500/[0.07] text-emerald-400 group-hover:border-emerald-400/75',
  nodejs:
    'border-emerald-500/45 bg-emerald-500/[0.07] text-emerald-400 group-hover:border-emerald-400/75',
  sql:
    'border-violet-500/45 bg-violet-500/[0.07] text-violet-400 group-hover:border-violet-400/75',
};



type TechnologyCardVariant =
  | 'default'
  | 'quick-start'
  | 'onboarding';

export function TechnologyCard({
  item,
  variant = 'default',
}: {
  item: HomeTechnologyProgress;
  variant?: TechnologyCardVariant;
}) {
  const {
    technology,
    practicedConcepts,
    totalConcepts,
  } = item;

  const percentage =
    totalConcepts === 0
      ? 0
      : Math.round(
          (practicedConcepts / totalConcepts) * 100,
        );

  const technologyKey = technology.id.toLowerCase();

  const accent =
    accentStyles[technologyKey]
    ?? 'border-primary/25 bg-primary/5 hover:border-primary/60';

  const onboardingAction =
    onboardingActionStyles[technologyKey]
    ?? 'border-primary/40 bg-primary/[0.07] text-primary';


  if (variant === 'onboarding') {
    return (
      <Link
        to={`/tech/${technology.id}`}
        aria-label={`Comenzar ${technology.name}`}
        className={`group relative flex min-h-[10.25rem] min-w-0 overflow-hidden rounded-2xl border px-5 py-4 shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition-all duration-fast ease-standard hover:-translate-y-1 hover:bg-white/[0.025] hover:shadow-[0_18px_40px_rgba(0,0,0,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${accent}`}
      >
        <div className="relative z-10 grid w-full min-w-0 grid-cols-[3.6rem_minmax(0,1fr)] gap-4">
          <TechnologyIcon
            technologyId={technology.id}
            technologyName={technology.name}
            fallback={technology.icon}
            className="size-14 shrink-0 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
          />

          <div className="flex min-w-0 flex-col">
            <h3 className="truncate text-lg font-extrabold tracking-tight text-foreground">
              {technology.name}
            </h3>

            {technology.description.trim() !== '' ? (
              <p className="mt-1.5 line-clamp-2 max-w-[30ch] text-[0.82rem] leading-[1.25rem] text-muted-foreground">
                {technology.description}
              </p>
            ) : null}

            <div className="mt-auto pt-3">
              <span
                className={`inline-flex min-h-9 items-center gap-2 rounded-xl border px-4 py-1.5 text-sm font-bold transition-all ${onboardingAction}`}
              >
                Comenzar
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute -bottom-5 right-3 opacity-[0.15]"
          aria-hidden="true"
        >
          <TechnologyIcon
            technologyId={technology.id}
            technologyName={technology.name}
            fallback={technology.icon}
            className="size-24 rounded-2xl"
          />
        </div>
      </Link>
    );
  }

  if (variant === 'quick-start') {
    return (
      <Link
        to={`/tech/${technology.id}`}
        aria-label={`Practicar ${technology.name}`}
        className={`group flex min-h-[72px] min-w-0 items-center gap-3 rounded-xl border px-3 py-3 shadow-sm transition-all duration-fast ease-standard hover:-translate-y-0.5 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-[78px] sm:px-4 ${accent}`}
      >
        <TechnologyIcon
          technologyId={technology.id}
          technologyName={technology.name}
          fallback={technology.icon}
          className="size-10 shrink-0 rounded-lg sm:size-11"
        />

        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground sm:text-base">
          {technology.name}
        </h3>

        <ArrowRight
          className="size-4 shrink-0 text-muted-foreground transition-all duration-fast group-hover:translate-x-1 group-hover:text-primary"
          aria-hidden="true"
        />
      </Link>
    );
  }

  return (
    <Link
      to={`/tech/${technology.id}`}
      aria-label={`${technology.name} — ${practicedConcepts} de ${totalConcepts} conceptos practicados`}
      className="group flex h-full min-h-32 min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-fast ease-standard hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex min-w-0 items-center gap-3">
        <TechnologyIcon
          technologyId={technology.id}
          technologyName={technology.name}
          fallback={technology.icon}
        />

        <h3 className="min-w-0 break-words text-sm font-semibold text-foreground sm:text-base">
          {technology.name}
        </h3>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {practicedConcepts} de {totalConcepts} conceptos
          </span>

          <span className="shrink-0 font-semibold text-foreground">
            {percentage}%
          </span>
        </div>

        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`Progreso en ${technology.name}`}
          aria-valuemin={0}
          aria-valuemax={totalConcepts}
          aria-valuenow={practicedConcepts}
          aria-valuetext={`${practicedConcepts} de ${totalConcepts} conceptos practicados`}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="mt-3 flex justify-end">
          <ArrowRight
            className="size-4 text-muted-foreground transition-transform duration-fast group-hover:translate-x-1 group-hover:text-primary"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}
