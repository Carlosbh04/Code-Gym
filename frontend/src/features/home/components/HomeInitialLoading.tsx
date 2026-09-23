import { Skeleton } from '@/components/codegym/Skeleton';

export function HomeInitialLoading() {
  return (
    <div
      role="region"
      aria-labelledby="home-loading-title"
      aria-busy="true"
      data-testid="home-initial-loading"
      className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8"
    >
      <h1
        id="home-loading-title"
        className="sr-only"
      >
        Cargando tu inicio…
      </h1>
      <section className="space-y-4">
        <Skeleton className="h-9 w-72 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="size-12 shrink-0 rounded-xl" />

            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-48 max-w-full rounded-md" />
              <Skeleton className="mt-3 h-4 w-64 max-w-full rounded-md" />
              <Skeleton className="mt-6 h-2 w-full rounded-full" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="mt-5 h-10 w-24 rounded-lg" />
          <Skeleton className="mt-4 h-3 w-40 max-w-full rounded-md" />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-3 w-64 max-w-full rounded-md" />
          </div>

          <Skeleton className="hidden h-9 w-24 rounded-lg sm:block" />
        </div>

        <div className="mt-6 space-y-3">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </section>
    </div>
  );
}
