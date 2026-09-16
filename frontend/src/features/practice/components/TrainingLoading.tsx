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
            className="
              rounded-2xl
              border
              border-border
              bg-card
              p-4
              shadow-sm
              sm:p-5
            "
          >
            <div
              className="
                flex
                items-start
                gap-3
                border-b
                border-border
                pb-4
              "
            >
              <Skeleton
                className="
                  size-10
                  shrink-0
                  rounded-xl
                "
              />

              <div>
                <Skeleton
                  className="
                    h-7
                    w-56
                    max-w-full
                  "
                />

                <Skeleton
                  className="
                    mt-1
                    h-4
                    w-80
                    max-w-full
                  "
                />
              </div>
            </div>

            <ul
              className="
                mt-4
                grid
                gap-3
                md:grid-cols-2
                xl:grid-cols-3
              "
            >
              {Array.from(
                { length: CARDS_PER_SECTION },
                (_, cardIndex) => (
                  <li
                    key={cardIndex}
                    className="min-w-0"
                  >
                    <article
                      className="
                        flex
                        h-full
                        min-h-64
                        min-w-0
                        flex-col
                        rounded-xl
                        border
                        border-border
                        bg-background/45
                        p-4
                        shadow-sm
                        sm:p-5
                      "
                    >
                      <div
                        className="
                          flex
                          min-w-0
                          items-start
                          gap-3
                        "
                      >
                        <Skeleton
                          className="
                            size-12
                            shrink-0
                            rounded-xl
                          "
                        />

                        <div className="min-w-0 flex-1">
                          <Skeleton
                            className="
                              h-6
                              w-28
                              max-w-full
                            "
                          />

                          <div className="mt-1 space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-11/12" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-5">
                        <div
                          className="
                            flex
                            flex-wrap
                            items-center
                            justify-between
                            gap-2
                          "
                        >
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-32" />
                        </div>

                        <div
                          className="
                            mt-3
                            flex
                            items-center
                            justify-between
                            gap-3
                          "
                        >
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-10" />
                        </div>

                        <Skeleton
                          className="
                            mt-2
                            h-1.5
                            w-full
                            rounded-full
                          "
                        />

                        <Skeleton
                          className="
                            mt-4
                            min-h-11
                            w-full
                            rounded-lg
                          "
                        />
                      </div>
                    </article>
                  </li>
                ),
              )}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
