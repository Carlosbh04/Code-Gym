import { Link } from 'react-router-dom';

const PRIMARY_ACTION =
  'inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function NotFoundPage() {
  return (
    <section
      aria-labelledby="not-found-title"
      className="flex min-h-[50vh] max-w-2xl flex-col items-start justify-center py-8 sm:py-12"
    >
      <p className="text-sm font-semibold text-primary">Error 404</p>
      <h1
        id="not-found-title"
        className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
      >
        Página no encontrada
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        No encontramos la página que buscabas. Puede que la dirección sea
        incorrecta o que ya no exista.
      </p>
      <Link to="/" className={`${PRIMARY_ACTION} mt-8`}>
        Volver al inicio
      </Link>
    </section>
  );
}

export default NotFoundPage;
