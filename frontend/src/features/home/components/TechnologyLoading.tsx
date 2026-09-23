import { Skeleton } from '@/components/codegym/Skeleton';

export function TechnologyLoading() {
  return (
    <div
      role="status"
      aria-label="Cargando tecnologías"
      className="
        w-full
        rounded-2xl
        border
        border-border
        bg-card
        p-5
        sm:p-6
      "
    >
      <span className="sr-only">
        Cargando tecnologías
      </span>

      <div className="flex items-center gap-4">
        <Skeleton
          aria-hidden="true"
          className="size-11 shrink-0 rounded-xl"
        />

        <div className="min-w-0 flex-1">
          <Skeleton
            aria-hidden="true"
            className="h-4 w-40 max-w-full rounded-md"
          />

          <Skeleton
            aria-hidden="true"
            className="mt-3 h-2 w-full rounded-full"
          />

          <Skeleton
            aria-hidden="true"
            className="mt-3 h-3 w-24 rounded-md"
          />
        </div>
      </div>
    </div>
  );
}
