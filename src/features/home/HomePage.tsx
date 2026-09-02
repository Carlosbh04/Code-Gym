import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/codegym/EmptyState';
import { useContent } from '@/hooks/useContent';

const INTERACTIVE =
  'inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function HomePage() {
  const { technologies, isLoading } = useContent();

  return (
    <div className="flex flex-col gap-14 sm:gap-16 lg:gap-20">
      <section
        aria-labelledby="home-title"
        className="flex max-w-3xl flex-col items-start py-8 sm:py-12 lg:py-16"
      >
        <h1
          id="home-title"
          className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
        >
          CodeGym
        </h1>
        <p className="mt-5 max-w-2xl text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
          Practica JavaScript entendiendo el código, no memorizándolo.
        </p>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Sesiones cortas y enfocadas para entrenar conceptos, detectar errores
          y mejorar tu razonamiento.
        </p>
        <a
          href="#technologies"
          className={`${INTERACTIVE} mt-8 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto`}
        >
          Empezar a practicar
        </a>
      </section>

      <section
        id="technologies"
        aria-labelledby="technologies-title"
        className="scroll-mt-6 border-t border-border pt-10 sm:scroll-mt-20 sm:pt-12"
      >
        <div className="max-w-2xl">
          <h2
            id="technologies-title"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Tecnologías disponibles
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Elige una tecnología para comenzar una sesión de práctica enfocada.
          </p>
        </div>

        <div className="mt-7 sm:mt-8">
          {isLoading ? (
            <TechnologyLoading />
          ) : technologies.length === 0 ? (
            <EmptyState
              title="No hay tecnologías disponibles"
              description="Todavía no hay tecnologías preparadas para practicar."
              className="rounded-lg border border-border bg-card"
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {technologies.map((technology) => (
                <li key={technology.id} className="min-w-0">
                  <Link
                    to={`/tech/${technology.id}`}
                    className="flex h-full min-h-44 flex-col justify-between rounded-lg border border-border bg-card p-5 ring-offset-background transition-colors hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-6"
                  >
                    <span className="min-w-0">
                      <span className="block break-words text-lg font-semibold text-foreground">
                        {technology.name}
                      </span>
                      <span className="mt-2 block break-words text-sm leading-relaxed text-muted-foreground">
                        {technology.description}
                      </span>
                    </span>
                    <span className="mt-6 block text-sm font-semibold text-primary">
                      Practicar
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function TechnologyLoading() {
  return (
    <div role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground">Cargando tecnologías…</p>
      <div
        aria-hidden="true"
        className="mt-4 grid gap-4 sm:grid-cols-2"
      >
        {[0, 1].map((placeholder) => (
          <div
            key={placeholder}
            className="min-h-44 rounded-lg border border-border bg-card p-5 sm:p-6"
          >
            <div className="h-5 w-1/3 rounded-sm bg-muted" />
            <div className="mt-4 h-3 w-full rounded-sm bg-muted" />
            <div className="mt-2 h-3 w-4/5 rounded-sm bg-muted" />
            <div className="mt-8 h-4 w-20 rounded-sm bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default HomePage;
