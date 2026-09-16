import { HomeProgressSummary } from './HomeProgressSummary';
import { HomeRecentActivity } from './HomeRecentActivity';
import { ContinueCard } from './ContinueCard';
import { TechnologyLoading } from './TechnologyLoading';

export function HomeInitialLoading() {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      aria-labelledby="home-loading-title"
      className="mx-auto w-full max-w-[1450px] pb-4 pt-0 sm:pb-6"
    >
      <h1
        id="home-loading-title"
        className="sr-only"
      >
        Cargando tu inicio…
      </h1>

      <section
        aria-label="Tecnologías"
        className="min-w-0"
      >
        <div className="mb-3">
          <div className="min-w-0 py-2">
            <div className="h-8 w-72 max-w-full animate-pulse rounded-md bg-muted/70 motion-reduce:animate-none sm:h-10" />
            <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded-md bg-muted/70 motion-reduce:animate-none" />
          </div>

          <div className="mt-2">
            <div className="h-4 w-24 animate-pulse rounded-md bg-muted/70 motion-reduce:animate-none" />
          </div>
        </div>

        <TechnologyLoading />
      </section>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.34fr)_minmax(390px,0.92fr)]">
        <div className="min-w-0">
          <ContinueCard
            item={null}
            fallbackTechnology={null}
            isLoading
            error={null}
            state="returning"
            variant="advanced"
          />
        </div>

        <div className="min-w-0">
          <HomeProgressSummary
            practicedConcepts={0}
            totalConcepts={0}
            hasActivity={false}
            isLoading
            variant="advanced"
          />
        </div>

        <div className="min-w-0">
          <HomeRecentActivity
            activities={[]}
            isLoading
            error={null}
            variant="advanced"
          />
        </div>
      </div>
    </section>
  );
}
