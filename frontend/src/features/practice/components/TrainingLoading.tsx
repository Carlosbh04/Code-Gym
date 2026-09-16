import { Skeleton } from '@/components/codegym/Skeleton';

const SECTION_COUNT = 3;
const CARDS_PER_SECTION = 3;

export function TrainingLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-4"
    >
      <p className="sr-only">
        Cargando catálogo de tecnologías…
      </p>

      {Array.from(
        { length: SECTION_COUNT },
        (_, sectionIndex) => (
          <section
            key={sectionIndex}
            aria-hidden="true"
            className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-start gap-3 border-b border-border pb-4">
              <Skeleton className="size-10 shrink-0 rounded-xl" />

              <div className="min-w-0 flex-1">
                <Skeleton className="h-6 w-56 max-w-full sm:h-7" />
                <Skeleton className="mt-2 h-4 w-80 max-w-full" />
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from(
                { length: CARDS_PER_SECTION },
                (_, cardIndex) => (
                  <article
                    key={cardIndex}
                    className="flex min-h-64 min-w-0 flex-col rounded-xl border border-border bg-background/45 p-4 shadow-sm sm:p-5"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <Skeleton className="size-12 shrink-0 rounded-xl" />

                      <div className="min-w-0 flex-1">
                        <Skeleton className="h-5 w-28 max-w-full" />

                        <div className="mt-2 space-y-2">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-5/6" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto pt-5">
                      <div className="flex items-center justify-between gap-3">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-24" />
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-8" />
                      </div>

                      <Skeleton className="mt-2 h-1.5 w-full rounded-full" />

                      <Skeleton className="mt-4 h-11 w-full rounded-lg" />
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>
        ),
      )}
    </div>
  );
}
